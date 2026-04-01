/**
 * ClimbWise 图像分析模块
 * 
 * 流程：上传照片 → 用户选颜色 → MiniMax Vision API 分析
 *       → 返回：手点脚点 + beta序列 + 火柴人帧 + 个性化评分
 */

const API_KEY = 'sk-api-MMVY9mYpedvYoP76eT9hCsJh5lkPQXH-e7qk2jR-kN6hMm3VKmEK2wYuO3-2NhUXmv-ULeo3-o0yUd7Tj44sS9kzzxwwnYZohrHY7lfjXBTU2bFkDY0cBaE';
const API_BASE = 'https://api.minimax.chat/v1/text/chatcompletion_pro';
const MODEL = 'MiniMax-Text-01';

// 颜色选项（岩馆常用颜色）
const COLOR_OPTIONS = [
  { name: '黄色', color: '#FBBF24', textColor: '#000' },
  { name: '蓝色', color: '#3B82F6', textColor: '#fff' },
  { name: '绿色', color: '#22C55E', textColor: '#fff' },
  { name: '红色', color: '#EF4444', textColor: '#fff' },
  { name: '白色', color: '#F8FAFC', textColor: '#000' },
  { name: '粉色', color: '#EC4899', textColor: '#fff' },
  { name: '橙色', color: '#F97316', textColor: '#fff' },
  { name: '紫色', color: '#8B5CF6', textColor: '#fff' },
  { name: '灰色', color: '#6B7280', textColor: '#fff' },
  { name: '黑色', color: '#1F2937', textColor: '#fff' },
];

// 备用分析结果（API失败时使用）
const FALLBACK_ANALYSIS = {
  holds: [
    { type: 'hand', x: 0.72, y: 0.15, size: 'large', description: '右上角大手点，正握' },
    { type: 'hand', x: 0.35, y: 0.38, size: 'medium', description: '左侧中手点，侧握' },
    { type: 'foot', x: 0.28, y: 0.55, size: 'large', description: '左下大脚点，起始' },
    { type: 'hand', x: 0.65, y: 0.55, size: 'small', description: '中间小手点，需要精确' },
    { type: 'foot', x: 0.50, y: 0.70, size: 'medium', description: '中间脚点，换脚' },
    { type: 'hand', x: 0.45, y: 0.85, size: 'large', description: '顶部大手点，顶端' },
  ],
  beta: [
    { step: 1, description: '起始：双脚踩左下角和中间脚点，右手抓右上角大手点', keyPoint: '核心收紧，重心下沉，两脚三点固定' },
    { step: 2, description: '左手抓中间小手点，身体重心右移', keyPoint: '三点固定，重心平稳转移' },
    { step: 3, description: '右脚移动到中间脚点，左脚踩稳', keyPoint: '脚法精准，核心保持收紧' },
    { step: 4, description: '右手抓顶部大手点，左手辅助，身体向上移动', keyPoint: '发力从脚开始，手臂引导方向' },
    { step: 5, description: '双手握住顶部，完成！', keyPoint: '顶峰冲拳庆祝 🎉' },
  ],
  frames: [
    { head:{cx:0.50,cy:0.28,r:0.025}, hip:{x:0.50,y:0.50}, leftArm:{elbow:{x:0.40,y:0.40},hand:{x:0.72,y:0.15}}, rightArm:{elbow:{x:0.60,y:0.40},hand:{x:0.28,y:0.30}}, leftLeg:{knee:{x:0.45,y:0.65},foot:{x:0.28,y:0.55}}, rightLeg:{knee:{x:0.55,y:0.65},foot:{x:0.50,y:0.70}} },
    { head:{cx:0.50,cy:0.25,r:0.025}, hip:{x:0.50,y:0.47}, leftArm:{elbow:{x:0.38,y:0.35},hand:{x:0.35,y:0.38}}, rightArm:{elbow:{x:0.62,y:0.35},hand:{x:0.72,y:0.15}}, leftLeg:{knee:{x:0.42,y:0.62},foot:{x:0.28,y:0.55}}, rightLeg:{knee:{x:0.58,y:0.62},foot:{x:0.50,y:0.70}} },
    { head:{cx:0.50,cy:0.22,r:0.025}, hip:{x:0.50,y:0.44}, leftArm:{elbow:{x:0.36,y:0.30},hand:{x:0.65,y:0.55}}, rightArm:{elbow:{x:0.64,y:0.30},hand:{x:0.72,y:0.15}}, leftLeg:{knee:{x:0.44,y:0.58},foot:{x:0.50,y:0.70}}, rightLeg:{knee:{x:0.56,y:0.58},foot:{x:0.65,y:0.62}} },
    { head:{cx:0.50,cy:0.18,r:0.025}, hip:{x:0.50,y:0.40}, leftArm:{elbow:{x:0.40,y:0.28},hand:{x:0.45,y:0.85}}, rightArm:{elbow:{x:0.60,y:0.28},hand:{x:0.65,y:0.55}}, leftLeg:{knee:{x:0.44,y:0.55},foot:{x:0.50,y:0.70}}, rightLeg:{knee:{x:0.56,y:0.55},foot:{x:0.62,y:0.65}} },
    { head:{cx:0.50,cy:0.14,r:0.025}, hip:{x:0.50,y:0.36}, leftArm:{elbow:{x:0.42,y:0.25},hand:{x:0.45,y:0.85}}, rightArm:{elbow:{x:0.58,y:0.25},hand:{x:0.45,y:0.85}}, leftLeg:{knee:{x:0.46,y:0.52},foot:{x:0.50,y:0.70}}, rightLeg:{knee:{x:0.54,y:0.52},foot:{x:0.58,y:0.62}} },
  ]
};

