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
  let isPlayingBeta = false;
  let playBetaInterval = null;
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
    if (page === 'profile') { loadProfileData(); updateCalendar(); updateGymList(); updateSavedRoutes(); updateTrainingInsights(); }
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
    $('#save-route-btn')?.addEventListener('click', () => {
      if (!analysisResult) return;
      const route = {
        color: selectedColor,
        grade: analysisResult.subjectiveGrade || 'V3',
        gradeEquivalent: analysisResult.overallScore ? window.CLIMBING_KNOWLEDGE.scoreToGrade(analysisResult.overallScore) : 'V3',
        holds: analysisResult.holds || [],
        beta: analysisResult.beta || [],
        frames: analysisResult.frames || [],
        difficultyReason: analysisResult.cruxDescription || analysisResult.difficultyReason || '',
        startDescription: analysisResult.startDescription || '',
        createdAt: new Date().toISOString()
      };
      window.ClimbStorage.saveRouteCard(route);
      showToast('线路已保存！');
    });
    $('#prev-frame')?.addEventListener('click', () => changeFrame(-1));
    $('#next-frame')?.addEventListener('click', () => changeFrame(1));
    $('#frame-slider')?.addEventListener('input', e => { currentFrame = parseInt(e.target.value); stickman?.goTo(currentFrame); updateFrameUI(); renderBetaCards(analysisResult?.beta); });
    $('#play-beta-btn')?.addEventListener('click', togglePlayBeta);

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
    // 清空holds标注
    const holdsSvg = $('#result-holds-svg');
    if (holdsSvg) holdsSvg.innerHTML = '';
    // 停止播放
    stopPlayBeta();
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
          reachScore: result.reachScore || 5,
          strengthScore: result.strengthScore || 5,
          weightScore: result.weightScore || 5,
          flexibilityScore: 6
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
      if (result.isDemo) {
        showToast('（演示数据）');
      }
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
    if (result.isDemo) {
      $('#read-grade-badge').style.background = '#ef4444';
    }

    const svgEl = $('#result-stickman-svg');
    const imgEl = $('#result-wall-img');
    stickman = new window.ClimbStickman.StickmanRenderer(svgEl, imgEl);
    stickman.setBetaSteps(result.beta || []);
    stickman.setFrames(result.frames);
    
    // 绘制手点脚点标注
    drawHoldsOverlay(result.holds, result.beta);
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
    
    // 概览区
    const overall = result.overallScore || 7.0;
    const overallEl = $('#overall-score-big');
    if (overallEl) overallEl.textContent = overall.toFixed(1);
    
    const cruxEl = $('#crux-text');
    if (cruxEl) cruxEl.textContent = result.cruxDescription || result.difficultyReason || '—';
    
    const startEl = $('#start-desc');
    if (startEl) startEl.textContent = result.startDescription || '—';
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
      div.style.background = i === currentFrame ? 'var(--wall)' : '';
      
      // 步骤标签（判断crux/rest）
      let stepLabel = `第${step.step||i+1}步`;
      let labelBg = 'var(--orange)';
      if (step.cruxStep) { stepLabel = '⚡ 难点'; labelBg = '#ef4444'; }
      else if (step.restPoint) { stepLabel = '💤 休息'; labelBg = 'var(--cyan)'; }
      
      const handPos = step.handPosition || '';
      const footPos = step.footPosition || '';
      const hipPos = step.hipAction || '';
      const bodyPos = step.bodyPosture || '';
      const keyPt = step.keyPoint || '';
      
      div.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <div style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:100px;color:#fff;background:${labelBg};flex-shrink:0;">${stepLabel}</div>
        </div>
        
        ${handPos ? `<div style="margin-bottom:7px;">
          <div style="font-size:10px;font-weight:700;color:var(--orange);margin-bottom:3px;letter-spacing:0.5px;">🤚 手</div>
          <div style="font-size:12.5px;color:var(--text);line-height:1.55;">${handPos}</div>
        </div>` : ''}
        
        ${footPos ? `<div style="margin-bottom:7px;">
          <div style="font-size:10px;font-weight:700;color:#22c55e;margin-bottom:3px;letter-spacing:0.5px;">🦶 脚</div>
          <div style="font-size:12.5px;color:var(--text);line-height:1.55;">${footPos}</div>
        </div>` : ''}
        
        ${hipPos ? `<div style="margin-bottom:7px;">
          <div style="font-size:10px;font-weight:700;color:#a78bfa;margin-bottom:3px;letter-spacing:0.5px;">🔴 髋</div>
          <div style="font-size:12.5px;color:var(--text);line-height:1.55;">${hipPos}</div>
        </div>` : ''}
        
        ${bodyPos ? `<div style="margin-bottom:7px;">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);margin-bottom:3px;letter-spacing:0.5px;">🧍 姿态</div>
          <div style="font-size:12.5px;color:var(--text);line-height:1.55;">${bodyPos}</div>
        </div>` : ''}
        
        ${keyPt ? `<div style="background:rgba(255,107,53,0.08);border-radius:8px;padding:9px 12px;margin-top:4px;border:1px solid rgba(255,107,53,0.15);">
          <div style="font-size:10px;font-weight:700;color:var(--orange);margin-bottom:3px;">💡 核心要点</div>
          <div style="font-size:12px;color:var(--text);line-height:1.6;">${keyPt}</div>
        </div>` : ''}
      `;
      
      div.addEventListener('click', () => { currentFrame = i; stickman?.goTo(i); updateFrameUI(); renderBetaCards(beta); });
      container.appendChild(div);
    });
  }

  function updateFrameUI() {
    const slider = $('#frame-slider');
    const frameCount = analysisResult?.frames?.length || 1;
    const betaCount = analysisResult?.beta?.length || 1;
    slider.value = currentFrame;
    slider.max = frameCount - 1;
    $('#frame-counter').textContent = `${currentFrame+1}/${frameCount}`;
    
    // 更新步骤指示器
    const stepIndicator = $('#step-indicator');
    if (stepIndicator) {
      const step = currentFrame + 1;
      const total = analysisResult?.beta?.length || frameCount;
      stepIndicator.textContent = step <= total ? `第${step}步` : '';
      stepIndicator.style.display = step <= total ? 'inline-block' : 'none';
    }
  }

  // ===== 手点脚点标注层 =====

  /**
   * 在岩壁照片上绘制手点和脚点标注
   * 只显示用户所选颜色的点，消除其他颜色干扰
   * @param {Array} holds - 手点脚点数据（只包含所选颜色的点）
   * @param {Array} beta - beta步骤数据（用于高亮当前步骤相关的点）
   */
  function drawHoldsOverlay(holds, beta) {
    const holdsSvg = $('#result-holds-svg');
    if (!holdsSvg) return;
    
    // 清空之前的标注
    let svg = `
    <defs>
      <filter id="hold-glow-hand" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="0.025" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="hold-glow-foot" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="0.018" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="text-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="0.008" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>`;
    
    if (!holds || !holds.length) {
      holdsSvg.innerHTML = '';
      return;
    }
    
    holds.forEach((hold, i) => {
      const x = hold.x;
      const y = hold.y;
      const isHand = hold.type === 'hand';
      const isFoot = hold.type === 'foot';
      
      // 手点蓝色发光，脚点绿色发光
      const color = isHand ? '#38bdf8' : '#22c55e';
      const glowColor = isHand ? 'rgba(56,189,248,0.6)' : 'rgba(34,197,94,0.6)';
      
      // size对应圆的大小
      const sizeMap = { large: 0.050, medium: 0.038, small: 0.026 };
      const r = sizeMap[hold.size] || 0.035;
      
      // 步骤序号（第几步用到这个点）
      const stepUsed = [];
      (beta||[]).forEach((step, si) => {
        if (step._usedHolds && step._usedHolds.includes(i)) stepUsed.push(si + 1);
      });
      const stepLabel = stepUsed.length ? stepUsed.join(',') : '';
      
      // 大发光背景
      svg += `<circle cx="${x}" cy="${y}" r="${r * 2.2}" fill="${glowColor}" opacity="0.5" filter="url(#hold-glow-${isHand?'hand':'foot'})"/>`;
      // 中等光晕
      svg += `<circle cx="${x}" cy="${y}" r="${r * 1.5}" fill="${glowColor}" opacity="0.7"/>`;
      // 实心圆
      svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="0.95" stroke="rgba(255,255,255,0.6)" stroke-width="0.004"/>`;
      
      // 手/脚图标
      svg += `<text x="${x}" y="${y + r + 0.030}" text-anchor="middle" font-size="0.024" fill="rgba(255,255,255,0.95)" filter="url(#text-glow)">${isHand?'🤚':'🦶'}</text>`;
      
      // 步骤序号（如果这个点被用到）
      if (stepLabel) {
        svg += `<text x="${x + r * 0.8}" y="${y - r * 0.8}" text-anchor="middle" font-size="0.020" fill="#fff" font-weight="bold">${stepLabel}</text>`;
      }
    });
    
    holdsSvg.innerHTML = svg;
  }

  // ===== Beta自动播放 =====
  
  function togglePlayBeta() {
    if (isPlayingBeta) {
      stopPlayBeta();
    } else {
      startPlayBeta();
    }
  }
  
  function startPlayBeta() {
    if (!analysisResult?.beta?.length) return;
    isPlayingBeta = true;
    $('#play-beta-btn').textContent = '⏸';
    $('#play-beta-btn').style.background = 'var(--orange)';
    $('#play-beta-btn').style.color = '#fff';
    
    let step = currentFrame;
    const maxStep = Math.min(analysisResult.beta.length, analysisResult.frames.length);
    
    playBetaInterval = setInterval(() => {
      step++;
      if (step >= maxStep) {
        step = 0; // 循环
      }
      currentFrame = step;
      stickman?.goTo(step);
      updateFrameUI();
      renderBetaCards(analysisResult.beta);
    }, 1500); // 每1.5秒一步
  }
  
  function stopPlayBeta() {
    isPlayingBeta = false;
    if (playBetaInterval) {
      clearInterval(playBetaInterval);
      playBetaInterval = null;
    }
    $('#play-beta-btn').textContent = '▶';
    $('#play-beta-btn').style.background = '';
    $('#play-beta-btn').style.color = '';
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
      result.savedBeta = savedBeta;
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
    
    // Beta对比（当关联了线路时）
    const linkId = $('#review-route-select')?.value;
    if (linkId && result.savedBeta) {
      const compareEl = $('#beta-compare');
      if (!compareEl) {
        const compareDiv = document.createElement('div');
        compareDiv.id = 'beta-compare';
        compareDiv.className = 'card';
        compareDiv.style.marginBottom = '14px';
        const optimalSteps = (result.savedBeta?.beta||[]);
        const userSteps = (result.stepScores||[]);
        
        // 构建对比行
        const maxLen = Math.max(optimalSteps.length, userSteps.length);
        let rows = '';
        for (let i = 0; i < maxLen; i++) {
          const opt = optimalSteps[i];
          const usr = userSteps[i];
          const isMatch = opt?.moveType && usr?.moveType && opt.moveType === usr.moveType;
          const rowColor = isMatch ? 'var(--cyan)' : '#ef4444';
          rows += `<div style="display:grid;grid-template-columns:24px 1fr 1fr;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);">
            <span style="font-size:11px;color:var(--text-muted);">${i+1}</span>
            <div style="font-size:12px;color:var(--orange);">${usr?.handFootPair?.split('+')[0]||'—'}</div>
            <div style="font-size:12px;color:${rowColor};">${opt?.handPosition?.split(',')[0]||opt?.description?.slice(0,20)||'—'}</div>
          </div>`;
        }
        
        compareDiv.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><p style="font-size:13px;font-weight:700;margin:0;">⚖️ Beta对比</p><span style="font-size:12px;font-weight:700;color:var(--cyan);background:rgba(0,180,166,0.1);padding:3px 10px;border-radius:100px;">'+(result.betaMatchRate||'—')+'</span></div><div style="display:grid;grid-template-columns:24px 1fr 1fr;gap:8px;margin-bottom:8px;"><div></div><div style="font-size:10px;font-weight:700;color:var(--orange);letter-spacing:0.5px;">你的动作</div><div style="font-size:10px;font-weight:700;color:var(--cyan);letter-spacing:0.5px;">最优动作</div></div>'+rows;
        $('#review-result .app-content')?.insertBefore(compareDiv, $('#review-result .card'));
      }
    }

    $('#step-scores').innerHTML = (result.stepScores||[]).map(step => {
      const color = step.score >= 8 ? 'var(--cyan)' : step.score >= 6 ? 'var(--orange)' : '#ef4444';
      const moveIcon = step.moveType ? `<span style="font-size:11px;padding:2px 8px;background:var(--orange-light);color:var(--orange);border-radius:100px;font-weight:600;margin-left:4px;">${step.moveType}</span>` : '';
      const handFootPair = step.handFootPair ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:3px;">🤚🦶 ${step.handFootPair}</div>` : '';
      const issueText = step.issue ? `<div style="font-size:11px;color:#ef4444;margin-top:2px;">⚠️ ${step.issue}</div>` : '';
      const suggestText = step.suggestion ? `<div style="font-size:11px;color:var(--cyan);margin-top:2px;">→ ${step.suggestion}</div>` : '';
      return `<div style="background:var(--wall);border-radius:12px;padding:12px 14px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <span style="font-size:13px;font-weight:700;color:var(--text);width:60px;flex-shrink:0;">第${step.step}步</span>${moveIcon}
          <div style="flex:1;height:6px;background:var(--bg-secondary);border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${(step.score||5)*10}%;background:${color};border-radius:3px;"></div>
          </div>
          <span style="font-size:14px;font-weight:800;color:${color};width:36px;text-align:right;">${(step.score||5).toFixed(1)}</span>
        </div>
        ${handFootPair}${issueText}${suggestText}
      </div>`;
    }).join('');
    showToast('赏线完成！');
  }

  function renderFrameTimeline(frames) {
    const container = $('#frame-timeline');
    if (!container) return;
    container.innerHTML = '';
    (frames||[]).slice(0,5).forEach((f, i) => {
      const imgSrc = typeof f === 'string' ? f : (f.data || f);
      const div = document.createElement('div');
      div.className = 'frame-thumb' + (i===0?' active':'');
      div.innerHTML = `<img src="${imgSrc}" alt="帧${i+1}">`;
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

  function updateTrainingInsights() {
    const insights = window.ClimbStorage.getTrainingInsights();
    const container = $('#training-insights');
    if (!container) return;
    
    // 周趋势图表
    const trend = insights.weeklyTrend || [];
    const maxSends = Math.max(...trend.map(d => d.sends), 1);
    
    let chartHtml = `<div style="margin-bottom:16px;">
      <p style="font-size:14px;font-weight:700;margin-bottom:12px;">📈 7天完攀趋势</p>
      <div style="display:flex;align-items:flex-end;gap:6px;height:60px;">
        ${trend.map(d => {
          const height = d.sends > 0 ? Math.max(20, (d.sends / maxSends) * 50) : 8;
          const color = d.sends > 0 ? 'var(--orange)' : 'var(--border)';
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="width:100%;background:${color};border-radius:4px 4px 0 0;height:${height}px;transition:height 0.3s;"></div>
            <span style="font-size:9px;color:var(--text-muted);">${d.date.split('/')[1]||d.date.slice(-2)}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
    
    // 弱点分析
    const weaknesses = insights.topWeaknesses || [];
    let weaknessHtml = '';
    if (weaknesses.length > 0) {
      weaknessHtml = `<div style="margin-bottom:16px;">
        <p style="font-size:14px;font-weight:700;margin-bottom:10px;">🎯 需要加强的地方</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${weaknesses.map(w => {
            const colors = { high: '#ef4444', medium: 'var(--orange)' };
            const bg = { high: '#fef2f2', medium: 'var(--orange-light)' };
            return `<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:${bg[w.priority]||'var(--wall)'};border-radius:100px;">
              <span style="font-size:13px;font-weight:700;color:${colors[w.priority]||'var(--text)'};">${w.keyword}</span>
              <span style="font-size:11px;color:${colors[w.priority]||'var(--text-muted)'};">×${w.count}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }
    
    // 进步趋势
    let progressHtml = '';
    if (insights.weeklyImprovement) {
      const imp = insights.weeklyImprovement;
      const arrow = imp.direction === 'up' ? '📈' : imp.direction === 'down' ? '📉' : '➡️';
      const color = imp.direction === 'up' ? 'var(--cyan)' : imp.direction === 'down' ? '#ef4444' : 'var(--text-muted)';
      progressHtml = `<div style="padding:12px 16px;background:var(--wall);border-radius:10px;display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span style="font-size:22px;">${arrow}</span>
        <div>
          <div style="font-size:13px;font-weight:700;color:${color};">${imp.label}</div>
          <div style="font-size:11px;color:var(--text-muted);">vs 上周</div>
        </div>
      </div>`;
    }
    
    container.innerHTML = `<div class="card" style="margin-bottom:14px;">
      <p style="font-size:15px;font-weight:800;margin-bottom:14px;">📊 训练洞察</p>
      ${progressHtml}
      ${chartHtml}
      ${weaknessHtml}
      ${insights.totalAnalyses > 0 ? `<p style="font-size:12px;color:var(--text-muted);text-align:center;">已完成 ${insights.totalAnalyses} 次动作分析</p>` : '<p style="font-size:12px;color:var(--text-muted);text-align:center;">完成赏线分析后解锁更多洞察</p>'}
    </div>`;
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
