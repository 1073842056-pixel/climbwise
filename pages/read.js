/**
 * ClimbWise v5 - 读线页面
 * 包含：照片上传→颜色选择→AI分析→火柴人动画+Beta展示
 */

(function() {
  'use strict';

  let selectedColor = null;
  let photoDataUrl = null;
  let analysisResult = null;
  let stickman = null;
  let currentFrame = 0;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // ===== 上传处理 =====
  function init() {
    const photoInput = $('#read-photo-input');
    const uploadZone = $('#read-upload');

    uploadZone.addEventListener('click', () => photoInput.click());
    
    uploadZone.addEventListener('dragover', e => {
      e.preventDefault();
      uploadZone.style.borderColor = 'var(--orange)';
      uploadZone.style.background = 'var(--orange-light)';
    });
    
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.style.borderColor = '';
      uploadZone.style.background = '';
    });
    
    uploadZone.addEventListener('drop', e => {
      e.preventDefault();
      uploadZone.style.borderColor = '';
      uploadZone.style.background = '';
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) handlePhoto(f);
    });

    photoInput.addEventListener('change', () => {
      if (photoInput.files[0]) handlePhoto(photoInput.files[0]);
    });

    $('#read-clear')?.addEventListener('click', resetUpload);
    
    // 颜色选择器
    initColorGrid();

    // 分析按钮
    $('#read-start-btn')?.addEventListener('click', startAnalysis);

    // 结果页操作
    $('#read-back')?.addEventListener('click', resetUpload);
    $('#read-restart')?.addEventListener('click', resetUpload);
    $('#save-route-btn')?.addEventListener('click', () => {
      showToast('已保存到我的线路！');
    });
    $('#prev-frame')?.addEventListener('click', () => changeFrame(-1));
    $('#next-frame')?.addEventListener('click', () => changeFrame(1));
    $('#frame-slider')?.addEventListener('input', e => {
      currentFrame = parseInt(e.target.value);
      stickman?.goTo(currentFrame);
      updateFrameUI();
    });
  }

  function handlePhoto(file) {
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

  function resetUpload() {
    photoDataUrl = null;
    selectedColor = null;
    analysisResult = null;
    $('#read-result').classList.add('hidden');
    $('#read-preview').classList.add('hidden');
    $('#read-colors').classList.add('hidden');
    $('#read-start-btn').classList.add('hidden');
    $('#read-upload').classList.remove('hidden');
    $$('.color-dot').forEach(d => { d.classList.remove('selected'); d.style.opacity = '0.5'; });
    $('#read-photo-input').value = '';
  }

  // ===== 颜色选择器 =====
  function initColorGrid() {
    const grid = $('#color-grid');
    if (!grid) return;

    const colors = [
      { name: '黄色', hex: '#FBBF24' },
      { name: '蓝色', hex: '#3B82F6' },
      { name: '绿色', hex: '#22C55E' },
      { name: '红色', hex: '#EF4444' },
      { name: '白色', hex: '#F8FAFC' },
      { name: '粉色', hex: '#EC4899' },
      { name: '橙色', hex: '#F97316' },
      { name: '紫色', hex: '#8B5CF6' },
      { name: '灰色', hex: '#6B7280' },
      { name: '黑色', hex: '#1F2937' },
    ];

    grid.innerHTML = '';
    colors.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'color-dot';
      btn.dataset.color = c.name;
      btn.style.background = c.hex;
      btn.style.opacity = '0.5';
      btn.addEventListener('click', () => {
        $$('.color-dot').forEach(d => { d.classList.remove('selected'); d.style.opacity = '0.5'; d.style.transform = ''; });
        btn.classList.add('selected');
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1.2)';
        selectedColor = c.name;
        updateStartBtn();
      });
      grid.appendChild(btn);
    });
  }

  function updateStartBtn() {
    const btn = $('#read-start-btn');
    if (btn) btn.disabled = !(photoDataUrl && selectedColor);
  }

  // ===== 分析流程 =====
  async function startAnalysis() {
    if (!photoDataUrl || !selectedColor) return;

    const profile = window.ClimbStorage.getProfile();
    showLoading(true);
    updateDots(0);

    try {
      updateStatus('正在识别手点脚点...', 20);
      const result = await window.ClimbVision.analyzeRoute(photoDataUrl, selectedColor, profile);
      analysisResult = result;
      updateDots(1);

      updateStatus('正在生成个性化beta...', 55);
      // 应用知识库增强评分
      if (window.CLIMBING_KNOWLEDGE) {
        result.enhancedSuggestions = window.CLIMBING_KNOWLEDGE.generateSuggestions({
          reachScore: (result.reachScore || 5) * 10,
          strengthScore: (result.strengthScore || 5) * 10,
          weightScore: (result.weightScore || 5) * 10,
          flexibilityScore: 60
        });
      }
      updateDots(2);

      updateStatus('正在渲染火柴人动画...', 80);

      // 保存
      window.ClimbStorage.saveRouteCard({
        photo: photoDataUrl,
        color: selectedColor,
        holds: result.holds,
        beta: result.beta,
        frames: result.frames,
        personalScore: result.personalScore,
        gradeEquivalent: result.subjectiveGrade,
        reachScore: result.reachScore,
        strengthScore: result.strengthScore,
        weightScore: result.weightScore,
        suggestions: result.suggestions,
        difficultyPoints: result.difficultyPoints,
        estimatedAttempts: result.estimatedAttempts
      });

      updateStatus('完成！', 100);
      updateDots(3);
      await sleep(500);
      showResult(result);
    } catch(e) {
      console.error('[ReadPage]', e);
      showToast('分析失败，请重试');
      showLoading(false);
      resetUpload();
    }
  }

  function showLoading(show) {
    $('#read-preview').classList.toggle('hidden', show);
    $('#read-colors').classList.toggle('hidden', show);
    $('#read-start-btn').classList.toggle('hidden', show);
    $('#read-loading').classList.toggle('hidden', !show);
    $('#read-result').classList.add('hidden');
  }

  function updateStatus(text, pct) {
    const s = $('#read-status');
    const b = $('#read-bar');
    if (s) s.textContent = text;
    if (b) b.style.width = pct + '%';
  }

  function updateDots(step) {
    $$('#read-dots .dot').forEach((d, i) => {
      d.classList.remove('active', 'done');
      if (i < step) d.classList.add('done');
      else if (i === step) d.classList.add('active');
    });
  }

  // ===== 结果展示 =====
  function showResult(result) {
    $('#read-loading').classList.add('hidden');
    $('#read-result').classList.remove('hidden');

    // 岩壁图
    $('#result-wall-img').src = photoDataUrl;

    // 难度标签
    $('#read-grade-badge').textContent = result.subjectiveGrade || 'V3-4';

    // 火柴人
    const svgEl = $('#result-stickman-svg');
    const imgEl = $('#result-wall-img');
    stickman = new window.ClimbStickman.StickmanRenderer(svgEl, imgEl);
    stickman.setFrames(result.frames);

    // 帧控制
    const slider = $('#frame-slider');
    slider.max = result.frames.length - 1;
    slider.value = 0;
    currentFrame = 0;
    updateFrameUI();
    stickman.goTo(0);

    // Beta卡片
    renderBetaCards(result.beta);

    // 评分
    const f = p => Math.min(100, Math.max(0, p * 10)) + '%';
    const v = p => p ? p.toFixed(1) : '—';
    $('#res-strength').style.width = f(result.strengthScore || 5);
    $('#res-strength-val').textContent = v(result.strengthScore);
    $('#res-reach').style.width = f(result.reachScore || 5);
    $('#res-reach-val').textContent = v(result.reachScore);
    $('#res-overall').style.width = f(result.personalScore || 5);
    $('#res-overall-val').textContent = v(result.personalScore);

    // 建议（融合知识库）
    const suggestions = [...(result.enhancedSuggestions || []), ...(result.suggestions || [])];
    const sugList = $('#suggestions-list');
    sugList.innerHTML = suggestions.slice(0, 4).map(s => 
      `<li style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;line-height:1.5;">• ${s}</li>`
    ).join('');

    showToast('读线完成！');
  }

  function renderBetaCards(beta) {
    const container = $('#beta-cards');
    if (!container) return;
    container.innerHTML = '';
    (beta || []).forEach((step, i) => {
      const isActive = i === currentFrame;
      const div = document.createElement('div');
      div.className = 'beta-card';
      div.style.borderLeftColor = isActive ? 'var(--orange)' : 'var(--border)';
      div.innerHTML = `
        <div class="step">🔥 Beta ${step.step || i+1}</div>
        <div class="desc">${step.description}</div>
        <div class="tip">💡 ${step.keyPoint || ''}</div>
      `;
      div.addEventListener('click', () => {
        currentFrame = i;
        stickman?.goTo(i);
        updateFrameUI();
        renderBetaCards(beta);
      });
      container.appendChild(div);
    });
  }

  function updateFrameUI() {
    const beta = analysisResult?.beta || [];
    const slider = $('#frame-slider');
    const frameCount = analysisResult?.frames?.length || 1;
    slider.value = currentFrame;
    $('#frame-counter').textContent = `${currentFrame + 1}/${frameCount}`;
  }

  function changeFrame(dir) {
    const max = (analysisResult?.frames?.length || 1) - 1;
    const next = Math.max(0, Math.min(max, currentFrame + dir));
    if (next !== currentFrame) {
      currentFrame = next;
      stickman?.goTo(currentFrame);
      updateFrameUI();
      renderBetaCards(analysisResult?.beta);
    }
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function showToast(msg) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // 导出
  window.ClimbReadPage = { init };

})();
