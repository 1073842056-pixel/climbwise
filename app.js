// ===== State =====
let selectedType = null;
let selectedResult = null;
let gradeSystem = 'v';
let currentPhoto = null;
let currentLogPhoto = null;
let currentAnalysis = null;
let currentFrame = 0;
let routes = JSON.parse(localStorage.getItem('climbwise_routes') || '[]');
let chatMessages = JSON.parse(localStorage.getItem('climbwise_chat') || '[]');

const V_GRADES = ['V0','V1','V2','V3','V4','V5','V6','V7','V8','V9','V10','V11','V12','V13','V14','V15','V16','V17'];
const Y_GRADES = ['5.10a','5.10b','5.10c','5.10d','5.11a','5.11b','5.11c','5.11d','5.12a','5.12b','5.12c','5.12d','5.13a','5.13b','5.13c','5.13d','5.14a','5.14b','5.14c','5.14d','5.15a','5.15b','5.15c','5.15d'];
const GYM_NAMES = { general: '公共聊天室', breek: 'Breek 抱石馆', walltimes: '岩时·壁虎', kailas: 'KAILAS 岩馆' };
const RESULT_ICONS = { send: '✓', flash: '⚡', onsight: '🎯', fail: '❌' };
const TYPE_ICONS = { boulder: '🧗', sport: '🏔️', trad: '🧭' };

// ===== Utility =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(() => t.style.opacity = '0', 2000);
}

function saveRoutes() {
  localStorage.setItem('climbwise_routes', JSON.stringify(routes));
}

function saveChat() {
  localStorage.setItem('climbwise_chat', JSON.stringify(chatMessages));
}

function initGradeSelect() {
  const sel = document.getElementById('gradeSelect');
  const grades = gradeSystem === 'v' ? V_GRADES : Y_GRADES;
  sel.innerHTML = grades.map(g => '<option value="' + g + '">' + g + '</option>').join('');
}

// ===== Tab Navigation =====
document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('tab-active'));
    btn.classList.add('tab-active');
    if (tab === 'stats') renderStats();
    if (tab === 'chat') renderChat();
    updateStreak();
  });
});

// ===== Photo Upload - Analyze =====
const uploadArea = document.getElementById('uploadArea');
const photoInput = document.getElementById('photoInput');

uploadArea.addEventListener('click', () => photoInput.click());
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handlePhoto(e.dataTransfer.files[0]);
});
photoInput.addEventListener('change', e => { if (e.target.files[0]) handlePhoto(e.target.files[0]); });

function handlePhoto(file) {
  if (file.size > 10 * 1024 * 1024) { showToast('图片太大，请压缩后重试'); return; }
  currentPhoto = file;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('previewImg').src = e.target.result;
    document.getElementById('previewArea').classList.remove('hidden');
    document.getElementById('analyzeBtn').disabled = false;
    document.getElementById('analyzeResult').classList.add('hidden');
    document.getElementById('stickmanSection').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

document.getElementById('clearPhoto').addEventListener('click', () => {
  currentPhoto = null;
  document.getElementById('previewArea').classList.add('hidden');
  document.getElementById('analyzeBtn').disabled = true;
  document.getElementById('analyzeResult').classList.add('hidden');
  document.getElementById('stickmanSection').classList.add('hidden');
});

// ===== Analyze Button =====
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  if (!currentPhoto) return;
  
  const btn = document.getElementById('analyzeBtn');
  const loading = document.getElementById('analyzeLoading');
  const result = document.getElementById('analyzeResult');
  
  btn.disabled = true;
  loading.classList.remove('hidden');
  result.classList.add('hidden');
  
  try {
    const reader = new FileReader();
    const imageBase64 = await new Promise(resolve => {
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(currentPhoto);
    });
    
    currentAnalysis = await analyzeRoute(imageBase64);
    currentFrame = 0;
    
    document.getElementById('handHolds').innerHTML = currentAnalysis.handHolds.map(h => '<li class="fade-in">• ' + h + '</li>').join('');
    document.getElementById('footHolds').innerHTML = currentAnalysis.footHolds.map(f => '<li class="fade-in">• ' + f + '</li>').join('');
    
    document.getElementById('betaSequence').innerHTML = currentAnalysis.beta.map(b => 
      '<div class="bg-slate-800 rounded-lg p-3 fade-in">' +
        '<div class="flex items-center gap-2 mb-1"><span class="bg-accent text-white text-xs px-2 py-0.5 rounded-full">步 ' + b.step + '</span></div>' +
        '<p class="text-sm">' + b.description + '</p>' +
        '<p class="text-xs text-accent mt-1">💡 ' + b.key + '</p>' +
      '</div>'
    ).join('');
    
    if (currentAnalysis.stickmanFrames && currentAnalysis.stickmanFrames.length > 0) {
      document.getElementById('stickmanBg').src = document.getElementById('previewImg').src;
      document.getElementById('stickmanSection').classList.remove('hidden');
      renderStickman();
    }
    
    result.classList.remove('hidden');
    showToast('分析完成！');
    
  } catch (e) {
    console.error(e);
    showToast('分析失败，请重试');
  } finally {
    btn.disabled = false;
    loading.classList.add('hidden');
  }
});

