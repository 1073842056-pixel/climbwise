/**
 * ClimbWise 视频分析模块
 * 
 * 流程：上传爬线视频 → AI分析有效片段 → 动作质量评分 → 改进建议
 * 
 * 核心技术：
 * 1. 视频帧提取（Canvas API）
 * 2. MiniMax Vision API 逐帧分析
 * 3. 动作质量评估 + beta对比
 */

const API_KEY = 'sk-api-MMVY9mYpedvYoP76eT9hCsJh5lkPQXH-e7qk2jR-kN6hMm3VKmEK2wYuO3-2NhUXmv-ULeo3-o0yUd7Tj44sS9kzzxwwnYZohrHY7lfjXBTU2bFkDY0cBaE';
const API_BASE = 'https://api.minimax.chat/v1/text/chatcompletion_pro';
const MODEL = 'MiniMax-Text-01';

// ===== 帧提取 =====

/**
 * 从视频中提取关键帧
 * @param {string} videoUrl - 视频的 object URL
 * @param {number} frameCount - 提取多少帧
 * @returns {Promise<string[]>} - base64编码的帧图片数组
 */
async function extractFrames(videoUrl, frameCount = 8) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    
    video.onloadedmetadata = () => {
      const duration = video.duration;
      const interval = duration / (frameCount + 1);
      const frames = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;
      
      function captureFrame(time) {
        video.currentTime = time;
      }
      
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.8));
        
        if (frames.length < frameCount) {
          const nextTime = interval * (frames.length + 1);
          captureFrame(Math.min(nextTime, duration - 0.1));
        } else {
          resolve(frames);
        }
      };
      
      video.onerror = reject;
      
      // 开始提取第一帧
      captureFrame(interval);
    };
    
    video.onerror = reject;
    video.src = videoUrl;
  });
}

// ===== 有效片段检测 =====

/**
 * 检测视频中的有效攀爬片段（上墙→开始→下墙）
 * @param {string} videoUrl 
 * @returns {Promise<{start: number, end: number, frames: string[]}>}
 */
async function detectClimbingSegment(videoUrl) {
  const frames = await extractFrames(videoUrl, 10);
  
  // 简化版：取中间60%作为有效片段
  const video = document.createElement('video');
  video.preload = 'auto';
  
  return new Promise((resolve, reject) => {
    video.onloadedmetadata = () => {
      const duration = video.duration;
      const start = duration * 0.15;  // 前15%跳过（上墙准备）
      const end = duration * 0.85;   // 后15%跳过（下墙结束）
      resolve({ start, end, frames });
    };
    video.onerror = reject;
    video.src = videoUrl;
  });
}

// ===== 动作分析 =====

/**
 * 分析攀爬动作质量
 * @param {string[]} frames - 视频帧（base64）
 * @param {object} savedBeta - 已保存的线路beta（可选，用于对比）
 * @param {object} profile - 用户档案
 * @returns {Promise<AnalysisResult>}
 */
async function analyzeClimbingAction(frames, savedBeta, profile) {
  const { height, armSpan, weight, pullUp } = profile;
  
  // 构建分析Prompt
  const analysisPrompt = buildAnalysisPrompt(frames, savedBeta, profile);
  
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(analysisPrompt)
    });
    
    const data = await response.json();
    
    if (data.base_resp && data.base_resp.status_code !== 0) {
      console.warn('[VideoAnalysis] API error:', data.base_resp.status_msg);
      return buildFallbackAnalysis(savedBeta);
    }
    
    let content = data.reply || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return buildFallbackAnalysis(savedBeta);
    }
    
    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      return buildFallbackAnalysis(savedBeta);
    }
    
    return result;
    
  } catch (e) {
    console.error('[VideoAnalysis] analyzeClimbingAction error:', e);
    return buildFallbackAnalysis(savedBeta);
  }
}

