/**
 * ClimbWise - MiniMax API 封装
 * 支持文字对话和多模态（图片+文字）对话
 */

// ============================================
// 配置 - 请替换为你的 MiniMax API 密钥
// ============================================
const CONFIG = {
  // MiniMax API Key - 请从 MiniMax 开放平台获取
  API_KEY: localStorage.getItem('climbwise_api_key') || '',
  
  // MiniMax API Base URL
  BASE_URL: 'https://api.minimax.chat',
  
  // 模型名称
  MODEL: 'MiniMax-M2-M2',
  
  // Group ID (可选，部分接口需要)
  GROUP_ID: localStorage.getItem('climbwise_group_id') || '',
  
  // 默认系统提示词
  SYSTEM_PROMPT: `你是ClimbWise，一款专业的AI攀岩私教助手。专业、实用、易懂是你的风格。安全第一，循序渐进。`,

  // 超时时间（毫秒）
  TIMEOUT: 60000,
};

// API状态管理
const APIState = {
  isLoading: false,
  lastError: null,
  lastResponse: null,
};

// ============================================
// 核心API调用函数
// ============================================

/**
 * 发送文字消息到 MiniMax API
 * @param {string} message - 用户消息
 * @param {Array} history - 对话历史 [{role: 'user'|'assistant', content: '...'}]
 * @param {Function} onChunk - 流式回调，每收到一个chunk调用一次
 * @returns {Promise<string>} 完整回复文本
 */
async function sendMessage(message, history = [], onChunk = null) {
  if (!CONFIG.API_KEY) {
    throw new Error('请先配置 MiniMax API Key。打开设置面板输入你的API密钥。');
  }

  APIState.isLoading = true;
  APIState.lastError = null;

  try {
    // 构建消息历史
    const messages = [
      { role: 'system', content: CONFIG.SYSTEM_PROMPT },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const response = await fetchWithTimeout(
      `${CONFIG.BASE_URL}/v1/text/chatcompletion_pro?GroupId=${CONFIG.GROUP_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.API_KEY}`,
        },
        body: JSON.stringify({
          model: CONFIG.MODEL,
          messages: messages,
          temperature: 0.7,
          top_p: 0.95,
          max_tokens: 2048,
          stream: false,
        }),
      },
      CONFIG.TIMEOUT
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `API错误: ${response.status}`);
    }

    // 解析响应
    const reply = data.choices?.[0]?.message?.content || '';
    APIState.lastResponse = reply;
    APIState.isLoading = false;
    return reply;

  } catch (error) {
    APIState.lastError = error.message;
    APIState.isLoading = false;
    throw error;
  }
}

/**
 * 发送多模态消息（图片+文字）到 MiniMax API
 * @param {string} text - 文字消息
 * @param {string|File} image - 图片URL或File对象
 * @param {Array} history - 对话历史
 * @returns {Promise<string>} 完整回复文本
 */
async function sendMultimodalMessage(text, image, history = []) {
  if (!CONFIG.API_KEY) {
    throw new Error('请先配置 MiniMax API Key。打开设置面板输入你的API密钥。');
  }

  APIState.isLoading = true;
  APIState.lastError = null;

  try {
    // 处理图片
    let imageBase64 = null;
    let imageType = 'image/jpeg';

    if (image instanceof File) {
      imageBase64 = await fileToBase64(image);
      imageType = image.type || 'image/jpeg';
    } else if (typeof image === 'string' && image.startsWith('data:')) {
      imageBase64 = image.split(',')[1];
      imageType = image.split(';')[0].split(':')[1];
    } else if (typeof image === 'string') {
      // 如果是URL，需要先下载
      imageBase64 = await urlToBase64(image);
    }

    // 构建多模态消息
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: text,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${imageType};base64,${imageBase64}`,
            },
          },
        ],
      },
    ];

    // 添加历史（如果是多模态API，需要特殊处理）
    // 这里使用简化的方式：将历史作为文本附加
    if (history.length > 0) {
      const historyText = history
        .map(h => `${h.role === 'user' ? '用户' : '助手'}: ${h.content}`)
        .join('\n');
      messages.unshift({
        role: 'system',
        content: CONFIG.SYSTEM_PROMPT + `\n\n对话历史:\n${historyText}`,
      });
    }

    const response = await fetchWithTimeout(
      `${CONFIG.BASE_URL}/v1/multimodal/text_generation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.API_KEY}`,
        },
        body: JSON.stringify({
          model: CONFIG.MODEL,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      },
      CONFIG.TIMEOUT
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `API错误: ${response.status}`);
    }

    const reply = data.choices?.[0]?.message?.content || '';
    APIState.lastResponse = reply;
    APIState.isLoading = false;
    return reply;

  } catch (error) {
    APIState.lastError = error.message;
    APIState.isLoading = false;
    throw error;
  }
}

/**
 * 检查API配置是否完整
 * @returns {boolean}
 */
function isConfigured() {
  return CONFIG.API_KEY && CONFIG.API_KEY.length > 0;
}

/**
 * 保存API配置
 * @param {string} apiKey
 * @param {string} groupId
 */
function saveConfig(apiKey, groupId = '') {
  CONFIG.API_KEY = apiKey;
  CONFIG.GROUP_ID = groupId;
  localStorage.setItem('climbwise_api_key', apiKey);
  localStorage.setItem('climbwise_group_id', groupId);
}

/**
 * 清除API配置
 */
function clearConfig() {
  CONFIG.API_KEY = '';
  CONFIG.GROUP_ID = '';
  localStorage.removeItem('climbwise_api_key');
  localStorage.removeItem('climbwise_group_id');
}

/**
 * 获取当前配置状态
 * @returns {Object}
 */
function getConfig() {
  return {
    isConfigured: isConfigured(),
    hasGroupId: !!CONFIG.GROUP_ID,
    model: CONFIG.MODEL,
  };
}

// ============================================
// 辅助函数
// ============================================

/**
 * 超时fetch封装
 */
async function fetchWithTimeout(url, options, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * File对象转Base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * URL转Base64 (需要CORS代理)
 */
async function urlToBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await fileToBase64(blob);
  } catch (error) {
    throw new Error('无法加载图片，请确保图片URL可访问');
  }
}

/**
 * 格式化错误消息
 */
function formatError(error) {
  if (error.name === 'AbortError') {
    return '请求超时，请检查网络连接后重试';
  }
  if (error.message.includes('Failed to fetch')) {
    return '网络错误，请检查网络连接';
  }
  if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    return 'API密钥无效，请检查配置';
  }
  if (error.message.includes('403') || error.message.includes('Forbidden')) {
    return '没有权限，请检查API配额';
  }
  if (error.message.includes('429') || error.message.includes('Rate limit')) {
    return '请求过于频繁，请稍后再试';
  }
  return error.message || '发生未知错误';
}

// ============================================
// 导出
// ============================================

window.ClimbWiseAPI = {
  sendMessage,
  sendMultimodalMessage,
  isConfigured,
  saveConfig,
  clearConfig,
  getConfig,
  formatError,
  state: APIState,
};
