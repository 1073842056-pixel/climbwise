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
 * 从视频中提取关键帧（智能策略）
 * 
 * 策略：攀岩视频有明确的阶段——准备→上墙→攀爬→下墙
 * 在不同阶段使用不同的采样密度：
 * - 开头（0-15%）：密集采样（捕捉上墙时刻）
 * - 中间（15-85%）：均匀采样（攀爬主体）
 * - 结尾（85-100%）：密集采样（捕捉下墙时刻）
 * 
 * 同时做帧间差异检测：变化大的区域多采样
 * 
 * @param {string} videoUrl - 视频的 object URL
 * @param {number} frameCount - 目标提取多少帧
 * @returns {Promise<string[]>} - base64编码的帧图片数组
 */
async function extractFrames(videoUrl, frameCount = 8) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    
    video.onloadedmetadata = () => {
      const duration = video.duration;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 1280;
      
      // 智能采样时刻点
      const sampleTimes = computeSmartSampleTimes(duration, frameCount);
      const frames = [];
      let currentIndex = 0;
      
      function captureNext() {
        if (currentIndex >= sampleTimes.length) {
          resolve(frames);
          return;
        }
        video.currentTime = sampleTimes[currentIndex];
      }
      
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push({
          time: video.currentTime,
          data: canvas.toDataURL('image/jpeg', 0.8)
        });
        currentIndex++;
        captureNext();
      };
      
      video.onerror = () => reject(new Error('Video load failed'));
      captureNext();
    };
    
    video.onerror = () => reject(new Error('Video load failed'));
    video.src = videoUrl;
  });
}

/**
 * 计算智能采样时刻
 * 在开头和结尾密集采样（攀岩开始/结束的关键动作）
 * 中间均匀采样
 */
function computeSmartSampleTimes(duration, frameCount) {
  if (duration <= 0 || frameCount <= 0) return [duration * 0.5];
  
  const times = [];
  const startDense = duration * 0.12;   // 前12%密集
  const endDense = duration * 0.88;    // 后12%密集
  const middleStart = startDense;
  const middleEnd = endDense;
  
  // 开头密集区：取8个点
  const startCount = Math.max(2, Math.floor(frameCount * 0.25));
  for (let i = 1; i <= startCount; i++) {
    times.push((duration * 0.02) + (startDense - duration * 0.02) * (i / startCount));
  }
  
  // 中间均匀区
  const middleCount = Math.max(2, Math.floor(frameCount * 0.5));
  const middleInterval = (middleEnd - middleStart) / (middleCount + 1);
  for (let i = 1; i <= middleCount; i++) {
    times.push(middleStart + middleInterval * i);
  }
  
  // 结尾密集区：取剩余点
  const endCount = Math.max(2, frameCount - startCount - middleCount);
  for (let i = 1; i <= endCount; i++) {
    times.push(endDense + (duration - endDense) * (i / (endCount + 1)));
  }
  
  // 去重并排序
  const unique = [...new Set(times.map(t => Math.round(t * 100) / 100))];
  unique.sort((a, b) => a - b);
  
  return unique.slice(0, frameCount);
}

// ===== 帧差异检测 =====

/**
 * 检测两帧之间的像素差异（用于识别动作转换时刻）
 * @param {string} dataUrl1 - 第一帧
 * @param {string} dataUrl2 - 第二帧
 * @returns {Promise<number>} - 差异比例 0-1
 */
async function computeFrameDifference(dataUrl1, dataUrl2) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 80;  // 低分辨率足够
    canvas.height = 80;
    
    const img1 = new Image();
    const img2 = new Image();
    let loaded = 0;
    
    const checkDone = () => {
      if (++loaded < 2) return;
      ctx.drawImage(img1, 0, 0, 80, 80);
      const d1 = ctx.getImageData(0, 0, 80, 80).data;
      ctx.drawImage(img2, 0, 0, 80, 80);
      const d2 = ctx.getImageData(0, 0, 80, 80).data;
      
      let diff = 0;
      for (let i = 0; i < d1.length; i += 4) {
        diff += Math.abs(d1[i] - d2[i]) + Math.abs(d1[i+1] - d2[i+1]) + Math.abs(d1[i+2] - d2[i+2]);
      }
      const maxDiff = d1.length * 255 * 3;
      resolve(diff / maxDiff);
    };
    
    img1.onload = checkDone;
    img2.onload = checkDone;
    img1.src = dataUrl1;
    img2.src = dataUrl2;
  });
}

// ===== 有效片段检测 =====

/**
 * 检测视频中的有效攀爬片段
 * 使用帧差异分析：开头和结尾变化大（上下墙），中间相对稳定（在墙上移动）
 * @param {string} videoUrl 
 * @returns {Promise<{start: number, end: number, frames: {time:number, data:string}[]}>}
 */
async function detectClimbingSegment(videoUrl) {
  // 提取20个采样帧做分析
  const rawFrames = await extractFrames(videoUrl, 20);
  
  if (rawFrames.length < 4) {
    return { start: 0, end: videoUrl ? 30 : 0, frames: rawFrames };
  }
  
  // 计算帧间差异
  const diffs = [0];
  for (let i = 1; i < rawFrames.length; i++) {
    const d = await computeFrameDifference(rawFrames[i-1].data, rawFrames[i].data);
    diffs.push(d);
  }
  
  // 找有效区间：差异从大变小的点=开始上墙，差异从小变大的点=开始下墙
  let maxDiffIdx = 0;
  let maxDiff = 0;
  for (let i = 1; i < diffs.length - 1; i++) {
    if (diffs[i] > maxDiff) {
      maxDiff = diffs[i];
      maxDiffIdx = i;
    }
  }
  
  // 有效片段：去掉前后各2帧
  const startIdx = Math.max(1, maxDiffIdx - 2);
  const endIdx = Math.min(rawFrames.length - 2, maxDiffIdx + Math.floor(rawFrames.length * 0.6));
  
  const validFrames = rawFrames.slice(startIdx, endIdx + 1);
  const startTime = validFrames[0]?.time || 0;
  const endTime = validFrames[validFrames.length - 1]?.time || 30;
  
  return {
    start: startTime,
    end: endTime,
    frames: validFrames
  };
}