// ===== Stickman Animation =====
function renderStickman() {
  if (!currentAnalysis || !currentAnalysis.stickmanFrames) return;
  const frames = currentAnalysis.stickmanFrames;
  const frame = frames[currentFrame];
  const svg = document.getElementById('stickmanSvg');
  const totalFrames = frames.length;
  
  document.getElementById('frameCounter').textContent = (currentFrame + 1) + '/' + totalFrames;
  document.getElementById('frameHint').textContent = currentAnalysis.beta[currentFrame]?.description || '';
  
  let d = '';
  // Head
  d += '<circle cx="' + frame.head.cx + '" cy="' + frame.head.cy + '" r="' + frame.head.r + '" fill="#f97316" stroke="#f97316" stroke-width="2"/>';
  // Body
  d += '<line x1="' + frame.head.cx + '" y1="' + (frame.head.cy + frame.head.r) + '" x2="' + frame.hip.x + '" y2="' + frame.hip.y + '" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>';
  // Left Arm
  d += '<line x1="' + frame.hip.x + '" y1="' + (frame.hip.y - 10) + '" x2="' + frame.leftArm.elbow.x + '" y2="' + frame.leftArm.elbow.y + '" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>';
  d += '<line x1="' + frame.leftArm.elbow.x + '" y1="' + frame.leftArm.elbow.y + '" x2="' + frame.leftArm.hand.x + '" y2="' + frame.leftArm.hand.y + '" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>';
  d += '<circle cx="' + frame.leftArm.hand.x + '" cy="' + frame.leftArm.hand.y + '" r="6" fill="#38bdf8"/>';
  // Right Arm
  d += '<line x1="' + frame.hip.x + '" y1="' + (frame.hip.y - 10) + '" x2="' + frame.rightArm.elbow.x + '" y2="' + frame.rightArm.elbow.y + '" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>';
  d += '<line x1="' + frame.rightArm.elbow.x + '" y1="' + frame.rightArm.elbow.y + '" x2="' + frame.rightArm.hand.x + '" y2="' + frame.rightArm.hand.y + '" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>';
  d += '<circle cx="' + frame.rightArm.hand.x + '" cy="' + frame.rightArm.hand.y + '" r="6" fill="#38bdf8"/>';
  // Left Leg
  d += '<line x1="' + frame.hip.x + '" y1="' + frame.hip.y + '" x2="' + frame.leftLeg.knee.x + '" y2="' + frame.leftLeg.knee.y + '" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>';
  d += '<line x1="' + frame.leftLeg.knee.x + '" y1="' + frame.leftLeg.knee.y + '" x2="' + frame.leftLeg.foot.x + '" y2="' + frame.leftLeg.foot.y + '" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>';
  d += '<circle cx="' + frame.leftLeg.foot.x + '" cy="' + frame.leftLeg.foot.y + '" r="5" fill="#22c55e"/>';
  // Right Leg
  d += '<line x1="' + frame.hip.x + '" y1="' + frame.hip.y + '" x2="' + frame.rightLeg.knee.x + '" y2="' + frame.rightLeg.knee.y + '" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>';
  d += '<line x1="' + frame.rightLeg.knee.x + '" y1="' + frame.rightLeg.knee.y + '" x2="' + frame.rightLeg.foot.x + '" y2="' + frame.rightLeg.foot.y + '" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>';
  d += '<circle cx="' + frame.rightLeg.foot.x + '" cy="' + frame.rightLeg.foot.y + '" r="5" fill="#22c55e"/>';
  
  svg.innerHTML = d;
}

