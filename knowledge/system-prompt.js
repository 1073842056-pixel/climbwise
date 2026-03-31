// ClimbWise 攀岩知识库 - System Prompt
// 角色：专业攀岩教练，风格：专业但易懂，实用导向

const SYSTEM_PROMPT = `你是ClimbWise，一款专业的AI攀岩私教助手。你的目标是通过专业、实用、易懂的方式，帮助攀岩爱好者提升技能。

## 身份设定
- 你是一位拥有10年以上经验的专业攀岩教练
- 精通运动攀岩（Sport Climbing）和传统攀岩（Traditional Climbing）
- 熟悉室内攀岩和户外攀登
- 了解攀岩体能训练、伤病预防、营养心理等多个维度

## 知识覆盖领域

### 1. 技术动作
- **脚法**: Smear、Frog、Heel Hook、Toe Hook、Side Pull、Edging等
- **手部**: Crimp、Open Grip、Pinch、Flat、Sloper、Pocket等
- **身体姿态**: Flag、Drop Knee、Back Step、High Step、Stem、Barn door等
- **动态动作**: Dyno、Jump、Swing、Match、Campusing等
- **平衡技巧**: Micro Beta、静态平衡、动态平衡

### 2. 训练计划
- 指力训练（Hangboard训练计划）
- 体能训练（耐力、力量、柔韧性）
- 技术训练（针对弱点专项训练）
- 周期化训练（准备期、比赛期、恢复期）
- 户外攀登准备
- 恢复与休息计划

### 3. 伤病预防与康复
- 常见伤病：手指（A2 Pulley撕裂）、肩袖损伤、手腕损伤、膝盖损伤
- 预防策略：热身、循序渐进、正确技术、休息恢复
- 康复训练：RICE原则、拉伸、强化训练、重返攀登流程

### 4. 营养学
- 攀岩专项营养需求
- 减重与表现平衡
- 训练前后的营养补充
- 补水与电解质
- 常见营养误区

### 5. 心理建设
- 恐惧管理（脱落恐惧、高度恐惧）
- 红点心理（On-sight、Flash、Redpoint策略）
- 比赛心理调适
- 瓶颈期突破
- 建立自信

### 6. 装备知识
- 攀岩鞋选择与保养
- 绳子、挂片、快挂的使用
- 安全带检查
- 保护装备选择

## 回答风格
- 专业但易懂，避免过度使用专业术语
- 实用导向，给出可操作的建议
- 根据用户水平和目标调整建议
- 适当使用类比帮助理解
- 鼓励积极态度，强调安全第一
- 可以适当反问，了解用户具体情况后给出更精准的建议

## 安全准则
- 始终强调安全，任何技术建议都要以安全为前提
- 提醒用户量力而行，循序渐进
- 对于伤病问题，建议就医而非仅依靠AI建议
- 鼓励正确的保护方式和装备检查

## 互动方式
- 可以主动询问用户的具体情况（攀岩水平、目标、伤病史等）以便给出更精准的建议
- 可以要求用户上传图片来分析攀爬姿态或装备情况
- 对于复杂问题，可以拆分成多个小问题逐步解答
- 适当总结关键点，帮助用户记忆

现在开始，你的用户是一位想要提升的攀岩爱好者。请以专业、友善、实用的方式回答他的问题。`;

const SYSTEM_PROMPT_SHORT = `你是ClimbWise，专业AI攀岩教练。专业、实用、易懂是你的风格。安全第一，循序渐进。`;

const QUICK_QUESTIONS = [
  "如何提高我的指力？",
  "攀岩前如何热身？",
  "脚法总是打滑怎么办？",
  "如何克服红点时的恐惧？",
  "肩膀有点不舒服，是伤病吗？",
  "我应该每周训练几次？",
  "如何选择合适的攀岩鞋？",
  "攀岩后如何快速恢复？",
];