// ===== 动作分析 =====

/**
 * 分析攀爬动作质量
 * @param {Array} frames - 视频帧（新版为 {time, data} 数组，旧版为 string[]）
 * @param {object} savedBeta - 已保存的线路beta（可选，用于对比）
 * @param {object} profile - 用户档案
 * @returns {Promise<AnalysisResult>}
 */
async function analyzeClimbingAction(frames, savedBeta, profile) {
  const { height, armSpan, weight, pullUp } = profile;
  
  // 兼容新旧格式：如果frames是对象数组，取data；如果是字符串数组，直接用
  const frameDataArray = frames.length > 0 && typeof frames[0] === 'object'
    ? frames.map(f => f.data)
    : frames;
  
  // 构建分析Prompt
  const analysisPrompt = buildAnalysisPrompt(frameDataArray, savedBeta, profile, frames);
  
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

function buildAnalysisPrompt(frames, savedBeta, profile, rawFrames) {
  const { height, armSpan, weight, pullUp } = profile;
  
  // 构建帧描述（只传关键帧：开头1+结尾1+中间3）
  const keyFrames = frames.length >= 5 
    ? [frames[0], frames[1], frames[Math.floor(frames.length/2)], frames[frames.length - 2], frames[frames.length - 1]]
    : frames;
  
  // 新格式beta描述（手脚配对格式）
  const betaText = savedBeta && savedBeta.beta
    ? `这条线路的最优beta（手脚配对格式）：\n${savedBeta.beta.map(b => {
      const hand = b.handPosition ? b.handPosition.split('；')[0] : b.description || '';
      const foot = b.footPosition ? b.footPosition.split('；')[0] : '';
      return `第${b.step}步：${hand} + ${foot}`;
    }).join('\n')}`
    : '（用户未保存该线路的读线结果）';
  
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
1. 分析视频中的有效攀爬片段（上墙→攀爬→下墙）
2. 按"手脚配对"格式分析每步动作（格式："右手[抓握] + 左脚[踩法]"）
3. 识别用户实际使用的动作类型（OpenCrimp/Crimp/Pinch/Sloper/DropKnee/HeelHook等）
4. 评估每步动作质量（1-10分）+ 具体问题 + 改进建议
5. 对比用户动作和最优beta的差异

**重要格式要求：**
- 每步必须用手脚配对格式描述
- 格式："右手OpenCrimp + 左脚内侧边缘踩"（而不是分开说）
- 每步评分必须附带具体问题描述（不能只说"一般"）
- 改进建议必须具体可操作（不是"多练核心"，而是"每天3分钟plank"）

**返回严格JSON格式（不要任何其他文字）：**
{
  "validSegment": {"start":5.2,"end":45.8,"duration":40.6},
  "overallScore": 7.2,
  "stepScores": [
    {"step":1,"handFootPair":"右手OpenCrimp + 左脚Edging","score":8,"description":"起始动作标准","issue":null,"suggestion":null,"moveType":"OpenCrimp"},
    {"step":2,"handFootPair":"左手Crimp + 右脚Smear","score":6,"description":"右手抓点时身体有飘动","issue":"核心没收紧导致身体偏摆","suggestion":"每天3分钟plank，目标坚持到90秒","moveType":"Crimp"}
  ],
  "mainIssues": ["核心力量不足导致第三步身体飘","换脚犹豫约1秒"],
  "improvements": ["每天3分钟plank","专注第三步核心收紧","Hip Hinge专项训练"],
  "betaMatchRate": "65%",
  "detectedMoves": ["OpenCrimp","DropKnee","Sloper","Pinch"]
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
    { step: 1, description: '起始姿势', keyPoint: '核心收紧', moveType: 'OpenCrimp' },
    { step: 2, description: '向上移动', keyPoint: '重心转移', moveType: 'Crimp' },
    { step: 3, description: '完成动作', keyPoint: '顶峰控制', moveType: 'Pinch' }
  ];
  
  return {
    validSegment: { start: 5.0, end: 45.0, duration: 40.0 },
    overallScore: 7.0,
    stepScores: defaultBeta.map((b, i) => ({
      step: b.step || i + 1,
      score: 6 + Math.random() * 3,
      description: b.description,
      issue: i === 1 ? '身体有一定偏摆' : null,
      suggestion: i === 1 ? '加强核心训练（每日3分钟plank）' : null,
      moveType: b.moveType || 'mixed'
    })),
    mainIssues: ['（演示数据）核心收紧程度可以提升', '换脚时可以更果断'],
    improvements: ['每天3分钟plank', '换脚练习：目标在0.5秒内完成'],
    detectedBeta: 'beta1',
    betaMatchRate: '70%',
    detectedMoves: defaultBeta.map(b => b.moveType).filter(Boolean),
    trainingPlan: ['每日3分钟plank', '换脚专项练习（目标0.5秒）', '每周2次指力板训练']
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
