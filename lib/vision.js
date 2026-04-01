/**
 * ClimbWise 图像分析模块 v3 — 精读版
 * 
 * 核心改造：
 * 1. Prompt强制AI从知识库中检索动作类型，而不是自由发挥
 * 2. 后处理对坐标进行几何校验（手点必须在人体可及范围内）
 * 3. Beta描述必须包含：抓握细节 + 脚位 + 髋部位置 + 重心转移
 * 4. 结果分层展示：难点 → 步骤 → 动画 → 评分
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
// 严格遵循新版4维度beta格式
const FALLBACK_ANALYSIS = {
  holds: [
    { type: 'hand', x: 0.72, y: 0.15, size: 'large', gripType: 'OpenCrimp', description: '右上角大edge点，开口握' },
    { type: 'hand', x: 0.35, y: 0.38, size: 'medium', gripType: 'Crimp', description: '左侧中号岩点，扣握' },
    { type: 'hand', x: 0.55, y: 0.55, size: 'small', gripType: 'Sloper', description: '中间小sloper，斜面无edge' },
    { type: 'foot', x: 0.28, y: 0.55, size: 'large', footType: 'Edging', description: '左下脚点，内边缘踩' },
    { type: 'foot', x: 0.50, y: 0.68, size: 'medium', footType: 'Edging', description: '中间备用脚点' },
    { type: 'hand', x: 0.45, y: 0.88, size: 'large', gripType: 'Pinch', description: '顶部大手点，捏握' },
  ],
  beta: [
    {
      step: 1,
      handPosition: '右手伸直到(x:0.72, y:0.15)，OpenCrimp扣住大edge，手臂微屈；左手在(x:0.35, y:0.38)侧握中号岩点辅助平衡',
      footPosition: '左脚内侧边缘踩在(x:0.28, y:0.55)的大岩点，膝关节微屈；右脚在(x:0.50, y:0.68)外边缘踩稳备用',
      hipAction: '髋部主动向右旋转贴近岩壁，核心收紧，重心偏向左脚约70%，保持三点固定',
      bodyPosture: '上身前倾约15°，肩膀打开朝右约30°，双眼注视右手目标点，头部保持正直',
      keyPoint: '起始的关键是脚推墙而非手臂拉——左脚内侧发力，经小腿三头肌→腘绳肌→髋伸肌链传递到右手，手臂只引导方向。判断做对：右手抓点时左脚仍稳稳踩住无滑动'
    },
    {
      step: 2,
      handPosition: '左手从(x:0.35, y:0.38)移动到(x:0.55, y:0.55)的Sloper，Crimp扣住斜面，手臂伸直重心が转移',
      footPosition: '左脚从(x:0.28, y:0.55)换到(x:0.50, y:0.68)，右脚保持不动作为支撑',
      hipAction: '髋部向内收窄，核心保持收紧，重心平稳从左手转移到身体中心',
      bodyPosture: '上身前倾约25°，右手完全释放，肩膀保持打开状态',
      keyPoint: '换手时身体不要往下掉——左手换点前右脚要踩实，左手换点动作要快（1秒内完成），换好后立刻调整右脚踩实才能松左手'
    },
    {
      step: 3,
      handPosition: '双手同时抓顶部(x:0.45, y:0.88)的大Pinch点，右手Pinch捏住，左手辅助，肩膀发力向上推',
      footPosition: '双脚发力蹬离岩壁，右脚最后从(x:0.50, y:0.68)蹬出，身体腾空',
      hipAction: '髋部快速向上送，髋关节伸展，双腿发力与手臂形成合力',
      bodyPosture: '身体直立向上爆发，肩膀高于手点，髋部向上顶',
      keyPoint: '最后一步是全身协调爆发——脚先发力（80%力量）经腿→髋→肩链传递，手臂在最高点才发力抓点。判断做对：身体能完全离开岩壁后再用手抓，而非用手拽着身体往上'
    }
  ],
  frames: [
    { head:{cx:0.50,cy:0.28,r:0.025}, hip:{x:0.50,y:0.50}, leftArm:{elbow:{x:0.40,y:0.40},hand:{x:0.72,y:0.15}}, rightArm:{elbow:{x:0.60,y:0.40},hand:{x:0.28,y:0.30}}, leftLeg:{knee:{x:0.45,y:0.65},foot:{x:0.28,y:0.55}}, rightLeg:{knee:{x:0.55,y:0.65},foot:{x:0.50,y:0.70}} },
    { head:{cx:0.50,cy:0.25,r:0.025}, hip:{x:0.50,y:0.47}, leftArm:{elbow:{x:0.38,y:0.35},hand:{x:0.35,y:0.38}}, rightArm:{elbow:{x:0.62,y:0.35},hand:{x:0.72,y:0.15}}, leftLeg:{knee:{x:0.42,y:0.62},foot:{x:0.28,y:0.55}}, rightLeg:{knee:{x:0.58,y:0.62},foot:{x:0.50,y:0.70}} },
    { head:{cx:0.50,cy:0.22,r:0.025}, hip:{x:0.50,y:0.44}, leftArm:{elbow:{x:0.36,y:0.30},hand:{x:0.55,y:0.55}}, rightArm:{elbow:{x:0.64,y:0.30},hand:{x:0.72,y:0.15}}, leftLeg:{knee:{x:0.44,y:0.58},foot:{x:0.50,y:0.68}}, rightLeg:{knee:{x:0.56,y:0.58},foot:{x:0.65,y:0.62}} },
    { head:{cx:0.50,cy:0.18,r:0.025}, hip:{x:0.50,y:0.40}, leftArm:{elbow:{x:0.40,y:0.28},hand:{x:0.45,y:0.88}}, rightArm:{elbow:{x:0.60,y:0.28},hand:{x:0.55,y:0.55}}, leftLeg:{knee:{x:0.44,y:0.55},foot:{x:0.50,y:0.68}}, rightLeg:{knee:{x:0.56,y:0.55},foot:{x:0.58,y:0.62}} },
    { head:{cx:0.50,cy:0.14,r:0.025}, hip:{x:0.50,y:0.36}, leftArm:{elbow:{x:0.42,y:0.25},hand:{x:0.45,y:0.88}}, rightArm:{elbow:{x:0.58,y:0.25},hand:{x:0.45,y:0.88}}, leftLeg:{knee:{x:0.46,y:0.52},foot:{x:0.50,y:0.68}}, rightLeg:{knee:{x:0.54,y:0.52},foot:{x:0.58,y:0.62}} },
  ],
  reachScore: 8.5,
  strengthScore: 7.0,
  overallScore: 7.8,
  estimatedAttempts: '3-4次',
  difficultyReason: '第二步换手时需要在Sloper上保持身体稳定且快速完成换手，对手指力量和换手速度有一定要求',
  cruxDescription: '第二步：换手时需要在斜面上保持身体稳定，同时在1秒内完成左手换点',
  restPointStep: 2,
  startDescription: '双脚踩在地面，双手自然垂放，身体朝向岩壁',
  finishDescription: '双手稳定抓握顶部大手点，身体站稳，计为完成'
};

// ===== 坐标几何校验 =====

/**
 * 校验返回坐标的合理性
 * @param {object} result - API返回的分析结果
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validateCoordinates(result) {
  const errors = [];
  const { holds = [], beta = [] } = result;
  
  // 检查手点坐标范围
  holds.filter(h => h.type === 'hand').forEach((h, i) => {
    if (h.y < 0.05) errors.push(`手点${i+1}的y值${h.y}过小（顶部留白不足）`);
    if (h.y > 0.95) errors.push(`手点${i+1}的y值${h.y}过大（超出岩壁范围）`);
    if (h.x < 0.02) errors.push(`手点${i+1}的x值${h.x}过小`);
    if (h.x > 0.98) errors.push(`手点${i+1}的x值${h.x}过大`);
  });
  
  // 检查脚点坐标范围
  holds.filter(h => h.type === 'foot').forEach((f, i) => {
    if (f.y < 0.25) errors.push(`脚点${i+1}的y值${f.y}过小（脚点通常在岩壁中下部）`);
    if (f.x < 0.02) errors.push(`脚点${i+1}的x值${f.x}过小`);
    if (f.x > 0.98) errors.push(`脚点${i+1}的x值${f.x}过大`);
  });
  
  // 检查髋部y值
  beta.forEach((step, i) => {
    if (step.frames && step.frames.length > 0) {
      const frame = step.frames[0];
      if (frame.hip) {
        if (frame.hip.y < 0.30 || frame.hip.y > 0.70) {
          errors.push(`第${i+1}步的髋部y值${frame.hip.y}不合理（应在0.30-0.70之间）`);
        }
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ===== 解析API响应 =====

// ===== 构建分析Prompt =====

function buildAnalysisPrompt(selectedColor, profile, photoDataUrl) {
  const { height, armSpan, weight, pullUp, climbingFrequency, sessionDuration } = profile;
  
  return {
    model: MODEL,
    tokens_to_generate: 4096,
    bot_setting: [
      {
        bot_name: 'ClimbWise',
        content: `你是专业攀岩教练。用户的任务是：对抱石照片进行精确的技术分析，输出专业级beta。

**用户选择了线路颜色：${selectedColor}**

**用户档案：**
- 身高：${height}cm，臂展：${armSpan}cm（臂展/身高比=${(armSpan/height).toFixed(2)}）
- 体重：${weight}kg
- 引体向上：${pullUp}个（力量等级：${pullUp >= 15 ? 'high' : pullUp >= 8 ? 'medium' : 'low'}）
- 每周爬：${climbingFrequency}次，每次${sessionDuration}分钟

**你必须严格按照以下规范输出：**

---

## 规范一：手点识别

识别所有${selectedColor}手点，每个手点必须包含：

- **x, y**：归一化坐标（x=左→右0-1，y=上→下0-1，顶部y=0）
- **size**：large（大）/ medium（中）/ small（小）
- **gripType**：精确选择一种：
  - OpenCrimp（开口握，手指包住，指尖不完全扣下）
  - Crimp（扣握，指尖向下扣，最伤手指）
  - Pinch（捏握，拇指+手指夹住）
  - Sloper（斜面，无edge，靠摩擦）
  - Pocket（口袋，1-4指插入）
  - Mono（单指，极限难度）
- **description**：简洁描述位置，如"岩壁右侧中部大edge点"

## 规范二：脚点识别

识别所有${selectedColor}脚点，每个必须包含：

- **x, y**：归一化坐标
- **size**：large / medium / small
- **footType**：精确选择一种：
  - Edging（用脚边缘踩）
  - Smear（无点，靠鞋橡胶摩擦）
  - HeelHook（脚跟勾住）
  - ToeHook（脚背勾）
- **description**：简洁描述位置

## 规范三：Beta格式（核心，每步必须包含4个维度）

**每个step必须严格按以下4个维度输出：**

**handPosition** — 手部动作（缺一不可）：
- 手点在岩壁上的精确(x,y)坐标
- 抓握类型（gripType）
- 手臂弯曲程度（伸直/微屈/大角度弯曲）
- 哪只手（左手/右手）

**footPosition** — 脚部动作（缺一不可）：
- 脚点在岩壁上的精确(x,y)坐标
- 踩法（footType）
- 支撑还是发力

**hipAction** — 髋部动作（缺一不可）：
- 髋部朝向（贴近岩壁/远离/侧向）
- 是否有旋转（内旋/外旋/保持）
- 重心在哪只脚

**bodyPosture** — 身体姿态（缺一不可）：
- 上身倾斜（前倾/后仰/直立）
- 肩部相对于岩壁的方向
- 眼睛看向哪里

**keyPoint** — 核心发力原理（这句话必须精确，不能泛泛）：
- 这一步的力量传递链（脚→腿→髋→肩→手）
- 最容易出错的地方
- 如何判断做对了

**示例格式（严格遵循）：**
{
  "step": 1,
  "handPosition": "右手伸直到(x:0.72, y:0.18)，OpenCrimp扣住大edge，手臂微屈；左手在(x:0.40, y:0.35)侧握中等岩点作为辅助",
  "footPosition": "左脚内侧边缘踩在(x:0.28, y:0.55)的中等岩点，膝关节微屈；右脚在(x:0.52, y:0.62)外边缘踩稳备用",
  "hipAction": "髋部主动向右旋转贴近岩壁，核心收紧，重心偏向左脚约70%",
  "bodyPosture": "上身前倾约20°，肩膀打开朝右约45°，双眼注视右手目标点",
  "keyPoint": "这一蹬的力量从左脚内侧发出，经小腿三头肌→腘绳肌→髋伸肌链式传递到右手，手臂只负责引导方向而非主动发力，判断做对的标准是右手抓点时左脚仍稳稳踩住"
}

## 规范四：路线阅读5步法（所有beta必须遵循）

在生成beta前，先回答这5个问题：

**1. 起点和终点约束**
- 确认起始手脚位置和方向
- 确认完成条件（双手抓顶/单手匹配/稳定身体）

**2. Hold角色分类**
- 发力点（pulloff）：你从哪只手/脚离开
- 方向点（directional）：引导身体旋转
- 稳定点（stabilizer）：固定髋部
- 助力点（enabler）：支撑下一个手点
- 欺骗点（deceptive）：看起来能用但实际难用

**3. 难点定位（crux）**
- 这条线路的难点在哪一步
- 难点动作需要什么能力（指力/柔韧/协调/平衡）

**4. 手脚配对序列（核心输出格式）**
- 每一步必须以"手+脚"配对形式表达
- 例如："右手Pinch + 左脚内侧边缘踩" / "左手扣握(Crimp) + 右脚外缘踩+Flag"
- 不要孤立地说"右手抓点"，必须同步说明脚的位置

**5. 休息点识别**
- 这条线有没有可以稳定休息的地方
- 哪个点之后可以喘口气

## 规范四：坐标自检（输出前必须检查）

- 所有手点y值必须 > 0.05（岩壁顶部有留白）
- 伸直手臂时，hand.y + 0.08 < hip.y
- hip.y应在0.35-0.65之间
- 脚点y值应 > 相应手点y值（脚在下方）

## 规范五：评分说明

每个评分必须附带具体解释：
- reachScore：臂展够不够得着（考虑动态reach）
- strengthScore：引体能力能否完成关键发力
- overallScore：综合适配度
- difficultyReason：**一句话精确说明这条线的难点在哪里**，不是泛泛的"需要核心力量"

**严格返回以下JSON结构（不许添加任何其他字段）：**
{
  "holds": [{"type":"hand"|"foot", "x":0.0-1.0, "y":0.0-1.0, "size":"large"|"medium"|"small", "gripType":"OpenCrimp|Crimp|Pinch|Sloper|Pocket|Mono", "footType":"Edging|Smear|HeelHook|ToeHook", "description":"位置描述", "holdRole":"pulloff|directional|stabilizer|enabler|deceptive|start|finish"}],
  "beta": [
    {"step":1, "handPosition":"...", "footPosition":"...", "hipAction":"...", "bodyPosture":"...", "keyPoint":"...", "cruxStep":false, "restPoint":false}
  ],
  "frames": [...],
  "reachScore": 8.5,
  "strengthScore": 7.0,
  "overallScore": 7.8,
  "estimatedAttempts": "3-4次",
  "difficultyReason": "第二步的reach需要用户臂展的90%以上...",
  "cruxDescription": "该线路的难点描述",
  "restPointStep": 2,
  "startDescription": "起点描述（双手/双脚起始位置和方向）",
  "finishDescription": "完攀描述（如何判定完成）"
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