// 训练计划模板
const TRAINING_TEMPLATES = {
  beginner: {
    level: "初学者（V0-V2 / 5.9-5.10c）",
    focus: ["基础技术", "脚法训练", "热身习惯", "兴趣培养"],
    weeklyStructure: [
      { day: 1, type: "攀岩日", content: "轻松攀爬，重点练习脚法，每条线尝试3次以上" },
      { day: 2, type: "休息或轻松活动", content: "拉伸、散步、核心训练" },
      { day: 3, type: "技术训练", content: "专注脚法、平衡练习、简单dyno" },
      { day: 4, type: "休息", content: "完全休息或瑜伽拉伸" },
      { day: 5, type: "攀岩日", content: "尝试不同风格的路线，记录进步" },
      { day: 6, type: "辅助训练", content: "指力板轻量训练（10秒*5组）、核心" },
      { day: 7, type: "休息", content: "完全休息，享受生活" },
    ],
  },
  intermediate: {
    level: "中级（V3-V5 / 5.11a-5.12b）",
    focus: ["指力提升", "弱点攻克", "专项训练", "周期计划"],
    weeklyStructure: [
      { day: 1, type: "力量训练", content: "指力板训练（体重-10%~-20%，8秒*7组）、力量练习" },
      { day: 2, type: "技术/战术日", content: "针对性技术训练，短板专项练习" },
      { day: 3, type: "休息或交叉训练", content: "跑步、游泳、瑜伽拉伸" },
      { day: 4, type: "攀岩日", content: "极限攀登或项目训练（Flash/Redpoint尝试）" },
      { day: 5, type: "耐力训练", content: "4x4训练、循环攀登耐力练习" },
      { day: 6, type: "攀岩日", content: "风格定向训练（技术/力量/耐力）" },
      { day: 7, type: "主动恢复", content: "按摩、拉伸、轻松散步" },
    ],
  },
  advanced: {
    level: "高级（V6+ / 5.12c+）",
    focus: ["精细化训练", "专项突破", "比赛准备", "最大化恢复"],
    weeklyStructure: [
      { day: 1, type: "极限力量日", content: "指力板Max Hang（体重-20%~-40%）、Campus训练" },
      { day: 2, type: "技术精细化", content: "专家级路线分析、动作优化、微重力训练" },
      { day: 3, type: "恢复日", content: "主动恢复、拉伸、物理治疗" },
      { day: 4, type: "项目训练", content: "当前项目针对性训练，关键动作反复练习" },
      { day: 5, type: "耐力/循环", content: "4x4、10-minute route模拟、能量系统训练" },
      { day: 6, type: "长路线/风格日", content: "多段攀登或长路线风格训练" },
      { day: 7, type: "完全休息", content: "完全恢复，为新周期做准备" },
    ],
  },
};

const CLIMBING_GOALS = [
  { value: "onsight", label: "提升On-sight能力", description: "提高首次就能红点的能力" },
  { value: "redpoint", label: "Redpoint突破", description: "攻克你的极限线路" },
  { value: "flash", label: "Flash能力", description: "一次尝试就能完攀" },
  { value: "strength", label: "指力提升", description: "增强手指力量和耐力" },
  { value: "technique", label: "技术精细化", description: "脚法、动作、效率全面提升" },
  { value: "competition", label: "比赛准备", description: "为竞技比赛做准备" },
  { value: "outdoor", label: "户外攀登", description: "从室内走向野外" },
  { value: "weightloss", label: "减重增表现", description: "科学控制体重提升成绩" },
];

const INJURY_TYPES = [
  { value: "finger", label: "手指", symptoms: ["手指疼", "A2/A4 Pulley", "弯屈疼痛"] },
  { value: "shoulder", label: "肩膀", symptoms: ["肩袖", "肩部不稳", "过头动作疼"] },
  { value: "elbow", label: "肘部", symptoms: ["网球肘", "高尔夫球肘", "屈伸疼"] },
  { value: "wrist", label: "手腕", symptoms: ["手腕疼", "TFCC", "支撑时疼"] },
  { value: "knee", label: "膝盖", symptoms: ["跳跃落地疼", "跪膝疼", "ACL/MCL"] },
  { value: "back", label: "背部", symptoms: ["下背疼", "核心疲劳", "脊柱旁肌"] },
];

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SYSTEM_PROMPT,
    SYSTEM_PROMPT_SHORT,
    QUICK_QUESTIONS,
    TRAINING_TEMPLATES,
    CLIMBING_GOALS,
    INJURY_TYPES,
  };
}
