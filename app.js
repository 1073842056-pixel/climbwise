/**
 * ClimbWise v5 - 主应用
 * 4-Tab：读线 / 赏线 / 训练 / 我的
 * 白底主题 + 攀岩知识库
 */

(function() {
  'use strict';

  let currentPage = 'read';
  let selectedColor = null;
  let photoDataUrl = null;
  let analysisResult = null;
  let stickman = null;
  let currentFrame = 0;
  let videoDataUrl = null;
  let currentReviewResult = null;
  let currentClassifyVideo = null;
  let unclassifiedVideos = [];
  let currentCalDate = new Date();

  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  // ==================== 初始化 ====================
  function init() {
    initNav();
    initReadPage();
    initReviewPage();
    initTrainPage();
    initProfilePage();
    loadProfileData();
    updateTrainSummary();
    updateCalendar();
    updateGymList();
    updateSavedRoutes();
  }

  // ==================== 导航 ====================
  function initNav() {
    $$('.tab-nav-item').forEach(btn => {
      btn.addEventListener('click', () => switchPage(btn.dataset.page));
    });
  }

  function switchPage(page) {
    currentPage = page;
    $$('.page').forEach(p => p.classList.remove('active'));
    $('#page-' + page).classList.add('active');
    $$('.tab-nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    if (page === 'train') { updateTrainSummary(); updateTrainHistory(); }
    if (page === 'profile') { loadProfileData(); updateCalendar(); updateGymList(); updateSavedRoutes(); }
  }

  // ==================== Tab1: 读线 ====================
  function initReadPage() {
    const photoInput = $('#read-photo-input');
    const uploadZone = $('#read-upload');

    uploadZone.addEventListener('click', () => photoInput.click());
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.style.borderColor = 'var(--orange)'; uploadZone.style.background = 'var(--orange-light)'; });
    uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor = ''; uploadZone.style.background = ''; });
    uploadZone.addEventListener('drop', e => {
      e.preventDefault();
      uploadZone.style.borderColor = '';
      uploadZone.style.background = '';
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) handleReadPhoto(f);
    });
    photoInput.addEventListener('change', () => { if (photoInput.files[0]) handleReadPhoto(photoInput.files[0]); });

    $('#read-clear')?.addEventListener('click', () => { photoDataUrl = null; selectedColor = null; resetReadUI(); });
    $('#read-start-btn')?.addEventListener('click', startReadAnalysis);
    $('#read-back')?.addEventListener('click', resetReadUI);
    $('#read-restart')?.addEventListener('click', resetReadUI);
    $('#save-route-btn')?.addEventListener('click', () => showToast('已保存！'));
    $('#prev-frame')?.addEventListener('click', () => changeFrame(-1));
    $('#next-frame')?.addEventListener('click', () => changeFrame(1));
    $('#frame-slider')?.addEventListener('input', e => { currentFrame = parseInt(e.target.value); stickman?.goTo(currentFrame); updateFrameUI(); });

    initColorGrid($('#color-grid'), color => { selectedColor = color; $('#read-start-btn').disabled = !(photoDataUrl && selectedColor); });
  }

  function handleReadPhoto(file) {
    if (file.size > 10 * 1024 * 1024) { showToast('图片最大10MB'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      photoDataUrl = e.target.result;
      $('#read-preview-img').src = photoDataUrl;
      $('#read-upload').classList.add('hidden');
      $('#read-preview').classList.remove('hidden');
      $('#read-colors').classList.remove('hidden');
      $('#read-start-btn').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  function resetReadUI() {
    photoDataUrl = null; selectedColor = null; analysisResult = null;
    $('#read-result').classList.add('hidden');
    $('#read-preview').classList.add('hidden');
    $('#read-colors').classList.add('hidden');
    $('#read-start-btn').classList.add('hidden');
    $('#read-upload').classList.remove('hidden');
    $$('.color-dot').forEach(d => { d.classList.remove('selected'); d.style.opacity = '0.5'; d.style.transform = ''; });
    $('#read-photo-input').value = '';
    $('#read-start-btn').disabled = true;
  }

  async function startReadAnalysis() {
    if (!photoDataUrl || !selectedColor) return;
    const profile = window.ClimbStorage.getProfile();
    showReadLoading(true);
    updateReadDots(0);
    try {
      updateReadStatus('正在识别手点脚点...', 20);
      const result = await window.ClimbVision.analyzeRoute(photoDataUrl, selectedColor, profile);
      analysisResult = result;
      updateReadDots(1);
      updateReadStatus('正在生成个性化beta...', 55);

      // 知识库增强
      if (window.CLIMBING_KNOWLEDGE) {
        result.enhancedSuggestions = window.CLIMBING_KNOWLEDGE.generateSuggestions({
          reachScore: (result.reachScore || 5) * 10,
          strengthScore: (result.strengthScore || 5) * 10,
          weightScore: (result.weightScore || 5) * 10,
          flexibilityScore: 60
        });
      }

      updateReadDots(2);
      updateReadStatus('正在渲染火柴人动画...', 80);
      await sleep(400);

      window.ClimbStorage.saveRouteCard({
        photo: photoDataUrl, color: selectedColor,
        holds: result.holds, beta: result.beta, frames: result.frames,
        personalScore: result.personalScore, gradeEquivalent: result.subjectiveGrade,
        reachScore: result.reachScore, strengthScore: result.strengthScore,
        weightScore: result.weightScore, suggestions: result.suggestions,
        difficultyPoints: result.difficultyPoints, estimatedAttempts: result.estimatedAttempts
      });

      updateReadStatus('完成！', 100);
      updateReadDots(3);
      await sleep(400);
      showReadResult(result);
    } catch(e) {
      console.error('[Read]', e);
      showToast('分析失败，请重试');
      showReadLoading(false);
      resetReadUI();
    }
  }

  function showReadLoading(show) {
    $('#read-preview').classList.toggle('hidden', show);
    $('#read-colors').classList.toggle('hidden', show);
    $('#read-start-btn').classList.toggle('hidden', show);
    $('#read-loading').classList.toggle('hidden', !show);
    $('#read-result').classList.add('hidden');
  }

  function updateReadStatus(text, pct) {
    $('#read-status').textContent = text;
    const b = $('#read-bar');
    if (b) b.style.width = pct + '%';
  }

  function updateReadDots(step) {
    $$('#read-dots .dot').forEach((d, i) => {
      d.classList.remove('active', 'done');
      if (i < step) d.classList.add('done');
      else if (i === step) d.classList.add('active');
    });
  }

  function showReadResult(result) {
    $('#read-loading').classList.add('hidden');
    $('#read-result').classList.remove('hidden');
    $('#result-wall-img').src = photoDataUrl;
    $('#read-grade-badge').textContent = result.subjectiveGrade || 'V3-4';

    const svgEl = $('#result-stickman-svg');
    const imgEl = $('#result-wall-img');
    stickman = new window.ClimbStickman.StickmanRenderer(svgEl, imgEl);
    stickman.setFrames(result.frames);
    const slider = $('#frame-slider');
    slider.max = result.frames.length - 1;
    slider.value = 0;
    currentFrame = 0;
    stickman.goTo(0);
    updateFrameUI();
    renderBetaCards(result.beta);

    const f = p => Math.min(100, Math.max(0, (p||5) * 10)) + '%';
    const v = p => p ? p.toFixed(1) : '—';
    $('#res-strength').style.width = f(result.strengthScore);
    $('#res-strength-val').textContent = v(result.strengthScore);
    $('#res-reach').style.width = f(result.reachScore);
    $('#res-reach-val').textContent = v(result.reachScore);
    $('#res-overall').style.width = f(result.personalScore);
    $('#res-overall-val').textContent = v(result.personalScore);

    const suggestions = [...(result.enhancedSuggestions||[]), ...(result.suggestions||[])].slice(0, 4);
    $('#suggestions-list').innerHTML = suggestions.map(s => `<li style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;line-height:1.5;">• ${s}</li>`).join('');
    showToast('读线完成！');
  }

  function renderBetaCards(beta) {
    const container = $('#beta-cards');
    if (!container) return;
    container.innerHTML = '';
    (beta||[]).forEach((step, i) => {
      const div = document.createElement('div');
      div.className = 'beta-card';
      div.style.borderLeftColor = i === currentFrame ? 'var(--orange)' : 'var(--border)';
      div.innerHTML = `<div class="step">🔥 Beta ${step.step||i+1}</div><div class="desc">${step.description}</div><div class="tip">💡 ${step.keyPoint||''}</div>`;
      div.addEventListener('click', () => { currentFrame = i; stickman?.goTo(i); updateFrameUI(); renderBetaCards(beta); });
      container.appendChild(div);
    });
  }

  function updateFrameUI() {
    const slider = $('#frame-slider');
    const frameCount = analysisResult?.frames?.length || 1;
    slider.value = currentFrame;
    $('#frame-counter').textContent = `${currentFrame+1}/${frameCount}`;
  }

  function changeFrame(dir) {
    const max = (analysisResult?.frames?.length||1) - 1;
    const next = Math.max(0, Math.min(max, currentFrame + dir));
    if (next !== currentFrame) {
      currentFrame = next;
      stickman?.goTo(currentFrame);
      updateFrameUI();
      renderBetaCards(analysisResult?.beta);
    }
  }

  // ==================== Tab2: 赏线 ====================
  function initReviewPage() {
    const videoInput = $('#review-video-input');
    const uploadZone = $('#review-upload');

    uploadZone.addEventListener('click', () => videoInput.click());
    videoInput.addEventListener('change', () => { const f = videoInput.files[0]; if (f) handleReviewVideo(f); });
    $('#review-clear')?.addEventListener('click', () => {
      if (videoDataUrl) URL.revokeObjectURL(videoDataUrl);
      videoDataUrl = null;
      $('#review-preview').classList.add('hidden');
      $('#review-upload').classList.remove('hidden');
      $('#review-link-section').classList.add('hidden');
      $('#review-start-btn').classList.add('hidden');
      videoInput.value = '';
    });
    $('#review-start-btn')?.addEventListener('click', startReviewAnalysis);
    $('#review-back')?.addEventListener('click', () => { if (videoDataUrl) URL.revokeObjectURL(videoDataUrl); videoDataUrl = null; currentReviewResult = null; $('#review-result').classList.add('hidden'); $('#review-preview').classList.add('hidden'); $('#review-upload').classList.remove('hidden'); $('#review-link-section').classList.add('hidden'); $('#review-start-btn').classList.add('hidden'); populateReviewRouteSelect(); });
    $('#review-restart')?.addEventListener('click', () => { $('#review-back')?.click(); });
    $('#save-review-btn')?.addEventListener('click', () => {
      if (currentReviewResult) {
        const linkId = $('#review-route-select')?.value;
        const savedBeta = linkId ? window.ClimbStorage.getRouteCard(linkId) : null;
        window.ClimbStorage.saveAnalysisRecord({
          ...currentReviewResult,
          linkedRouteId: linkId || null,
          linkedRoute: savedBeta ? { color: savedBeta.color, grade: savedBeta.gradeEquivalent } : null
        });
        showToast('分析已保存！');
      }
      $('#review-back')?.click();
    });
    populateReviewRouteSelect();
  }

  function handleReviewVideo(file) {
    if (file.size > 100*1024*1024) { showToast('视频最大100MB'); return; }
    videoDataUrl = URL.createObjectURL(file);
    $('#review-video-el').src = videoDataUrl;
    $('#review-upload').classList.add('hidden');
    $('#review-preview').classList.remove('hidden');
    $('#review-link-section').classList.remove('hidden');
    $('#review-start-btn').classList.remove('hidden');
    $('#review-start-btn').disabled = false;
  }

  function populateReviewRouteSelect() {
    const select = $('#review-route-select');
    if (!select) return;
    const cards = window.ClimbStorage.getRouteCards();
    select.innerHTML = '<option value="">— 不关联线路 —</option>' + cards.map(c => `<option value="${c.id}">${c.color}线路 · ${c.gradeEquivalent||''}</option>`).join('');
  }

  async function startReviewAnalysis() {
    if (!videoDataUrl) return;
    showReviewLoading(true);
    updateReviewDots(0);
    try {
      updateReviewStatus('正在提取视频帧...', 15);
      const frames = await window.ClimbVideoAnalysis.extractFrames(videoDataUrl, 8);
      updateReviewDots(1);
      updateReviewStatus('正在识别有效片段...', 30);
      const segment = await window.ClimbVideoAnalysis.detectClimbingSegment(videoDataUrl);
      const linkId = $('#review-route-select')?.value;
      const savedBeta = linkId ? window.ClimbStorage.getRouteCard(linkId) : null;
      updateReviewDots(2);
      updateReviewStatus('正在分析动作质量...', 50);
      const profile = window.ClimbStorage.getProfile();
      const result = await window.ClimbVideoAnalysis.analyzeClimbingAction(frames, savedBeta, profile);
      result.segment = segment;
      result.frames = frames;
      currentReviewResult = result;
      updateReviewDots(3);
      updateReviewStatus('正在生成报告...', 80);
      await sleep(400);
      updateReviewDots(4);
      showReviewResult(result);
    } catch(e) {
      console.error('[Review]', e);
      showToast('分析失败，请重试');
      showReviewLoading(false);
    }
  }

  function showReviewLoading(show) {
    $('#review-preview').classList.toggle('hidden', show);
    $('#review-start-btn').classList.toggle('hidden', show);
    $('#review-link-section').classList.toggle('hidden', show);
    $('#review-loading').classList.toggle('hidden', !show);
    $('#review-result').classList.add('hidden');
  }

  function updateReviewStatus(text, pct) {
    $('#review-status').textContent = text;
    const b = $('#review-bar');
    if (b) b.style.width = pct + '%';
  }

  function updateReviewDots(step) {
    $$('#review-dots .dot').forEach((d, i) => {
      d.classList.remove('active', 'done');
      if (i < step) d.classList.add('done');
      else if (i === step) d.classList.add('active');
    });
  }

  function showReviewResult(result) {
    $('#review-loading').classList.add('hidden');
    $('#review-result').classList.remove('hidden');
    const score = result.overallScore || 7.0;
    $('#review-score-badge').textContent = score.toFixed(1) + '分';
    $('#overall-score-circle').textContent = score.toFixed(1);
    $('#beta-match-rate').textContent = result.betaMatchRate || '—';
    if (result.detectedBeta) $('#detected-beta-text').textContent = `你走的是 ${result.detectedBeta}`;

    renderFrameTimeline(result.frames||[]);

    const issuesEl = $('#review-issues');
    if (result.mainIssues?.length) {
      issuesEl.innerHTML = result.mainIssues.map(issue => `<div class="issue-card"><span class="icon">⚠️</span><p>${issue}</p></div>`).join('');
    } else {
      issuesEl.innerHTML = '<p style="font-size:14px;color:var(--text-secondary);padding:8px 0;">动作整体不错！</p>';
    }

    $('#review-improvements').innerHTML = (result.improvements||[]).map(s => `<li style="font-size:13px;color:var(--text-secondary);margin-bottom:6px;line-height:1.5;">• ${s}</li>`).join('');

    // 识别到的动作类型
    const movesEl = $('#detected-moves');
    if (result.detectedMoves?.length) {
      if (!movesEl) {
        const movesDiv = document.createElement('div');
        movesDiv.id = 'detected-moves';
        movesDiv.className = 'card';
        movesDiv.style.marginBottom = '14px';
        movesDiv.innerHTML = `<p style="font-size:13px;font-weight:600;margin-bottom:10px;">🔍 识别到的动作</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${result.detectedMoves.map(m => `<span style="font-size:13px;padding:4px 12px;background:var(--orange-light);color:var(--orange);border-radius:100px;font-weight:600;">${m}</span>`).join('')}
          </div>`;
        $('#review-result .app-content')?.insertBefore(movesDiv, $('#review-result .card'));
      }
    }
    
    // 训练计划
    if (result.trainingPlan?.length) {
      const planEl = $('#training-plan');
      if (!planEl) {
        const planDiv = document.createElement('div');
        planDiv.id = 'training-plan';
        planDiv.className = 'card';
        planDiv.style.marginBottom = '14px';
        planDiv.innerHTML = `<p style="font-size:13px;font-weight:600;margin-bottom:10px;">📋 训练计划</p>
          <ul style="list-style:none;padding:0;">
            ${result.trainingPlan.map(t => `<li style="font-size:13px;color:var(--text-secondary);margin-bottom:6px;line-height:1.5;">📌 ${t}</li>`).join('')}
          </ul>`;
        $('#review-result .app-content')?.appendChild(planDiv);
      }
    }
    
    // Beta对比（当关联了线路时）
    const linkId = $('#review-route-select')?.value;
    if (linkId && savedBeta) {
      const compareEl = $('#beta-compare');
      if (!compareEl) {
        const compareDiv = document.createElement('div');
        compareDiv.id = 'beta-compare';
        compareDiv.className = 'card';
        compareDiv.style.marginBottom = '14px';
        const optimalMoves = (savedBeta.beta||[]).map(b => b.moveType||'').filter(Boolean);
        const userMoves = (result.stepScores||[]).map(s => s.moveType||'').filter(Boolean);
        const matchRate = savedBeta.beta?.length ? Math.round(userMoves.filter(m => optimalMoves.includes(m).length / optimalMoves.length * 100) : 0;
        compareDiv.innerHTML = `
          <p style="font-size:13px;font-weight:600;margin-bottom:12px;">⚖️ Beta对比</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
            <div style="background:var(--bg-secondary);padding:12px;border-radius:10px;text-align:center;">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">你的Beta</div>
              <div style="font-size:13px;font-weight:700;color:var(--orange);">${userMoves.slice(0,3).join(' → ') || '—'}</div>
            </div>
            <div style="background:var(--bg-secondary);padding:12px;border-radius:10px;text-align:center;">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">最优Beta</div>
              <div style="font-size:13px;font-weight:700;color:var(--cyan);">${optimalMoves.slice(0,3).join(' → ') || '—'}</div>
            </div>
          </div>
          <div style="text-align:center;padding:8px;background:var(--orange-light);border-radius:10px;">
            <span style="font-size:13px;color:var(--orange);font-weight:700;">匹配度 ${result.betaMatchRate||'—'}</span>
          </div>
        `;
        $('#review-result .app-content')?.insertBefore(compareDiv, $('#review-result .card'));
      }
    }

    $('#step-scores').innerHTML = (result.stepScores||[]).map(step => {
      const color = step.score >= 8 ? 'var(--cyan)' : step.score >= 6 ? 'var(--orange)' : '#ef4444';
      return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <span style="font-size:12px;color:var(--text-secondary);width:60px;flex-shrink:0;">第${step.step}步</span>
        <div style="flex:1;height:8px;background:var(--wall);border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${(step.score||5)*10}%;background:${color};border-radius:4px;"></div>
        </div>
        <span style="font-size:13px;font-weight:700;width:36px;text-align:right;">${(step.score||5).toFixed(1)}</span>
      </div>`;
    }).join('');
    showToast('赏线完成！');
  }

  function renderFrameTimeline(frames) {
    const container = $('#frame-timeline');
    if (!container) return;
    container.innerHTML = '';
    (frames||[]).slice(0,5).forEach((f, i) => {
      const div = document.createElement('div');
      div.className = 'frame-thumb' + (i===0?' active':'');
      div.innerHTML = `<img src="${f}" alt="帧${i+1}">`;
      div.addEventListener('click', () => { $$('.frame-thumb').forEach(t => t.classList.remove('active')); div.classList.add('active'); });
      container.appendChild(div);
    });
  }

  // ==================== Tab3: 训练 ====================
  function initTrainPage() {
    const videoInput = $('#train-video-input');
    const uploadZone = $('#train-upload');

    uploadZone.addEventListener('click', () => videoInput.click());
    videoInput.addEventListener('change', () => {
      Array.from(videoInput.files).filter(f => f.type.startsWith('video/')).forEach(f => {
        unclassifiedVideos.push({ url: URL.createObjectURL(f), blob: f, name: f.name });
      });
      renderUnclassifiedList();
    });
    $('#add-train-btn')?.addEventListener('click', () => videoInput.click());
    $('#cancel-classify-btn')?.addEventListener('click', hideClassifyModal);
    $('#confirm-classify-btn')?.addEventListener('click', confirmClassify);

    $$('.select-pill[data-result]').forEach(btn => {
      btn.addEventListener('click', () => { $$('.select-pill[data-result]').forEach(b => b.classList.remove('selected')); btn.classList.add('selected'); });
    });

    initColorGrid($('#classify-colors'), () => {});
  }

  window.openClassifyModal = function(index) {
    currentClassifyVideo = unclassifiedVideos[index];
    if (!currentClassifyVideo) return;
    $('#classify-video-el').src = currentClassifyVideo.url;
    $$('.select-pill[data-result]').forEach(b => b.classList.remove('selected'));
    $('#classify-grade').value = '';
    $('#classify-gym').value = '';
    $('#classify-modal').classList.add('show');
  };

  function hideClassifyModal() { $('#classify-modal').classList.remove('show'); currentClassifyVideo = null; }

  function confirmClassify() {
    if (!currentClassifyVideo) return;
    const selectedResult = $('.select-pill[data-result].selected')?.dataset.result;
    const grade = $('#classify-grade')?.value;
    const gymName = $('#classify-gym')?.value?.trim();
    let gym = null;
    if (gymName) { gym = window.ClimbStorage.getGyms().find(g => g.name === gymName); if (!gym) gym = window.ClimbStorage.saveGym({ name: gymName }); }
    window.ClimbStorage.saveGymLog({
      gymId: gym?.id||'', gymName: gymName||'未知岩馆', routeName: '', type: 'boulder',
      grade: grade||'V?', result: selectedResult||'attempt', photo: null, notes: '',
      attempts: selectedResult==='send'?1:3, videoUrl: currentClassifyVideo.url
    });
    const idx = unclassifiedVideos.indexOf(currentClassifyVideo);
    if (idx >= 0) unclassifiedVideos.splice(idx, 1);
    hideClassifyModal();
    renderUnclassifiedList();
    updateTrainSummary();
    updateTrainHistory();
    showToast('归类成功！');
  }

  function renderUnclassifiedList() {
    const container = $('#unclassified-list');
    if (!container) return;
    if (!unclassifiedVideos.length) { container.classList.add('hidden'); return; }
    container.classList.remove('hidden');
    $('#unclassified-count').textContent = unclassifiedVideos.length;
    $('#unclassified-items').innerHTML = unclassifiedVideos.map((v, i) => `
      <div class="log-item">
        <div class="gym-icon">📹</div>
        <div class="info"><h4>${v.name||'视频 '+(i+1)}</h4><p>待归类</p></div>
        <button class="select-pill" style="font-size:12px;padding:6px 12px;border-color:var(--orange);color:var(--orange);" onclick="openClassifyModal(${i})">归类</button>
      </div>`).join('');
  }

  function updateTrainSummary() {
    const today = new Date().toDateString();
    const logs = window.ClimbStorage.getGymLogs().filter(l => new Date(l.createdAt).toDateString() === today);
    if (!logs.length) { $('#today-summary').style.display = 'none'; $('#train-subtitle').textContent = '今日暂无训练记录'; return; }
    $('#train-subtitle').textContent = `今日 ${logs.length} 条记录`;
    $('#today-summary').style.display = 'block';
    const sends = logs.filter(l => l.result === 'send').length;
    const d = new Date();
    $('#today-date').textContent = `${d.getMonth()+1}月${d.getDate()}日`;
    $('#today-gym').textContent = logs[0]?.gymName || '未知岩馆';
    $('#today-count').textContent = sends;
    const grades = [...new Set(logs.map(l => l.grade))].slice(0, 6);
    const colors = { send: '#22c55e', flash: '#eab308', attempt: 'var(--orange)' };
    $('#today-grid').innerHTML = grades.map(g => {
      const count = logs.filter(l => l.grade === g).length;
      const color = colors[logs.find(l => l.grade === g)?.result] || 'var(--text-muted)';
      return `<div class="classify-cell">
        <div class="color-preview" style="background:${color};opacity:0.8;"></div>
        <span class="grade">${g}</span><span class="count">${count}次</span>
      </div>`;
    }).join('');
  }

  function updateTrainHistory() {
    const logs = window.ClimbStorage.getGymLogs();
    const container = $('#train-log-list');
    if (!container) return;
    if (!logs.length) { container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:16px 0;">暂无历史记录</p>'; return; }
    const byDate = {};
    logs.forEach(log => { const d = new Date(log.createdAt).toDateString(); if (!byDate[d]) byDate[d] = []; byDate[d].push(log); });
    container.innerHTML = Object.entries(byDate).slice(0,7).map(([date, dayLogs]) => {
      const d = new Date(date);
      const dateStr = `${d.getMonth()+1}/${d.getDate()}`;
      const count = dayLogs.filter(l => l.result === 'send').length;
      const badge = count > 0 ? `<span class="badge send">${count}完攀</span>` : `<span class="badge attempt">${dayLogs.length}次</span>`;
      return `<div class="log-item">
        <div class="gym-icon">🏔️</div>
        <div class="info"><h4>${dateStr} · ${dayLogs[0]?.gymName||''}</h4><p>${dayLogs.length}条记录</p></div>
        ${badge}
      </div>`;
    }).join('');
  }

  // ==================== Tab4: 我的 ====================
  function initProfilePage() {
    $('#edit-profile-btn')?.addEventListener('click', () => {
      const form = $('#profile-form');
      const isHidden = form.classList.contains('hidden');
      form.classList.toggle('hidden', !isHidden);
      $('#profile-data').classList.toggle('hidden', !isHidden);
      if (isHidden) loadProfileForm();
    });
    $('#save-profile-btn')?.addEventListener('click', () => {
      window.ClimbStorage.updateProfile({
        height: parseInt($('#pf-height')?.value)||175,
        armSpan: parseInt($('#pf-armspan')?.value)||178,
        weight: parseInt($('#pf-weight')?.value)||65,
        pullUp: parseInt($('#pf-pullup')?.value)||10,
        climbingFrequency: 3, sessionDuration: 90
      });
      loadProfileData();
      form.classList.add('hidden');
      $('#profile-data').classList.remove('hidden');
      showToast('档案已保存！');
    });
    $('#cal-prev')?.addEventListener('click', () => { currentCalDate.setMonth(currentCalDate.getMonth()-1); updateCalendar(); });
    $('#cal-next')?.addEventListener('click', () => { currentCalDate.setMonth(currentCalDate.getMonth()+1); updateCalendar(); });
  }

  function loadProfileData() {
    const p = window.ClimbStorage.getProfile();
    $('#profile-physical').textContent = `${p.height}cm / ${p.weight}kg`;
    $('#profile-detail').textContent = `臂展${p.armSpan}cm · 引体${p.pullUp}个`;
    const pullUpScore = Math.min(10, (p.pullUp||5)*0.7+3);
    const coreScore = Math.min(10, pullUpScore*0.9);
    const endurScore = Math.min(10, (p.climbingFrequency||2)*2+4);
    const flexScore = 6.5;
    updateAbilityBar('ab-strength', 'ab-strength-val', pullUpScore);
    updateAbilityBar('ab-core', 'ab-core-val', coreScore);
    updateAbilityBar('ab-endure', 'ab-endure-val', endurScore);
    updateAbilityBar('ab-flex', 'ab-flex-val', flexScore);
  }

  function loadProfileForm() {
    const p = window.ClimbStorage.getProfile();
    if ($('#pf-height')) $('#pf-height').value = p.height||175;
    if ($('#pf-armspan')) $('#pf-armspan').value = p.armSpan||178;
    if ($('#pf-weight')) $('#pf-weight').value = p.weight||65;
    if ($('#pf-pullup')) $('#pf-pullup').value = p.pullUp||10;
  }

  function updateAbilityBar(barId, valId, score) {
    const el = $('#'+barId), vel = $('#'+valId);
    if (el) el.style.width = Math.min(100, Math.max(0, score*10))+'%';
    if (vel) vel.textContent = score.toFixed(1);
  }

  function updateCalendar() {
    const y = currentCalDate.getFullYear();
    const m = currentCalDate.getMonth();
    $('#cal-title').textContent = `${m+1}月 ${y}`;
    const logs = window.ClimbStorage.getGymLogs();
    const grid = $('#cal-grid');
    const firstDay = new Date(y, m, 1).getDay()||7;
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const today = new Date();
    let html = '日 一 二 三 四 五 六'.split(' ').map(d => `<div class="day-label">${d}</div>`).join('');
    for (let i = 1; i < firstDay; i++) html += '<div class="day empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = new Date(y, m, d).toDateString();
      const dayLogs = logs.filter(l => new Date(l.createdAt).toDateString() === dateStr);
      const isToday = today.getDate()===d && today.getMonth()===m && today.getFullYear()===y;
      const dot = dayLogs.length > 0 ? (dayLogs.some(l=>l.result==='send')?'send':dayLogs.some(l=>l.result==='flash')?'flash':'attempt') : null;
      html += `<div class="day${isToday?' active':''}" style="${isToday?'border:2px solid var(--orange);':''}">
        <span>${d}</span>${dot?`<span class="dot ${dot}"></span>`:''}
      </div>`;
    }
    grid.innerHTML = html;
  }

  function updateGymList() {
    const gyms = window.ClimbStorage.getGyms();
    const logs = window.ClimbStorage.getGymLogs();
    const container = $('#gym-list');
    if (!container) return;
    if (!gyms.length) { container.innerHTML = '<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:12px 0;">暂无岩馆记录</p>'; return; }
    container.innerHTML = gyms.map(gym => {
      const gymLogs = logs.filter(l => l.gymId === gym.id);
      const sendCount = gymLogs.filter(l => l.result === 'send').length;
      const lastDate = gymLogs[0] ? new Date(gymLogs[0].createdAt).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'}) : '暂无';
      return `<div class="log-item">
        <div class="gym-icon">🏔️</div>
        <div class="info"><h4>${gym.name}</h4><p>打卡${gymLogs.length}次 · ${sendCount}条完攀</p></div>
        <span style="font-size:12px;color:var(--text-muted);">${lastDate}</span>
      </div>`;
    }).join('');
  }

  function updateSavedRoutes() {
    const cards = window.ClimbStorage.getRouteCards();
    const container = $('#saved-routes');
    if (!container) return;
    if (!cards.length) { container.innerHTML = '<p style="font-size:14px;color:var(--text-muted);text-align:center;padding:20px 0;">暂无保存的线路</p>'; return; }
    container.innerHTML = cards.slice(0,6).map(card => `
      <div class="log-item" style="cursor:pointer;">
        <div class="gym-icon" style="background:var(--wall);overflow:hidden;">
          <img src="${card.photo||''}" style="width:100%;height:100%;object-fit:cover;opacity:0.7;" onerror="this.parentElement.style.background='var(--wall)'">
        </div>
        <div class="info"><h4>${card.color}线路</h4><p>${card.gradeEquivalent||card.difficulty||'—'}</p></div>
        <span class="badge ${(card.personalScore||7)>=7?'send':'attempt'}" style="font-size:11px;padding:3px 8px;">${(card.personalScore||7).toFixed(1)}分</span>
      </div>`).join('');
  }

  // ==================== 通用 ====================

  function initColorGrid(container, onSelect) {
    if (!container) return;
    const colors = [
      { name: '黄色', hex: '#FBBF24' }, { name: '蓝色', hex: '#3B82F6' },
      { name: '绿色', hex: '#22C55E' }, { name: '红色', hex: '#EF4444' },
      { name: '白色', hex: '#F8FAFC' }, { name: '粉色', hex: '#EC4899' },
      { name: '橙色', hex: '#F97316' }, { name: '紫色', hex: '#8B5CF6' },
      { name: '灰色', hex: '#6B7280' }, { name: '黑色', hex: '#1F2937' },
    ];
    container.innerHTML = '';
    colors.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'color-dot';
      btn.dataset.color = c.name;
      btn.style.background = c.hex;
      btn.style.opacity = '0.5';
      btn.addEventListener('click', () => {
        container.querySelectorAll('.color-dot').forEach(d => { d.classList.remove('selected'); d.style.opacity = '0.5'; d.style.transform = ''; });
        btn.classList.add('selected');
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1.2)';
        selectedColor = c.name;
        onSelect(c.name);
      });
      container.appendChild(btn);
    });
  }

  function showToast(msg) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

})();
