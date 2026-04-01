/**
 * ClimbWise 攀岩知识库 v1
 * 
 * 包含攀岩动作分类、难度感知、训练建议
 * 用于AI生成更专业的beta建议和个性化评分
 */

const CLIMBING_KNOWLEDGE = {

  // ===== 动作类型分类 =====
  MOVE_TYPES: {
    // 手部动作
    Crimp: {
      name: '扣握 Crimp',
      description: '指尖向下扣住岩壁，力量最大但最伤手指',
      difficulty: 'high',
      fingerLoad: 5,
      technique: '适用于小edge或薄片，需要极强的指尖力量',
      training: ['指力板训练', 'Fingerroll', '逐步增加负重']
    },
    OpenCrimp: {
      name: '开口握 Open Crimp',
      description: '手指包住岩点，指尖不完全扣下，保护手指',
      difficulty: 'medium',
      fingerLoad: 3,
      technique: '比扣握更安全，适合长时间保持或动态出击',
      training: ['指力板训练', '负重引体']
    },
    Pocket: {
      name: '口袋 Pocket',
      description: '1-4个手指插入岩点孔洞中',
      difficulty: 'medium-high',
      fingerLoad: 4,
      technique: '通常用2-3个手指，小口袋用中指无名指更稳定',
      training: ['指力板口袋训练', '单独手指力量']
    },
    Sloper: {
      name: '斜坡 Sloper',
      description: '没有任何edge的圆润岩点，依靠摩擦力和手臂角度',
      difficulty: 'high',
      fingerLoad: 1,
      technique: '身体要紧贴岩壁，重心要在脚正上方，手掌向下压而不是抓',
      training: ['摩擦力训练', '核心收紧', 'hip hinge练习']
    },
    Pinch: {
      name: '捏握 Pinch',
      description: '两个面夹住岩点，拇指和其他手指对握',
      difficulty: 'medium',
      fingerLoad: 2,
      technique: '适合薄片和大edge，力量来源是手臂内旋',
      training: ['Pinchブロック训练', '负重捏握']
    },
    Mono: {
      name: '单点 Mono',
      description: '只有一个手指抓握',
      difficulty: 'very-high',
      fingerLoad: 5,
      technique: '通常是极限难度的动作，需要极强的单指力量',
      training: ['单指引体（从辅助开始）', 'Fingerroll']
    },

    // 脚部动作
    Edging: {
      name: '踢边 Edging',
      description: '用脚边缘（内/外）站在岩点上',
      difficulty: 'medium',
      technique: '内边缘适合小点，外边缘适合大点，鞋要贴紧',
      training: ['单脚平衡训练', '鞋感练习']
    },
    Smearing: {
      name: '蹭磨 Smear',
      description: '没有岩点时用鞋橡胶摩擦力贴墙',
      difficulty: 'medium-high',
      technique: '脚要往外推而不是往下踩，核心收紧保持平衡',
      training: ['平衡板训练', '核心力量']
    },
    ToeHook: {
      name: '脚勾 Toe Hook',
      description: '脚背勾住岩壁或岩点，提供向上拉力',
      difficulty: 'medium',
      technique: '常用于dyno后的稳定，或在roof段保持身体',
      training: ['脚踝力量', 'Toe Hook专项训练']
    },
    HeelHook: {
      name: '脚跟勾 Heel Hook',
      description: '脚跟钩住岩点，辅助身体靠近或下压',
      difficulty: 'high',
      technique: '身体要转胯靠近岩壁，大腿内侧参与发力',
      training: ['柔韧性训练', '腿后链力量']
    },

    // 身体动作
    DropKnee: {
      name: '下蹲 Drop Knee',
      description: '膝盖向内向下旋转，减少reach增加稳定性',
      difficulty: 'medium',
      technique: '在overhang段尤为重要，可以显著减少手臂力量需求',
      training: ['柔韧性训练（髋关节）', '跨步深蹲']
    },
    Flag: {
      name: '旗 Flag',
      description: '一只脚向侧面伸展保持平衡',
      difficulty: 'medium',
      technique: '三点固定原则的变体，在dyno和平衡线上常用',
      training: ['平衡训练', '单腿站立']
    },
    BackStep: {
      name: '后踏 Back Step',
      description: '脚放在身体后侧，髋部转向岩壁',
      difficulty: 'medium',
      technique: '可以让身体更贴近岩壁，减少手臂力量需求',
      training: ['髋关节灵活性', '后脚发力练习']
    },
    HipHinge: {
      name: '髋铰链 Hip Hinge',
      description: '从髋部折叠，身体远离岩壁',
      difficulty: 'medium-high',
      technique: '在slab线路上必备，sloper必用技术',
      training: ['Hip Hinge专项', '核心收紧']
    },
    Mantel: {
      name: '翻撑 Mantel',
      description: '手臂撑住，身体从侧面翻上岩壁',
      difficulty: 'high',
      technique: '需要肩部稳定和核心力量，手伸直后髋部发力翻上',
      training: ['肩部稳定训练', '辅助单臂撑']
    },
    Stem: {
      name: '撑腿 Stem',
      description: '双腿向两侧撑在岩壁缝隙中',
      difficulty: 'medium',
      technique: '无需手臂力量，纯靠腿力撑住身体',
      training: ['腿部力量', '髋关节灵活性']
    },
    BatHang: {
      name: '蝙蝠挂 Bat Hang',
      description: '膝盖勾住岩点，身体倒挂',
      difficulty: 'medium',
      technique: '在roof线路中休息，膝盖位置要稳定',
      training: ['核心收紧', '腿后链力量']
    },
    Campusing: {
      name: '跳跃抓点 Campusing',
      description: '不用脚，纯靠手臂力量跳跃抓点',
      difficulty: 'very-high',
      technique: '需要极强的手臂力量和肩部稳定，通常是最极致的动作',
      training: ['器械跳 双臂/单臂', '肩部稳定']
    },
    Dyno: {
      name: '动态跳 Dyno',
      description: '起跳后空中抓点，完全靠爆发力',
      difficulty: 'very-high',
      technique: '脚要先推墙找准时机，身体保持流线型',
      training: ['爆发力训练', '协调性', '先在低处练习']
    }
  },

  // ===== 动作组合类型（Beta Pattern）=====
  BETA_PATTERNS: {
    'finger-ladder': {
      name: '指力阶梯 Finger Ladder',
      description: '连续向上抓越来越小的点',
      style: 'strength',
      difficulty: 'high',
      coreMoves: ['Crimp', 'OpenCrimp', 'Pocket']
    },
    'toe-to-hip': {
      name: '脚推臀送 Toe to Hip',
      description: '脚推墙→髋部向岩壁送→手伸直',
      style: 'technique',
      difficulty: 'medium',
      coreMoves: ['Edging', 'HipHinge', 'BackStep']
    },
    'knees-bar': {
      name: '膝盖休息 Knees Bar',
      description: '膝盖顶住岩壁，双手休息',
      style: 'rest',
      difficulty: 'low',
      coreMoves: ['DropKnee', 'Flag']
    },
    'drop-knee-sloper': {
      name: '下蹲斜坡 Drop Knee Sloper',
      description: '膝盖下沉+身体外倾+sloper下压',
      style: 'friction',
      difficulty: 'high',
      coreMoves: ['DropKnee', 'Sloper', 'HipHinge']
    },
    'heel-toe-rockover': {
      name: '脚跟到脚尖换位 Rockover',
      description: '从heel hook换到脚尖站起',
      style: 'technique',
      difficulty: 'medium',
      coreMoves: ['HeelHook', 'Edging', 'BackStep']
    },
    'shoulder-complex': {
      name: '肩部复合 Shoulder Complex',
      description: '需要肩部极度展开的手臂伸直姿态',
      style: 'flexibility',
      difficulty: 'high',
      coreMoves: ['Mantel', 'BackStep']
    },
    'lock-off': {
      name: '锁定 Lock-off',
      description: '手臂弯曲90度锁定，腾出一只手换点',
      style: 'strength',
      difficulty: 'high',
      coreMoves: ['Crimp', 'OpenCrimp']
    },
    'deadpoint': {
      name: '死点 Deadpoint',
      description: '在速度最快时抓点，身体和手同时到达',
      style: 'dynamic',
      difficulty: 'high',
      coreMoves: ['Dyno', 'Flag']
    },
    'match': {
      name: '匹配手点 Match',
      description: '两手抓到同一个点',
      style: 'technique',
      difficulty: 'medium',
      coreMoves: ['OpenCrimp']
    },
    'cross': {
      name: '交叉 Cross',
      description: '越过中线大幅伸手',
      style: 'dynamic',
      difficulty: 'high',
      coreMoves: ['OpenCrimp', 'Flag']
    }
  },

  // ===== 难度感知系统 =====
  DIFFICULTY_FACTORS: {
    reach: {
      name: '伸展需求',
      weight: 0.30,
      description: '线路需要的最大伸展程度'
    },
    fingerStrength: {
      name: '手指力量',
      weight: 0.25,
      description: '对Crimp/Pocket等小点的依赖程度'
    },
    core: {
      name: '核心力量',
      weight: 0.25,
      description: '身体贴近岩壁所需的稳定性'
    },
    flexibility: {
      name: '柔韧性',
      weight: 0.20,
      description: 'Drop Knee、Back Step等需要髋关节打开'
    }
  },

  // ===== 难度等级感知 =====
  GRADE_CHARACTERISTICS: {
    'V0-V1': {
      moves: ['Edging', 'OpenCrimp', 'BackStep', 'Flag'],
      style: 'technical',
      description: '以脚为中心，动作清晰，力量需求低',
      commonPatterns: ['toe-to-hip', 'rockover']
    },
    'V2-V3': {
      moves: ['OpenCrimp', 'Pinch', 'Sloper', 'DropKnee'],
      style: 'mixed',
      description: '开始引入sloper和简单下蹲，需要一定核心',
      commonPatterns: ['drop-knee-sloper', 'toe-to-hip']
    },
    'V4-V5': {
      moves: ['Crimp', 'Sloper', 'DropKnee', 'HeelHook', 'Mantel'],
      style: 'strength+technique',
      description: 'Crimp点开始出现，需要较好的核心和指力',
      commonPatterns: ['drop-knee-sloper', 'heel-toe-rockover', 'lock-off']
    },
    'V6-V7': {
      moves: ['Crimp', 'Pocket', 'HeelHook', 'Mantel', 'Stem'],
      style: 'power',
      description: '小Crimp和口袋点为主，需要很强的指力和肩部稳定',
      commonPatterns: ['finger-ladder', 'shoulder-complex', 'lock-off']
    },
    'V8-V9': {
      moves: ['Mono', 'Campusing', 'Dyno', 'HeelHook', 'Mantel'],
      style: '极限',
      description: '极限动作，单指力量，动态跳跃，campusing',
      commonPatterns: ['dyno', 'deadpoint', 'cross', 'finger-ladder']
    },
    'V10+': {
      moves: ['Mono', 'Campusing', 'Dyno'],
      style: '精英',
      description: '只有精英选手能完成，需要极限力量和完美技术',
      commonPatterns: ['campusing', 'dyno', 'deadpoint']
    }
  },

  // ===== 风格匹配 =====
  CLIMBER_STYLES: {
    power: {
      name: '力量型',
      description: '适合大动作、动态、campusing',
      strengths: ['指力', '爆发力', '肩部稳定'],
      weaknesses: ['柔韧', '耐力'],
      recommendedPatterns: ['dyno', 'deadpoint', 'cross', 'campusing'],
      training: ['指力板高强度', '爆发力训练', '器械跳']
    },
    technical: {
      name: '技术型',
      description: '适合精确移动、平衡、脚法',
      strengths: ['脚法', '平衡', '柔韧'],
      weaknesses: ['力量', '爆发力'],
      recommendedPatterns: ['toe-to-hip', 'drop-knee-sloper', 'heel-toe-rockover'],
      training: ['精确脚法练习', '平衡训练', 'Hip Hinge专项']
    },
    endurance: {
      name: '耐力型',
      description: '适合长线路、膝盖休息',
      strengths: ['耐力', '恢复能力', '心理'],
      weaknesses: ['爆发力'],
      recommendedPatterns: ['knees-bar', 'lock-off'],
      training: ['长征训练', '4x4s', '极限 Boulder']
    },
    flexible: {
      name: '柔韧型',
      description: '适合髋关节打开的动作',
      strengths: ['柔韧', '髋关节', '平衡'],
      weaknesses: ['力量'],
      recommendedPatterns: ['drop-knee-sloper', 'back-step-overhang', 'stem'],
      training: ['每日拉伸', '瑜伽', '髋关节灵活性']
    }
  },

  // ===== 个性化建议生成 =====
  generateSuggestions(params) {
    const { reachScore, strengthScore, weightScore, flexibilityScore, style } = params;
    const suggestions = [];

    // 基于伸展评分
    if (reachScore < 5) {
      suggestions.push('加强手臂和肩部伸展训练，增加reach能力');
    }
    if (reachScore < 3) {
      suggestions.push('练习双脚伸展触点，尝试比当前难度低1-2级的线路建立信心');
    }

    // 基于力量评分
    if (strengthScore < 5) {
      suggestions.push('指力板训练从负重开始，逐步增加，建议每周3次');
    }
    if (strengthScore < 3) {
      suggestions.push('在指力板训练前先用辅助带，逐步减少辅助比例');
    }

    // 基于体重评分
    if (weightScore < 5) {
      suggestions.push('适当减重会显著提升力量体重比，目标减少2-3kg');
    }
    if (weightScore < 3) {
      suggestions.push('优先提升力量而非继续减重，增加引体向上负重');
    }

    // 柔韧性
    if (flexibilityScore < 5) {
      suggestions.push('每天10分钟髋关节拉伸，V4+线路需要良好的Drop Knee');
    }

    // 综合建议
    if (reachScore > 7 && strengthScore < 5) {
      suggestions.push('你的伸展很好但力量不足，尝试技术型线路（如sloper+drop knee）替代蛮力');
    }
    if (strengthScore > 7 && flexibilityScore < 5) {
      suggestions.push('你的力量出色但柔韧受限，开放性动作（back step）可以发挥你的力量优势');
    }

    return suggestions;
  },

  // ===== 评估某条线路的适配度 =====
  evaluateRouteMatch(userProfile, routeFeatures) {
    const { height, armSpan, weight, pullUp, climbingFrequency, sessionDuration } = userProfile;
    const { moveTypes, betaPatterns, gradeEquivalent } = routeFeatures;

    // 计算臂展指数
    const armSpanRatio = armSpan / height; // 正常约1.02

    // 评估伸展需求匹配
    let reachMatch = 0.5;
    if (armSpanRatio > 1.05) reachMatch = 0.8; // 臂展优秀
    if (armSpanRatio > 1.08) reachMatch = 0.95;
    if (armSpanRatio < 1.0) reachMatch = 0.4;

    // 评估力量需求匹配
    let strengthMatch = Math.min(1, pullUp / 20); // 20个引体=满分
    if (strengthMatch > 0.8 && climbingFrequency >= 3) strengthMatch = 1;

    // 评估体重指数
    const bmiProxy = weight / ((height/100) ** 2);
    let weightMatch = bmiProxy < 20 ? 0.9 : bmiProxy < 23 ? 0.7 : 0.5;

    // 综合评分
    const personalScore = (reachMatch * 0.3 + strengthMatch * 0.35 + weightMatch * 0.25 + (1 - bmiProxy/30) * 0.1) * 10;

    return {
      personalScore: Math.round(personalScore * 10) / 10,
      subjectiveGrade: this.scoreToGrade(personalScore),
      reachMatch: Math.round(reachMatch * 10) / 10,
      strengthMatch: Math.round(strengthMatch * 10) / 10,
      weightMatch: Math.round(weightMatch * 10) / 10,
      recommendations: this.generateSuggestions({
        reachScore: reachMatch * 10,
        strengthScore: strengthMatch * 10,
        weightScore: weightScore * 10,
        flexibilityScore: 6 // 默认值
      })
    };
  },

  // 分数转V级
  scoreToGrade(score) {
    if (score >= 9.5) return 'V8+';
    if (score >= 8.5) return 'V7';
    if (score >= 7.5) return 'V6';
    if (score >= 6.5) return 'V5';
    if (score >= 5.5) return 'V4';
    if (score >= 4.5) return 'V3';
    if (score >= 3.5) return 'V2';
    if (score >= 2.5) return 'V1';
    return 'V0';
  }
};

window.CLIMBING_KNOWLEDGE = CLIMBING_KNOWLEDGE;