// ===== 构建分析Prompt =====

function buildAnalysisPrompt(selectedColor, profile, photoDataUrl) {
  const { height, armSpan, weight, pullUp, climbingFrequency, sessionDuration } = profile;
  
  return {
    model: MODEL,
    tokens_to_generate: 4096,
    bot_setting: [
      {
        bot_name: 'ClimbWise',
        content: `你是专业攀岩教练。用户上传了一张室内抱石岩壁照片。

用户选择了线路颜色：${selectedColor}

**你的任务：**
1. 识别所有${selectedColor}的手点（hand）和脚点（foot），用0-1归一化坐标（x=横向0-1，y=纵向0-1，y=0是顶部，y=1是底部）
2. 分析这条线路的beta（最优攀爬顺序）
3. 根据用户的身体条件做个性化适配
4. 给出主观难度评分（1-10，10=最适合你）

**用户身体条件：**
- 身高：${height}cm，臂展：${armSpan}cm
- 体重：${weight}kg
- 引体向上最多：${pullUp}个
- 每周爬：${climbingFrequency}次
- 每次训练：约${sessionDuration}分钟

**重要：**
- x,y用0-1比例，不用像素坐标（图片尺寸不固定）
- 手点：mark类、edge类、pocket类、crimp类、sloper类、pinch类
- 脚点：smear、edge、volume、脚窝
- 结合用户臂展判断伸展够不够得着
- 结合引体次数判断力量够不够通过难点

**返回严格JSON格式（不要任何其他文字）：**
{
  "holds": [
    {"type":"hand"|"foot", "x":0.0-1.0, "y":0.0-1.0, "size":"large"|"medium"|"small", "description":"描述"}
  ],
  "beta": [
    {"step":1, "description":"动作描述", "keyPoint":"核心要点"}
  ],
  "frames": [
    {"head":{"cx":0.0-1.0,"cy":0.0-1.0,"r":0.025}, "hip":{"x":0.0-1.0,"y":0.0-1.0}, "leftArm":{"elbow":{"x":0.0-1.0,"y":0.0-1.0},"hand":{"x":0.0-1.0,"y":0.0-1.0}}, "rightArm":{"elbow":{"x":0.0-1.0,"y":0.0-1.0},"hand":{"x":0.0-1.0,"y":0.0-1.0}}, "leftLeg":{"knee":{"x":0.0-1.0,"y":0.0-1.0},"foot":{"x":0.0-1.0,"y":0.0-1.0}}, "rightLeg":{"knee":{"x":0.0-1.0,"y":0.0-1.0},"foot":{"x":0.0-1.0,"y":0.0-1.0}}}
  ],
  "reachScore": 8.0,
  "strengthScore": 7.5,
  "weightScore": 9.0,
  "personalScore": 8.0,
  "subjectiveGrade": "对你来说约等于V3",
  "estimatedAttempts": "2-3次",
  "difficultyPoints": [{"step":1,"description":"..."}],
  "suggestions": ["建议1","建议2"]
}`
      }
    ],
    reply_constraints: {
      role: 'assistant',
      sender_type: 'BOT',
      sender_name: 'ClimbWise'
    },
    messages: [
      {
        sender_type: 'USER',
        sender_name: '用户',
        role: 'user',
        content: [
          { type: 'text', text: `分析这张${selectedColor}线路，识别手点脚点，给出最优beta。只返回JSON。` },
          { type: 'image_url', image_url: { url: photoDataUrl } }
        ]
      }
    ]
  };
}

// ===== 计算个性化评分 =====