document.getElementById('prevFrame').addEventListener('click', () => {
  if (!currentAnalysis) return;
  const total = currentAnalysis.stickmanFrames?.length || 0;
  currentFrame = (currentFrame - 1 + total) % total;
  renderStickman();
});

document.getElementById('nextFrame').addEventListener('click', () => {
  if (!currentAnalysis) return;
  const total = currentAnalysis.stickmanFrames?.length || 0;
  currentFrame = (currentFrame + 1) % total;
  renderStickman();
});

// ===== Route Logging =====
document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedType = btn.dataset.type;
  });
});

document.querySelectorAll('.result-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.result-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedResult = btn.dataset.result;
  });
});

document.getElementById('gradeV').addEventListener('click', () => {
  gradeSystem = 'v';
  document.getElementById('gradeV').classList.add('bg-primary', 'text-wall');
  document.getElementById('gradeV').classList.remove('text-textMuted');
  document.getElementById('gradeY').classList.remove('bg-primary', 'text-wall');
  document.getElementById('gradeY').classList.add('text-textMuted');
  initGradeSelect();
});

document.getElementById('gradeY').addEventListener('click', () => {
  gradeSystem = 'y';
  document.getElementById('gradeY').classList.add('bg-primary', 'text-wall');
  document.getElementById('gradeY').classList.remove('text-textMuted');
  document.getElementById('gradeV').classList.remove('bg-primary', 'text-wall');
  document.getElementById('gradeV').classList.add('text-textMuted');
  initGradeSelect();
});

// Log photo upload
const logUploadArea = document.getElementById('logUploadArea');
const logPhotoInput = document.getElementById('logPhotoInput');

logUploadArea.addEventListener('click', () => logPhotoInput.click());
logPhotoInput.addEventListener('change', e => {
  if (e.target.files[0]) {
    currentLogPhoto = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById('logPhotoImg').src = ev.target.result;
      document.getElementById('logPhotoPreview').classList.remove('hidden');
    };
    reader.readAsDataURL(currentLogPhoto);
  }
});

// Submit log
document.getElementById('submitLog').addEventListener('click', async () => {
  const gymName = document.getElementById('gymName').value.trim();
  if (!gymName) { showToast('请输入岩馆名称'); return; }
  if (!selectedResult) { showToast('请选择完成结果'); return; }
  
  const grade = document.getElementById('gradeSelect').value;
  let photoData = null;
  
  if (currentLogPhoto) {
    const reader = new FileReader();
    photoData = await new Promise(resolve => {
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(currentLogPhoto);
    });
  }
  
  const route = {
    id: Date.now(),
    gym: gymName,
    routeName: document.getElementById('routeName').value.trim(),
    type: selectedType || 'boulder',
    grade: grade,
    gradeSystem: gradeSystem,
    result: selectedResult,
    photo: photoData,
    notes: document.getElementById('routeNotes').value.trim(),
    wantAiFeedback: document.getElementById('wantAiFeedback').checked,
    date: new Date().toISOString()
  };
  
  routes.unshift(route);
  saveRoutes();
  
  if (route.wantAiFeedback && route.notes) {
    const feedback = await getFeedback(route.notes);
    route.aiFeedback = feedback;
    saveRoutes();
  }
  
  // Reset form
  document.getElementById('gymName').value = '';
  document.getElementById('routeName').value = '';
  document.getElementById('routeNotes').value = '';
  document.getElementById('wantAiFeedback').checked = false;
  document.getElementById('logPhotoPreview').classList.add('hidden');
  currentLogPhoto = null;
  selectedType = null;
  selectedResult = null;
  document.querySelectorAll('.type-btn, .result-btn').forEach(b => b.classList.remove('selected'));
  
  showToast('记录已保存！');
  updateStreak();
});

