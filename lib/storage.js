/**
 * ClimbWise 本地存储模块
 * 
 * 数据结构：
 * - userProfile: 用户攀岩档案
 * - routeCards: 线路卡片（读线结果）
 * - gymLogs: 训练打卡记录
 * - gyms: 岩馆信息
 */

const STORAGE_KEYS = {
  PROFILE: 'climbwise_profile',
  ROUTE_CARDS: 'climbwise_route_cards',
  GYM_LOGS: 'climbwise_gym_logs',
  GYMS: 'climbwise_gyms',
  ANALYSIS_RECORDS: 'climbwise_analysis_records'
};

// ===== 用户档案 =====

function getDefaultProfile() {
  return {
    height: 175,           // cm（默认值）
    armSpan: 178,          // cm（默认：身高×1.02）
    weight: 65,            // kg（默认值）
    pullUp: 10,            // 引体向上次数（默认值）
    climbingFrequency: 2,  // 每周爬几次（默认值）
    sessionDuration: 90,  // 每次训练多少分钟（默认值）
    goal: 'send_harder',   // 训练目标
    setupComplete: false,  // 是否已完成引导设置
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function getProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return getDefaultProfile();
    const profile = JSON.parse(raw);
    return { ...getDefaultProfile(), ...profile };
  } catch (e) {
    console.error('[Storage] getProfile error:', e);
    return getDefaultProfile();
  }
}

function saveProfile(profile) {
  profile.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

function updateProfile(updates) {
  const profile = getProfile();
  Object.assign(profile, updates);
  saveProfile(profile);
  return profile;
}

// ===== 线路卡片 =====

function getRouteCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ROUTE_CARDS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[Storage] getRouteCards error:', e);
    return [];
  }
}

function saveRouteCard(card) {
  const cards = getRouteCards();
  card.id = 'card_' + Date.now();
  card.createdAt = new Date().toISOString();
  cards.unshift(card); // 最新在前
  localStorage.setItem(STORAGE_KEYS.ROUTE_CARDS, JSON.stringify(cards));
  return card;
}

function getRouteCard(id) {
  const cards = getRouteCards();
  return cards.find(c => c.id === id);
}

function deleteRouteCard(id) {
  const cards = getRouteCards().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEYS.ROUTE_CARDS, JSON.stringify(cards));
}

function getRouteCardsByGym(gymId) {
  return getRouteCards().filter(c => c.gymId === gymId);
}

// ===== 岩馆 =====

function getGyms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GYMS);
    const saved = raw ? JSON.parse(raw) : [];
    // 合并默认岩馆
    const defaults = getDefaultGyms();
    const savedIds = new Set(saved.map(g => g.id));
    const merged = [...saved];
    for (const g of defaults) {
      if (!savedIds.has(g.id)) merged.push(g);
    }
    return merged;
  } catch (e) {
    console.error('[Storage] getGyms error:', e);
    return getDefaultGyms();
  }
}

function getDefaultGyms() {
  return [
    { id: 'gym_general', name: '我的岩馆', city: '', color: '#38bdf8' }
  ];
}

function saveGym(gym) {
  const gyms = getGyms();
  if (!gym.id) {
    gym.id = 'gym_' + Date.now();
    gym.createdAt = new Date().toISOString();
    gyms.push(gym);
  } else {
    const idx = gyms.findIndex(g => g.id === gym.id);
    if (idx >= 0) gyms[idx] = { ...gyms[idx], ...gym };
  }
  localStorage.setItem(STORAGE_KEYS.GYMS, JSON.stringify(gyms));
  return gym;
}

function getGym(id) {
  return getGyms().find(g => g.id === id);
}

// ===== 训练打卡记录 =====

function getGymLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GYM_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[Storage] getGymLogs error:', e);
    return [];
  }
}

function saveGymLog(log) {
  const logs = getGymLogs();
  log.id = 'log_' + Date.now();
  log.createdAt = new Date().toISOString();
  logs.unshift(log);
  localStorage.setItem(STORAGE_KEYS.GYM_LOGS, JSON.stringify(logs));
  return log;
}

function getLogsByGym(gymId) {
  return getGymLogs().filter(l => l.gymId === gymId);
}

function getTodayLog() {
  const today = new Date().toDateString();
  return getGymLogs().find(l => new Date(l.createdAt).toDateString() === today);
}

// ===== 统计数据 =====

function getTrainingStats() {
  const logs = getGymLogs();
  const cards = getRouteCards();
  
  // 基础统计
  const totalSessions = new Set(logs.map(l => new Date(l.createdAt).toDateString())).size;
  const totalRoutes = logs.length;
  const totalSends = logs.filter(l => l.result === 'send').length;
  const totalFlashes = logs.filter(l => l.result === 'flash').length;
  const totalAttempts = logs.filter(l => l.result === 'attempt').length;
  
  // 计算连续训练天数
  const sendDates = [...new Set(
    logs.filter(l => l.result === 'send').map(l => new Date(l.createdAt).toDateString())
  )].sort((a, b) => new Date(b) - new Date(a));
  
  let streak = 0;
  const today = new Date().toDateString();
  for (let i = 0; i < sendDates.length; i++) {
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    if (sendDates[i] === expected.toDateString()) {
      streak++;
    } else {
      break;
    }
  }
  
  // 本周训练天数
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  const weekLogs = logs.filter(l => new Date(l.createdAt) >= thisWeekStart);
  const weekDays = new Set(weekLogs.map(l => new Date(l.createdAt).toDateString())).size;
  
  // 本周完攀
  const weekSends = weekLogs.filter(l => l.result === 'send').length;
  
  // 本月训练天数
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const monthLogs = logs.filter(l => new Date(l.createdAt) >= thisMonthStart);
  const monthDays = new Set(monthLogs.map(l => new Date(l.createdAt).toDateString())).size;
  const monthSends = monthLogs.filter(l => l.result === 'send').length;
  
  // Send率
  const sendRate = totalRoutes > 0 ? Math.round(totalSends / totalRoutes * 100) : 0;
  const flashRate = totalRoutes > 0 ? Math.round(totalFlashes / totalRoutes * 100) : 0;
  
  return {
    totalSessions,      // 总训练次数
    totalRoutes,       // 总爬线路数
    totalSends,        // 总完攀数
    totalFlashes,      // 总Flash数
    totalAttempts,     // 总尝试数
    sendRate,          // Send率 %
    flashRate,         // Flash率 %
    currentStreak: streak,  // 当前连续天数
    weekDays,          // 本周训练天数
    weekSends,         // 本周完攀
    monthDays,         // 本月训练天数
    monthSends,        // 本月完攀
    routeCardCount: cards.length  // 已保存线路数
  };
}

