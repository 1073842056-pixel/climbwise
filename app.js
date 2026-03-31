// ClimbWise - Main Application JavaScript

// ============================================
// 全局状态
// ============================================
let currentImage = null;
let chatHistory = JSON.parse(localStorage.getItem('climbwise_history') || '[]');

// ============================================
// 页面导航
// ============================================
function showChat() {
  document.getElementById('heroSection').classList.add('hidden');
  document.getElementById('featuresSection').classList.add('hidden');
  document.getElementById('chatSection').classList.remove('hidden');
  document.getElementById('trainerSection').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  loadChatHistory();
}

function hideChat() {
  document.getElementById('chatSection').classList.add('hidden');
  document.getElementById('heroSection').classList.remove('hidden');
  document.getElementById('featuresSection').classList.remove('hidden');
}

function showTrainer() {
  document.getElementById('heroSection').classList.add('hidden');
  document.getElementById('featuresSection').classList.add('hidden');
  document.getElementById('trainerSection').classList.remove('hidden');
  document.getElementById('chatSection').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideTrainer() {
  document.getElementById('trainerSection').classList.add('hidden');
  document.getElementById('heroSection').classList.remove('hidden');
  document.getElementById('featuresSection').classList.remove('hidden');
}

function askQuestion(question) {
  showChat();
  document.getElementById('chatInput').value = question;
  sendChatMessage();
}

// ============================================
// 聊天功能
// ============================================
function loadChatHistory() {
  const container = document.getElementById('chatMessages');
  container.innerHTML = '';
  if (chatHistory.length === 0) {
    container.innerHTML = 
      <div class="flex gap-3">
        <div class="w-8 h-8 bg-gradient-to-br from-cliff-400 to-rock-500 rounded-lg flex-shrink-0 flex items-center justify-center"><svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l14 9-14 9V3z"/></svg></div>
        <div class="flex-1"><div class="bg-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]"><p class="text-slate-200 text-sm leading-relaxed">👋 你好！我是ClimbWise，你的AI攀岩私教。有什么关于攀岩的问题想问我吗？</p></div></div>
      </div>;
    return;
  }
  chatHistory.forEach(msg => addMessageToUI(msg.role, msg.content, false));
}

function addMessageToUI(role, content, animate = true) {
  const container = document.getElementById('chatMessages');
  const isUser = role === 'user';
  const bubbleClass = isUser ? 'chat-bubble user ml-auto' : 'chat-bubble assistant';
  const wrapperClass = isUser ? 'flex justify-end' : 'flex gap-3';
  const avatar = isUser ? '' : <div class="w-8 h-8 bg-gradient-to-br from-cliff-400 to-rock-500 rounded-lg flex-shrink-0 flex items-center justify-center"><svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l14 9-14 9V3z"/></svg></div>;
  const div = document.createElement('div');
  div.className = wrapperClass + (animate ? ' animate-fadeIn' : '');
  div.innerHTML = ${avatar}<div class=" px-4 py-3 max-w-[85%]"><p class="text-sm leading-relaxed whitespace-pre-wrap"></p></div>;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addLoadingIndicator() {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.id = 'loadingIndicator';
  div.className = 'flex gap-3 animate-fadeIn';
  div.innerHTML = <div class="w-8 h-8 bg-gradient-to-br from-cliff-400 to-rock-500 rounded-lg flex-shrink-0 flex items-center justify-center"><svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l14 9-14 9V3z"/></svg></div><div class="loading-dots bg-slate-700/50 rounded-2xl rounded-tl-sm"><span></span><span></span><span></span></div>;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeLoadingIndicator() {
  const el = document.getElementById('loadingIndicator');
  if (el) el.remove();
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message && !currentImage) return;
  if (!window.ClimbWiseAPI?.isConfigured?.()) {
    showToast('请先在设置中配置 MiniMax API Key', 'error');
    openSettings();
    return;
  }
  const userMsg = message || '[图片] 请分析这张图片';
  addMessageToUI('user', userMsg);
  chatHistory.push({ role: 'user', content: userMsg });
  input.value = '';
  addLoadingIndicator();
  try {
    let reply;
    if (currentImage) {
      reply = await window.ClimbWiseAPI.sendMultimodalMessage(message || '请分析这张攀岩相关的图片', currentImage, chatHistory.slice(0, -1));
    } else {
      reply = await window.ClimbWiseAPI.sendMessage(message, chatHistory.slice(0, -1));
    }
    removeLoadingIndicator();
    addMessageToUI('assistant', reply);
    chatHistory.push({ role: 'assistant', content: reply });
    saveChatHistory();
  } catch (error) {
    removeLoadingIndicator();
    const errMsg = window.ClimbWiseAPI.formatError?.(error) || error.message;
    addMessageToUI('assistant', ❌ 发生错误: \n\n请检查API设置或网络连接后重试。, true);
    showToast('发送失败: ' + errMsg, 'error');
  }
  clearImage();
}

function saveChatHistory() {
  const trimmed = chatHistory.slice(-50);
  localStorage.setItem('climbwise_history', JSON.stringify(trimmed));
}

// ============================================
// 图片上传
// ============================================
function setupImageUpload() {
  const dropZone = document.getElementById('imageDropZone');
  const fileInput = document.getElementById('imageInput');
  const preview = document.getElementById('imagePreview');
  const previewContainer = document.getElementById('imagePreviewContainer');
  const uploadText = document.getElementById('imageUploadText');
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('border-cliff-500'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-cliff-500'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('border-cliff-500');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleImageFile(file);
  });
  fileInput.addEventListener('change', e => { if (e.target.files[0]) handleImageFile(e.target.files[0]); });
}

function handleImageFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    currentImage = e.target.result;
    document.getElementById('imagePreview').src = currentImage;
    document.getElementById('imagePreviewContainer').classList.remove('hidden');
    document.getElementById('imageUploadText').textContent = '已选择图片';
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  currentImage = null;
  document.getElementById('imagePreviewContainer').classList.add('hidden');
  document.getElementById('imageUploadText').textContent = '点击或拖拽上传图片（可选）';
  document.getElementById('imageInput').value = '';
}

// ============================================
// 训练计划生成
// ============================================
async function generateTrainingPlan() {
  if (!window.ClimbWiseAPI?.isConfigured?.()) {
    showToast('请先在设置中配置 MiniMax API Key', 'error');
    openSettings();
    return;
  }
  const form = document.getElementById('trainerForm');
  const level = form.level.value;
  const goal = form.goal.value;
  const time = form.time.value;
  const injury = form.injury.value;
  const resultDiv = document.getElementById('trainingPlanContent');
  const resultContainer = document.getElementById('trainingPlanResult');
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="animate-pulse">生成中...</span>';
  resultContainer.classList.remove('hidden');
  resultDiv.innerHTML = '<div class="text-slate-400 text-sm">AI正在根据你的情况生成专属训练计划...</div>';
  const prompt = 作为一个专业攀岩教练，请为以下攀岩者生成一份一周训练计划：
- 水平: 
- 目标: 
- 每周可用时间: 小时


请给出详细的每周训练安排，包括每天的训练内容、强度和注意事项。回复使用中文。;
  try {
    const reply = await window.ClimbWiseAPI.sendMessage(prompt, []);
    resultDiv.innerHTML = <div class="plan-card"><p class="text-slate-200 text-sm whitespace-pre-wrap"></p></div>;
  } catch (error) {
    const errMsg = window.ClimbWiseAPI.formatError?.(error) || error.message;
    resultDiv.innerHTML = <div class="plan-card" style="border-left-color:#ef4444"><p class="text-red-300 text-sm">生成失败: </p></div>;
    showToast('生成失败: ' + errMsg, 'error');
  }
  btn.disabled = false;
  btn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>生成专属训练计划';
}

// ============================================
// 设置面板
// ============================================
function openSettings() {
  const modal = document.getElementById('settingsModal');
  const statusEl = document.getElementById('configStatus');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const groupIdInput = document.getElementById('groupIdInput');
  apiKeyInput.value = localStorage.getItem('climbwise_api_key') || '';
  groupIdInput.value = localStorage.getItem('climbwise_group_id') || '';
  if (window.ClimbWiseAPI?.isConfigured?.()) {
    statusEl.className = 'p-3 rounded-lg text-sm bg-green-900/30 text-green-400 border border-green-800';
    statusEl.textContent = '✅ API已配置';
  } else {
    statusEl.className = 'p-3 rounded-lg text-sm bg-red-900/30 text-red-400 border border-red-800';
    statusEl.textContent = '⚠️ 请配置API Key才能使用AI功能';
  }
  modal.classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.add('hidden');
}

function saveApiSettings() {
  const apiKey = document.getElementById('apiKeyInput').value.trim();
  const groupId = document.getElementById('groupIdInput').value.trim();
  if (!apiKey) {
    showToast('请输入API Key', 'error');
    return;
  }
  if (window.ClimbWiseAPI?.saveConfig) {
    window.ClimbWiseAPI.saveConfig(apiKey, groupId);
  } else {
    localStorage.setItem('climbwise_api_key', apiKey);
    localStorage.setItem('climbwise_group_id', groupId);
  }
  closeSettings();
  showToast('设置已保存', 'success');
  if (window.ClimbWiseAPI?.isConfigured?.()) {
    document.getElementById('configStatus').textContent = '✅ API已配置';
  }
}

// ============================================
// 工具函数
// ============================================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 	oast ;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ============================================
// 初始化
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  setupImageUpload();
  document.getElementById('chatInput')?.focus();
});

// Close modal on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSettings();
});