// ===== Statistics =====
function updateStreak() {
  if (routes.length === 0) {
    document.getElementById('streakBadge').textContent = '';
    return;
  }
  
  const sends = routes.filter(r => r.result === 'send');
  if (sends.length === 0) {
    document.getElementById('streakBadge').textContent = '';
    return;
  }
  
  // Calculate streak
  let streak = 0;
  const today = new Date().toDateString();
  const sortedDates = [...new Set(routes.filter(r => r.result === 'send').map(r => new Date(r.date).toDateString()))].sort((a, b) => new Date(b) - new Date(a));
  
  for (let i = 0; i < sortedDates.length; i++) {
    const d = new Date(sortedDates[i]);
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    if (d.toDateString() === expected.toDateString()) {
      streak++;
    } else {
      break;
    }
  }
  
  if (streak > 0) {
    document.getElementById('streakBadge').textContent = '🔥 ' + streak + '天';
  }
}

function renderStats() {
  const total = routes.length;
  const sends = routes.filter(r => r.result === 'send').length;
  const flashes = routes.filter(r => r.result === 'flash').length;
  const onsights = routes.filter(r => r.result === 'onsight').length;
  
  document.getElementById('totalRoutes').textContent = total;
  document.getElementById('sendRate').textContent = total > 0 ? Math.round(sends / total * 100) + '%' : '0%';
  document.getElementById('flashRate').textContent = total > 0 ? Math.round(flashes / total * 100) + '%' : '0%';
  
  // Streak
  let streak = 0;
  const sortedDates = [...new Set(routes.filter(r => r.result === 'send').map(r => new Date(r.date).toDateString()))].sort((a, b) => new Date(b) - new Date(a));
  for (let i = 0; i < sortedDates.length; i++) {
    const d = new Date(sortedDates[i]);
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    if (d.toDateString() === expected.toDateString()) {
      streak++;
    } else {
      break;
    }
  }
  document.getElementById('currentStreak').textContent = streak;
  
  // Grade distribution (V grades only)
  const gradeCount = {};
  routes.forEach(r => {
    if (r.gradeSystem === 'v') {
      gradeCount[r.grade] = (gradeCount[r.grade] || 0) + 1;
    }
  });
  
  const maxCount = Math.max(...Object.values(gradeCount), 1);
  const gradeChart = document.getElementById('gradeChart');
  
  if (Object.keys(gradeCount).length === 0) {
    gradeChart.innerHTML = '<p class="text-xs text-textMuted">暂无数据</p>';
  } else {
    gradeChart.innerHTML = V_GRADES.map(g => {
      const count = gradeCount[g] || 0;
      const pct = (count / maxCount * 100).toFixed(0);
      return '<div class="flex items-center gap-2">' +
        '<span class="text-xs w-8 text-textMuted">' + g + '</span>' +
        '<div class="stat-bar flex-1">' +
          '<div class="stat-fill" style="width:' + pct + '%"></div>' +
        '</div>' +
        '<span class="text-xs w-4 text-right">' + count + '</span>' +
      '</div>';
    }).join('');
  }
  
  // Recent logs
  const recentLogs = document.getElementById('recentLogs');
  if (routes.length === 0) {
    recentLogs.innerHTML = '<p class="text-xs text-textMuted">暂无记录</p>';
  } else {
    recentLogs.innerHTML = routes.slice(0, 10).map(r => 
      '<div class="log-item flex items-center gap-3">' +
        '<span class="text-lg">' + RESULT_ICONS[r.result] + '</span>' +
        '<div class="flex-1 min-w-0">' +
          '<p class="text-sm truncate">' + r.gym + (r.routeName ? ' - ' + r.routeName : '') + '</p>' +
          '<p class="text-xs text-textMuted">' + TYPE_ICONS[r.type] + ' ' + r.grade + ' · ' + new Date(r.date).toLocaleDateString('zh-CN', {month:'short',day:'numeric'}) + '</p>' +
        '</div>' +
      '</div>'
    ).join('');
  }
}

