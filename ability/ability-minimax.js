/**
 * ClimbWise 能力评分 - MiniMax AI 技术评估模块
 * ==============================================
 *
 * 通过 MiniMax API 评估用户爬线技术质量
 * 传入：线路难度、风格、尝试次数、完攀时间
 * 返回：技术评分(1-10) + 改进建议
 */

(function() {
  'use strict';

  const API_KEY = 'sk-api-MMVY9mYpedvYoP76eT9hCsJh5lkPQXH-e7qk2jR-kN6hMm3VKmEK2wYuO3-2NhUXmv-ULeo3-o0yUd7Tj44sS9kzzxwwnYZohrHY7lfjXBTU2bFkDY0cBaE';
  const API_BASE = 'https://api.minimax.chat/v1/text/chatcompletion_pro';

  const STYLE_LABELS = {
    roof: '屋檐',
    balance: '平衡',
    power: '力量',
    endurance: '耐力',
    technical: '技术',
    slab: 'Slab',
    overhang: '仰角'
  };

  function gradeToNum(g) {
    if (!g) return 0;
    const m = String(g).match(/V(\d+)/);
    return m ? parseInt(m[1]) : 0;
  }

  function buildPrompt(log) {
    const grade = log.grade || '未知';
    const style = STYLE_LABELS[log.style] || log.style || '技术';
    const attempts = log.attempts || 1;
    const climbTime = log.climbTime ? Math.round(log.climbTime / 60) + '分钟' : '未知';
    const result = log.result === 'flash' ? '首攀完攀' : '完攀';

    return `用户完成了一条难度为 ${grade} 的${style}风格攀岩线路。
结果：${result}
尝试次数：${attempts}次
完攀时间：${climbTime}

请评估用户的技术表现，给出：
1. 技术评分（1-10整数）
2. 简短改进建议（20字以内，用中文）

请严格按以下JSON格式返回（只返回JSON，不要其他文字）：
{"score":8,"suggestion":"加强核心力量，提高重心转移效率"}`;
  }

  async function evaluateLog(log) {
    if (!window.ClimbAbility) return;
    const logId = log.id || log.createdAt;
    const existing = window.ClimbAbility.getTechEvaluation(logId);
    if (existing) return existing;

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'MiniMax-Text-01',
          tokens_to_generate: 256,
          bot_setting: [{
            bot_name: 'ClimbWise教练',
            content: '你是一个专业攀岩教练，根据用户提供的数据评估攀爬技术。'
          }],
          reply_constraints: {
            role: 'assistant',
            sender_type: 'BOT',
            sender_name: 'ClimbWise教练'
          },
          messages: [{
            sender_type: 'USER',
            sender_name: '用户',
            role: 'user',
            content: buildPrompt(log)
          }]
        })
      });

      const data = await response.json();
      let reply = data.reply || '';
      const jsonMatch = reply.match(/\{[^{}]*"score"\s*:\s*\d+[^{}]*\}/);
      let evaluation = { score: 6, suggestion: '继续加油！' };

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          evaluation = {
            score: Math.min(10, Math.max(1, parseInt(parsed.score) || 6)),
            suggestion: parsed.suggestion || '继续加油！'
          };
        } catch(e) {
          console.warn('[AbilityMiniMax] JSON parse failed:', e);
        }
      }

      window.ClimbAbility.saveTechEvaluation(logId, evaluation);
      return evaluation;
    } catch(e) {
      console.error('[AbilityMiniMax] API error:', e);
      const fallback = { score: 6, suggestion: '网络错误，请检查连接' };
      window.ClimbAbility.saveTechEvaluation(logId, fallback);
      return fallback;
    }
  }

  async function batchEvaluate(logs) {
    const toEval = logs.filter(l =>
      (l.result === 'send' || l.result === 'flash') &&
      !window.ClimbAbility.getTechEvaluation(l.id || l.createdAt)
    );
    const results = [];
    for (const log of toEval) {
      const r = await evaluateLog(log);
      results.push(r);
    }
    return results;
  }

  window.ClimbAbilityMiniMax = { evaluateLog, batchEvaluate };

})();
