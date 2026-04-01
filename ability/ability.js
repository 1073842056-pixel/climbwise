/**
 * ClimbWise 能力评分 - 核心算法模块
 * ================================
 *
 * 基于4个维度计算用户攀岩能力：
 * - 技术质量（30%）：AI评估 + 历史数据
 * - 难度等级（25%）：加权平均难度 + PR
 * - 频率坚持（20%）：训练频率 + 伤病恢复
 * - 风格适应（25%）：线路风格多样性
 */

(function() {
  'use strict';

  // ===== 配置 =====
  const LAMBDA = 0.05;        // 指数衰减系数
  const MAX_DAYS = 90;         // 数据窗口天数
  const STYLE_LIST = ['roof','balance','power','endurance','technical','slab','overhang'];

  // ===== 工具函数 =====
  function f(n) { return Math.min(10, Math.max(0, n)).toFixed(1) * 1; }
  function daysAgo(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.max(0, Math.floor((now - d)) / 86400000);
  }
  function weight(days) { return Math.exp(-LAMBDA * days); }
  function gradeToNum(g) {
    if (!g) return 0;
    const m = String(g).match(/V(\d+)/);
    return m ? parseInt(m[1]) : 0;
  }

  // ===== 存储适配器 =====
  const AS_KEY = 'climb_ability_v2';
  const AS_EVAL_KEY = 'climb_tech_evals';

  function getASData() {
    try { return JSON.parse(localStorage.getItem(AS_KEY) || '{}'); } catch { return {}; }
  }
  function saveASData(d) { localStorage.setItem(AS_KEY, JSON.stringify(d)); }

  function getTechEvals() {
    try { return JSON.parse(localStorage.getItem(AS_EVAL_KEY) || '{}'); } catch { return {}; }
  }
  function saveTechEvals(d) { localStorage.setItem(AS_EVAL_KEY, JSON.stringify(d)); }

  // ===== 四个维度计算 =====

  // 技术质量（0-10）
  function getTechScore(logs) {
    const evals = getTechEvals();
    const scored = logs.filter(l => evals[l.id || l.createdAt]);
    if (scored.length === 0) return 6.5; // 默认中等
    let total = 0, wsum = 0;
    scored.forEach(l => {
      const days = daysAgo(l.date || l.createdAt);
      const w = weight(days);
      total += (evals[l.id || l.createdAt].score || 6) * w;
      wsum += w;
    });
    return wsum > 0 ? total / wsum : 6.5;
  }

  // 难度等级（0-10）
  function getDifficultyScore(logs) {
    const sent = logs.filter(l => l.result === 'send' || l.result === 'flash');
    if (sent.length === 0) return 0;
    let total = 0, wsum = 0;
    sent.forEach(l => {
      const days = daysAgo(l.date || l.createdAt);
      const w = weight(days);
      const grade = gradeToNum(l.grade);
      let score = grade;
      // 首次完攀加成
      if (l.firstSend) score += 0.2;
      // 多次尝试惩罚
      if ((l.attempts || 1) > 5) score -= 0.1;
      total += Math.max(0, score) * w;
      wsum += w;
    });
    // 伤病恢复期权重降低
    const injuryLogs = logs.filter(l => l.injury);
    if (injuryLogs.length > 0) {
      let iwsum = 0;
      injuryLogs.forEach(l => { iwsum += weight(daysAgo(l.date || l.createdAt)) * 0.4; });
      wsum -= iwsum;
    }
    return wsum > 0 ? total / wsum : 0;
  }

  // 频率坚持（0-10）
  function getFrequencyScore(logs) {
    if (logs.length === 0) return 0;
    // 近30天活跃度
    const recent = logs.filter(l => daysAgo(l.date || l.createdAt) <= 30);
    const freq = recent.length; // 近30天爬线次数
    const freqScore = Math.min(10, freq * 0.8); // 每4次≈1分
    // 坚持度：历史记录月份跨度
    const months = new Set(logs.map(l => {
      const d = new Date(l.date || l.createdAt);
      return d.getFullYear() * 12 + d.getMonth();
    }));
    const span = months.size;
    const spanScore = Math.min(10, span * 1.5); // 每月0-10
    return (freqScore * 0.6 + spanScore * 0.4);
  }

  // 风格适应（0-10）
  function getStyleScore(logs) {
    const sent = logs.filter(l => l.result === 'send' || l.result === 'flash');
    if (sent.length === 0) return 0;
    const styleCount = {};
    sent.forEach(l => {
      const s = l.style || 'technical';
      styleCount[s] = (styleCount[s] || 0) + 1;
    });
    const unique = Object.keys(styleCount).length;
    // 风格多样性得分（7种风格，最高7分）
    const divScore = unique / 7 * 7;
    // 主导风格占比（占比越低越均衡越好）
    const dominant = Math.max(...Object.values(styleCount)) / sent.length;
    const balanceScore = (1 - dominant) * 3; // 0-3
    return Math.min(10, divScore + balanceScore);
  }

  // ===== 能力报告 =====
  function getAbilityReport() {
    const logs = (window.ClimbStorage && window.ClimbStorage.getGymLogs) ? window.ClimbStorage.getGymLogs() : [];
    const tech = f(getTechScore(logs));
    const difficulty = f(getDifficultyScore(logs));
    const frequency = f(getFrequencyScore(logs));
    const style = f(getStyleScore(logs));
    const total = f(tech * 0.30 + difficulty * 0.25 + frequency * 0.20 + style * 0.25);

    // 风格分布
    const sent = logs.filter(l => l.result === 'send' || l.result === 'flash');
    const styleBreakdown = {};
    if (sent.length > 0) {
      sent.forEach(l => {
        const s = l.style || 'technical';
        if (!styleBreakdown[s]) styleBreakdown[s] = { count: 0, totalGrade: 0 };
        styleBreakdown[s].count++;
        styleBreakdown[s].totalGrade += gradeToNum(l.grade);
      });
      Object.keys(styleBreakdown).forEach(s => {
        styleBreakdown[s] = styleBreakdown[s].totalGrade / styleBreakdown[s].count;
      });
    }

    // 近4周趋势
    const trend = [];
    for (let w = 3; w >= 0; w--) {
      const cutoff = 7 * (w + 1);
      const start = 7 * w;
      const weekLogs = logs.filter(l => {
        const d = daysAgo(l.date || l.createdAt);
        return d <= cutoff && d > start;
      });
      const weekSent = weekLogs.filter(l => l.result === 'send' || l.result === 'flash');
      const weekSentCount = weekSent.length;
      let weekScore = 0;
      if (weekSentCount > 0) {
        let t = 0, wsum = 0;
        weekSent.forEach(l => {
          const w2 = 1; // 同周期内权重相同
          t += gradeToNum(l.grade) * w2; wsum += w2;
        });
        weekScore = wsum > 0 ? t / wsum : 0;
      } else if (weekLogs.length > 0) {
        weekScore = 3;
      }
      const labels = ['3周前','2周前','上周','本周'];
      trend.push({ label: labels[3-w], score: weekScore, sendCount: weekSentCount });
    }

    return {
      total, tech, difficulty, frequency, style,
      styleBreakdown, trend,
      sentLogs: logs.filter(l => l.result === 'send' || l.result === 'flash').length,
      totalLogs: logs.length
    };
  }

  // ===== 存储AI评估结果 =====
  function saveTechEvaluation(logId, evaluation) {
    const evals = getTechEvals();
    evals[logId] = evaluation;
    saveTechEvals(evals);
  }

  function getTechEvaluation(logId) {
    return getTechEvals()[logId];
  }

  // ===== 导出 =====
  window.ClimbAbility = {
    getAbilityReport,
    saveTechEvaluation,
    getTechEvaluation,
    STYLE_LIST
  };

})();