function calculatePersonalScore(holds, profile) {
  const { height, armSpan, weight, pullUp } = profile;
  
  // 伸展适配度（40%）
  const handHolds = holds.filter(h => h.type === 'hand');
  const footHolds = holds.filter(h => h.type === 'foot');
  const maxReachY = Math.min(...handHolds.map(h => h.y)); // y越小=越高
  const minX = Math.min(...handHolds.map(h => h.x));
  const maxX = Math.max(...handHolds.map(h => h.x));
  
  // 需要的伸展距离（按图片比例估算）
  const stretchNeeded = (maxX - minX) * height * 0.8; // 粗略估算
  const armLength = armSpan / 2;
  const reachRatio = Math.min(1, armLength / (armLength + (1 - maxReachY) * height * 0.6));
  const reachScore = Math.round(reachRatio * 10 * 10) / 10;
  
  // 力量适配度（35%）
  // 假设完成一条需要15个引体的力量作为基准
  const strengthRatio = Math.min(1, pullUp / 15);
  const strengthScore = Math.round(strengthRatio * 10 * 10) / 10;
  
  // 体重适配度（25%）
  // 体重<65kg=10分，每多5kg-1分
  const weightRatio = weight < 65 ? 10 : Math.max(1, 10 - (weight - 65) / 5);
  const weightScore = Math.round(weightRatio * 10) / 10;
  
  // 综合评分
  const finalScore = Math.round((reachScore * 0.40 + strengthScore * 0.35 + weightScore * 0.25) * 10) / 10;
  
  // 估算尝试次数
  let estimatedAttempts;
  if (finalScore >= 9) estimatedAttempts = '1次（可能首攀）';
  else if (finalScore >= 7) estimatedAttempts = '2-3次';
  else if (finalScore >= 5) estimatedAttempts = '5-10次';
  else if (finalScore >= 3) estimatedAttempts = '10-20次';
  else estimatedAttempts = '需要先提升基础能力';
  
  // 等效难度
  const gradeMap = [
    [10, 'V0-1'], [9, 'V2-3'], [8, 'V3-4'], [7, 'V4-5'],
    [6, 'V5-6'], [5, 'V6-7'], [4, 'V7-8'], [3, 'V8-9'],
    [2, 'V9-10'], [1, 'V10+']
  ];
  let subjectiveGrade = 'V0';
  for (const [s, g] of gradeMap) {
    if (finalScore >= s) { subjectiveGrade = `对你来说约等于 ${g}`; break; }
  }
  
  // 生成建议
  const suggestions = [];
  if (reachScore < 7) suggestions.push('加强伸展练习，增加臂展灵活性');
  if (strengthScore < 7) suggestions.push(`目标：引体向上从${pullUp}个提升到${pullUp + 5}个`);
  if (weightScore < 7) suggestions.push('适当减重可以提升力量体重比');
  if (suggestions.length === 0) suggestions.push('当前身体条件很适合这条线路，信心冲刺！');
  
  // 难点分析
  const difficultyPoints = handHolds.slice(0, 3).map((h, i) => ({
    step: i + 1,
    description: h.description
  }));
  
  return {
    reachScore,
    strengthScore,
    weightScore,
    personalScore: finalScore,
    subjectiveGrade,
    estimatedAttempts,
    suggestions,
    difficultyPoints
  };
}

// ===== 核心分析函数 =====

async function analyzeRoute(photoDataUrl, selectedColor, profile) {
  const payload = buildAnalysisPrompt(selectedColor, profile, photoDataUrl);
  
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    // 检查API错误
    if (data.base_resp && data.base_resp.status_code !== 0) {
      console.warn('[Vision] API error:', data.base_resp.status_msg);
      return buildFallbackResult(selectedColor);
    }
    
    let content = data.reply || '';
    
    // 提取JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[Vision] No JSON found in response');
      return buildFallbackResult(selectedColor);
    }
    
    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('[Vision] JSON parse error:', parseErr);
      return buildFallbackResult(selectedColor);
    }
    
    // 补充个性化评分（如果API没返回）
    if (!result.personalScore) {
      const scores = calculatePersonalScore(result.holds || [], profile);
      result = { ...result, ...scores };
    }
    
    result.color = selectedColor;
    return result;
    
  } catch (e) {
    console.error('[Vision] analyzeRoute error:', e);
    return buildFallbackResult(selectedColor);
  }
}

// ===== 备用结果 =====

function buildFallbackResult(color) {
  return {
    ...FALLBACK_ANALYSIS,
    color,
    reachScore: 8.0,
    strengthScore: 7.5,
    weightScore: 9.0,
    personalScore: 8.0,
    subjectiveGrade: '对你来说约等于 V3（参考值）',
    estimatedAttempts: '2-3次（参考值）',
    suggestions: ['（网络问题，使用演示数据）'],
    difficultyPoints: FALLBACK_ANALYSIS.beta.map((b, i) => ({ step: b.step, description: b.keyPoint }))
  };
}

// ===== 导出 =====

window.ClimbVision = {
  analyzeRoute,
  calculatePersonalScore,
  buildAnalysisPrompt,
  COLOR_OPTIONS,
  FALLBACK_ANALYSIS
};