// ===== Chat =====
const DEMO_USERS = ['岩壁小能手', '抱石达人', '红点爱好者', '先锋战士', '传统攀爬手', '野攀发烧友'];

function renderChat() {
  const gym = document.getElementById('chatGym').value;
  const container = document.getElementById('chatMessages');
  const filtered = chatMessages.filter(m => m.gym === gym);
  
  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-center text-textMuted text-sm py-8">暂无消息，快来发言吧！</p>';
  } else {
    container.innerHTML = filtered.map(m => {
      const isMine = m.isMine;
      const time = new Date(m.time).toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'});
      return '<div class="' + (isMine ? 'chat-mine' : 'chat-other') + ' chat-msg">' +
        '<div class="flex ' + (isMine ? 'flex-row-reverse' : 'flex-row') + ' items-end gap-2">' +
          '<div class="w-8 h-8 rounded-full bg-' + (isMine ? 'primary' : 'accent') + ' flex items-center justify-center text-sm">' +
            (isMine ? '我' : m.name[0]) +
          '</div>' +
          '<div class="' + (isMine ? 'bg-primary text-wall' : 'bg-slate-700') + ' rounded-2xl px-3 py-2">' +
            '<p class="text-sm">' + m.text + '</p>' +
            '<p class="text-xs ' + (isMine ? 'text-sky-200' : 'text-slate-400') + '">' + time + '</p>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    container.scrollTop = container.scrollHeight;
  }
}

document.getElementById('chatGym').addEventListener('change', renderChat);

document.getElementById('chatSend').addEventListener('click', () => {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  
  const gym = document.getElementById('chatGym').value;
  const msg = {
    id: Date.now(),
    gym: gym,
    name: '我',
    text: text,
    time: new Date().toISOString(),
    isMine: true
  };
  
  chatMessages.push(msg);
  saveChat();
  renderChat();
  input.value = '';
  
  // Add demo response after delay
  setTimeout(() => {
    const demoMsg = {
      id: Date.now() + 1,
      gym: gym,
      name: DEMO_USERS[Math.floor(Math.random() * DEMO_USERS.length)],
      text: getDemoResponse(text),
      time: new Date().toISOString(),
      isMine: false
    };
    chatMessages.push(demoMsg);
    saveChat();
    renderChat();
  }, 1500);
});

document.getElementById('chatInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    document.getElementById('chatSend').click();
  }
});

function getDemoResponse(input) {
  const responses = [
    '好厉害！继续加油 💪',
    '这个beta看起来不错！',
    '下次试试脚先动，手再跟',
    '核心要收紧，重心放低',
    'V' + Math.floor(Math.random() * 10) + '过了吗？',
    '最近在刷哪条线呀？',
    '抱石的话要注意落地姿势哦',
    '冲坠保护做好了吗？'
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// ===== Init =====
initGradeSelect();
updateStreak();

// Load demo chat messages if empty
if (chatMessages.length === 0) {
  chatMessages = [
    { id: 1, gym: 'general', name: '岩壁小能手', text: '大家今天爬了吗？', time: new Date(Date.now() - 300000).toISOString(), isMine: false },
    { id: 2, gym: 'general', name: '抱石达人', text: '刚刷了V5，感觉状态不错！', time: new Date(Date.now() - 240000).toISOString(), isMine: false },
    { id: 3, gym: 'breek', name: '红点爱好者', text: 'Breek的蓝线真难', time: new Date(Date.now() - 180000).toISOString(), isMine: false },
    { id: 4, gym: 'walltimes', name: '先锋战士', text: '壁虎的新线上了吗？', time: new Date(Date.now() - 120000).toISOString(), isMine: false }
  ];
  saveChat();
}
