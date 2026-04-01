/**
 * ClimbWise 能力评分 - UI 渲染模块
 * =================================
 *
 * 负责在个人中心页面渲染能力评分相关 UI
 */

(function() {
  'use strict';

  function $(s) { return document.querySelector(s); }
  function f(n) { return Math.min(10, Math.max(0, n)).toFixed(1); }

  function getAbilityLevel(score) {
    if (score >= 9) return { label: '段位王者', color: '#FFD700' };
    if (score >= 8) return { label: '资深老手', color: '#FF6B35' };
    if (score >= 7) return { label: '进阶岩友', color: '#F97316' };
    if (score >= 6) return { label: '稳步提升', color: '#4ecdc4' };
    if (score >= 5) return { label: '初露锋芒', color: '#60a5fa' };
    if (score >= 4) return { label: '蓄势待发', color: '#a78bfa' };
    if (score > 0) return { label: '萌新起步', color: '#6B7280' };
    return { label: '暂无数据', color: '#6B7280' };
  }

  function scoreColor(score) {
    if (score >= 8) return '#FF6B35';
    if (score >= 6) return '#4ecdc4';
    if (score >= 4) return '#60a5fa';
    return '#6B7280';
  }

  // 更新能力总览 DOM
  function updateAbilityOverview(report) {
    const { total, tech, difficulty, frequency, style } = report;
    const level = getAbilityLevel(total);

    const totalNum = $('#ability-total-num');
    if (totalNum) {
      totalNum.textContent = total > 0 ? f(total) : '—';
      totalNum.style.color = scoreColor(total);
    }

    const badge = $('#ability-level-badge');
    if (badge) {
      badge.textContent = level.label;
      badge.style.background = level.color + '22';
      badge.style.color = level.color;
      badge.style.border = `1px solid ${level.color}44`;
    }

    updateDimCard('tech', tech);
    updateDimCard('diff', difficulty);
    updateDimCard('freq', frequency);
    updateDimCard('style', style);

    const sentEl = $('#stat-sends');
    const totalEl = $('#stat-total');
    const weekEl = $('#stat-week-sends');
    if (sentEl) sentEl.textContent = report.sentLogs || 0;
    if (totalEl) totalEl.textContent = report.totalLogs || 0;
    if (weekEl) {
      const lastWeek = report.trend?.[report.trend.length - 1];
      weekEl.textContent = lastWeek?.sendCount || 0;
    }

    window.__latestStyleBreakdown = report.styleBreakdown || {};
  }

  function updateDimCard(dim, score) {
    const scoreEl = $(`#dim-${dim}-score`);
    const barEl = $(`#dim-${dim}-bar`);
    const color = scoreColor(score);
    if (scoreEl) {
      scoreEl.textContent = score > 0 ? f(score) : '—';
      scoreEl.style.color = color;
    }
    if (barEl) {
      barEl.style.width = (score > 0 ? score * 10 : 0) + '%';
      barEl.style.background = color;
    }
  }

  // 渲染趋势柱状图
  function renderTrendChart(trend, containerId) {
    const container = $(`#${containerId}`);
    if (!container || !trend) return;

    let html = '<div class="trend-chart">';
    html += '<div class="trend-y-labels"><span>10</span><span>5</span><span>0</span></div>';
    html += '<div class="trend-bars">';

    trend.forEach((week, i) => {
      const heightPct = week.score > 0 ? (week.score / 10) * 100 : 0;
      const isLatest = i === trend.length - 1;
      const color = isLatest ? '#FF6B35' : '#4ecdc4';
      html += `
        <div class="trend-bar-wrap">
          <div class="trend-val-label" style="color:${color};">${week.score > 0 ? f(week.score) : '—'}</div>
          <div class="trend-bar-container" style="height:100px;">
            <div class="trend-bar" style="height:${heightPct}%;background:${color};opacity:${isLatest ? 1 : 0.7};"></div>
          </div>
          <div class="trend-bar-label">${week.label}</div>
          <div class="trend-bar-sends">${week.sendCount}条</div>
        </div>
      `;
    });

    html += '</div></div>';
    container.innerHTML = html;
  }

  // 渲染风格雷达图
  function renderStyleRadar(styleBreakdown, containerId) {
    const container = $(`#${containerId}`);
    if (!container || !styleBreakdown) return;

    const styles = Object.keys(styleBreakdown);
    if (styles.length === 0) { container.innerHTML = ''; return; }

    const styleLabels = {
      roof: '屋檐', balance: '平衡', power: '力量',
      endurance: '耐力', technical: '技术', slab: 'Slab', overhang: '仰角'
    };

    const values = styles.map(s => Math.min(10, Math.max(0, styleBreakdown[s])));
    const labels = styles.map(s => styleLabels[s] || s);

    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 260;
    canvas.style.width = '100%';
    canvas.style.maxWidth = '280px';
    canvas.style.margin = '0 auto';
    canvas.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(canvas);

    drawRadarChart(canvas, labels, values, 10);
  }

  function drawRadarChart(canvas, labels, values, maxVal) {
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 10;
    const radius = Math.min(cx, cy) - 50;
    const n = labels.length;
    const angleStep = (2 * Math.PI) / n;

    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    for (let r = 1; r <= 5; r++) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const dist = (r / 5) * radius;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const dist = (values[i] / maxVal) * radius;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(78, 205, 196, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 107, 53, 0.15)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const dist = (values[i] / maxVal) * radius;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#FF6B35';
      ctx.fill();
    }

    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const labelDist = radius + 22;
      const x = cx + Math.cos(angle) * labelDist;
      const y = cy + Math.sin(angle) * labelDist;
      ctx.fillStyle = '#888';
      ctx.fillText(labels[i], x, y);
      ctx.fillStyle = '#FF6B35';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.fillText(f(values[i]), x, y + 14);
      ctx.font = '12px -apple-system, sans-serif';
      ctx.fillStyle = '#888';
    }
  }

  // 主入口：更新个人中心能力区域
  function updateProfileAbilitySection() {
    if (!window.ClimbAbility) return;
    try {
      const report = window.ClimbAbility.getAbilityReport();
      updateAbilityOverview(report);
      renderTrendChart(report.trend, 'ability-trend-section');
      renderStyleRadar(window.__latestStyleBreakdown || report.styleBreakdown, 'ability-radar-section');
    } catch (e) {
      console.error('[AbilityUI] update error:', e);
    }
  }

  window.ClimbAbilityUI = {
    updateAbilityOverview,
    renderTrendChart,
    renderStyleRadar,
    updateProfileAbilitySection,
    getAbilityLevel
  };

})();