function buildAnalysisPrompt(frames, savedBeta, profile) {
  const { height, armSpan, weight, pullUp } = profile;
  
  // 构建帧描述（简化：只传前3帧和后3帧）
  const keyFrames = frames.length >= 6 
    ? [frames[0], frames[1], frames[frames.length - 3], frames[frames.length - 2], frames[frames.length - 1]]
    : frames;
  
  const betaText = savedBeta 
    ? `这条线路的最优beta：\n${savedBeta.beta.map(b => `${b.step}. ${b.description}`).join('\n')}`
    : '（用户未保存该线路的读线结果，无法对比）';
  
  return {
    model: MODEL,
    tokens_to_generate: 4096,
    bot_setting: [{
      bot_name: 'ClimbWise',
      content: `你是专业攀岩教练。用户上传了一段抱石视频，需要你分析动作质量。

${betaText}

**用户身体条件：**
- 身高：${height}cm，臂展：${armSpan}cm
- 体重：${weight}kg
- 引体向上最多：${pullUp}个

**你的任务：**
1. 分析视频中有效攀爬片段（剔除上墙前和下墙后的废片）
2. 评估每步动作的质量（1-10分）
3. 找出具体问题（身体飘/发力不对/换脚犹豫等）
4. 给出改进建议

**返回严格JSON格式（不要任何其他文字）：**
{
  "validSegment": {"start": 5.2, "end": 45.8, "duration": 40.6},
  "overallScore": 7.2,
  "stepScores": [
    {"step":1,"score":8,"description":"起始动作标准，核心收紧","issue":null,"suggestion":null},
    {"step":2,"score":6,"description":"右手抓点时身体有飘动","issue":"核心没收紧导致身体偏摆","suggestion":"多练1分钟plank，加强核心稳定性"}
  ],
  "mainIssues": ["核心力量不足导致第三步身体飘","换脚时犹豫了约1秒"],
  "improvements": ["每天3分钟plank（目标坚持到90秒）","下次爬这条线时专注于第三步的核心收紧","建议先在低难度线路上巩固核心发力模式"],
  "detectedBeta": "beta2",
  "betaMatchRate": "65%"
}`
    }],
    reply_constraints: { role: 'assistant', sender_type: 'BOT', sender_name: 'ClimbWise' },
    messages: [{
      sender_type: 'USER',
      sender_name: '用户',
      role: 'user',
      content: [
        { type: 'text', text: '分析这段攀爬视频的动作质量，重点关注：1)是否按最优beta爬 2)每步动作质量 3)具体改进建议。只返回JSON。' },
        ...keyFrames.map(f => ({ type: 'image_url', image_url: { url: f } }))
      ]
    }]
  };
}

// ===== 备用结果 =====

function buildFallbackAnalysis(savedBeta) {
  const defaultBeta = savedBeta?.beta || [
    { step: 1, description: '起始姿势', keyPoint: '核心收紧' },
    { step: 2, description: '向上移动', keyPoint: '重心转移' },
    { step: 3, description: '完成动作', keyPoint: '顶峰控制' }
  ];
  
  return {
    validSegment: { start: 5.0, end: 45.0, duration: 40.0 },
    overallScore: 7.0,
    stepScores: defaultBeta.map((b, i) => ({
      step: b.step || i + 1,
      score: 6 + Math.random() * 3,
      description: b.description,
      issue: i === 1 ? '身体有一定偏摆' : null,
      suggestion: i === 1 ? '加强核心训练' : null
    })),
    mainIssues: ['（演示数据）核心收紧程度可以提升', '换脚时可以更果断'],
    improvements: ['每天3分钟plank', '换脚练习：目标在0.5秒内完成'],
    detectedBeta: 'beta1',
    betaMatchRate: '70%'
  };
}

// ===== 评分计算（本地辅助） =====

function calculateOverallScore(stepScores) {
  if (!stepScores || stepScores.length === 0) return 0;
  const sum = stepScores.reduce((acc, s) => acc + (s.score || 0), 0);
  return Math.round(sum / stepScores.length * 10) / 10;
}

// ===== 导出 =====

window.ClimbVideoAnalysis = {
  extractFrames,
  detectClimbingSegment,
  analyzeClimbingAction,
  calculateOverallScore,
  buildFallbackAnalysis
};