// ===== 导出/清除 =====

function exportAllData() {
  return {
    profile: getProfile(),
    routeCards: getRouteCards(),
    gyms: getGyms(),
    gymLogs: getGymLogs(),
    exportedAt: new Date().toISOString()
  };
}

function clearAllData() {
  localStorage.removeItem(STORAGE_KEYS.PROFILE);
  localStorage.removeItem(STORAGE_KEYS.ROUTE_CARDS);
  localStorage.removeItem(STORAGE_KEYS.GYM_LOGS);
  localStorage.removeItem(STORAGE_KEYS.GYMS);
}

// ===== 分析记录 =====

function saveAnalysisRecord(record) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ANALYSIS_RECORDS);
    const records = raw ? JSON.parse(raw) : [];
    record.id = 'analysis_' + Date.now();
    record.createdAt = new Date().toISOString();
    records.unshift(record);
    localStorage.setItem(STORAGE_KEYS.ANALYSIS_RECORDS, JSON.stringify(records));
    return record;
  } catch(e) {
    console.error('[Storage] saveAnalysisRecord error:', e);
    return null;
  }
}

function getAnalysisRecords(limit = 20) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ANALYSIS_RECORDS);
    const records = raw ? JSON.parse(raw) : [];
    return records.slice(0, limit);
  } catch(e) {
    console.error('[Storage] getAnalysisRecords error:', e);
    return [];
  }
}

// ===== 训练洞察 =====

function getTrainingInsights() {
  const logs = getGymLogs();
  const analyses = getAnalysisRecords();
  const profile = getProfile();
  
  // 计算最近7天的趋势
  const last7days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayLogs = logs.filter(l => new Date(l.createdAt).toDateString() === d.toDateString());
    const dayAnalyses = analyses.filter(a => new Date(a.createdAt).toDateString() === d.toDateString());
    last7days.push({
      date: d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      sends: dayLogs.filter(l => l.result === 'send').length,
      attempts: dayLogs.length,
      avgScore: dayAnalyses.length ? (dayAnalyses.reduce((s, a) => s + (a.overallScore||0), 0) / dayAnalyses.length) : null
    });
  }
  
  // 动作弱点分析
  const moveIssues = {};
  (analyses||[]).forEach(a => {
    (a.stepScores||[]).forEach(step => {
      if (step.issue) {
        // 简单提取关键词
        const keywords = ['核心', '换脚', '肩部', '手指', '柔韧', '平衡', '发力'];
        keywords.forEach(kw => {
          if (step.issue.includes(kw)) {
            moveIssues[kw] = (moveIssues[kw]||0) + 1;
          }
        });
      }
    });
  });
  
  // 排序弱点
  const topWeaknesses = Object.entries(moveIssues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([kw, count]) => ({ keyword: kw, count, priority: count > 2 ? 'high' : 'medium' }));
  
  return {
    weeklyTrend: last7days,
    topWeaknesses,
    totalAnalyses: analyses.length,
    avgScore: analyses.length ? (analyses.reduce((s, a) => s + (a.overallScore||0), 0) / analyses.length) : null,
    weeklyImprovement: computeWeeklyImprovement(analyses),
    pullUp: profile.pullUp || 10,
    climbingFrequency: profile.climbingFrequency || 2
  };
}

function computeWeeklyImprovement(analyses) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
  
  const thisWeek = analyses.filter(a => {
    const t = new Date(a.createdAt).getTime();
    return t >= weekAgo;
  });
  const lastWeek = analyses.filter(a => {
    const t = new Date(a.createdAt).getTime();
    return t >= twoWeeksAgo && t < weekAgo;
  });
  
  const avgThis = thisWeek.length ? thisWeek.reduce((s, a) => s + (a.overallScore||0), 0) / thisWeek.length : null;
  const avgLast = lastWeek.length ? lastWeek.reduce((s, a) => s + (a.overallScore||0), 0) / lastWeek.length : null;
  
  if (!avgThis || !avgLast) return null;
  const diff = avgThis - avgLast;
  return {
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
    diff: Math.abs(diff).toFixed(1),
    label: diff > 0 ? '↑ 进步中' : diff < 0 ? '↓ 需加强' : '→ 保持'
  };
}

// ===== 导出模块 =====

window.ClimbStorage = {
  getProfile,
  saveProfile,
  updateProfile,
  getRouteCards,
  saveRouteCard,
  getRouteCard,
  deleteRouteCard,
  getRouteCardsByGym,
  getGyms,
  saveGym,
  getGym,
  getGymLogs,
  saveGymLog,
  getLogsByGym,
  getTodayLog,
  getTrainingStats,
  saveAnalysisRecord,
  getAnalysisRecords,
  getTrainingInsights,
  exportAllData,
  clearAllData,
  STORAGE_KEYS
};
