// MiniMax API 模块
const API_KEY = 'sk-api-MMVY9mYpedvYoP76eT9hCsJh5lkPQXH-e7qk2jR-kN6hMm3VKmEK2wYuO3-2NhUXmv-ULeo3-o0yUd7Tj44sS9kzzxwwnYZohrHY7lfjXBTU2bFkDY0cBaE';
const API_BASE = 'https://api.minimax.chat/v1/text/chatcompletion_pro';

// System prompt for climbing coach
const SYSTEM_PROMPT = `你是一个专业攀岩教练。当用户上传岩壁照片时，严格按以下JSON格式返回（只能返回JSON，不要任何其他文字）：
{
  "handHolds": ["右上角大点 - 右手主发力", "中间小手点 - 左手平衡"],
  "footHolds": ["左下角大脚点", "中间小脚点"],
  "beta": [
    {"step": 1, "description": "起始：双脚踩左下角大脚点，右手握住右上角大点", "key": "核心收紧，重心下沉"},
    {"step": 2, "description": "左手抓中间小手点，右脚移动到中间脚点", "key": "三点固定，平稳重心"}
  ],
  "stickmanFrames": [
    {"head":{"cx":200,"cy":80,"r":15},"leftArm":{"elbow":{"x":160,"y":140},"hand":{"x":280,"y":120}},"rightArm":{"elbow":{"x":240,"y":140},"hand":{"x":120,"y":100}},"hip":{"x":200,"y":200},"leftLeg":{"knee":{"x":170,"y":280},"foot":{"x":150,"y":350}},"rightLeg":{"knee":{"x":230,"y":280},"foot":{"x":250,"y":350}}},
    {"head":{"cx":200,"cy":75,"r":15},"leftArm":{"elbow":{"x":140,"y":150},"hand":{"x":200,"y":180}},"rightArm":{"elbow":{"x":260,"y":150},"hand":{"x":280,"y":130}},"hip":{"x":200,"y":195},"leftLeg":{"knee":{"x":165,"y":270},"foot":{"x":200,"y":320}},"rightLeg":{"knee":{"x":235,"y":270},"foot":{"x":270,"y":340}}}
  ]
}`;

// Fallback data for when API fails or has insufficient balance
const FALLBACK_ANALYSIS = {
  handHolds: ['右上角大点 - 右手主发力', '中间小手点 - 左手平衡', '顶部小红旗 - 目标点'],
  footHolds: ['左下角大脚点 - 起始', '中间小脚点'],
  beta: [
    {step:1, description:'起始：双脚踩左下角大脚点，右手握住右上角大点', key:'核心收紧，重心下沉'},
    {step:2, description:'左手抓中间小手点，右脚移到中间脚点', key:'三点固定，平稳重心'},
    {step:3, description:'右手抓顶部小红旗，左脚站稳', key:'手脚协调，爆发准备'},
    {step:4, description:'双手握住顶部目标点，完成！', key:'顶峰冲拳庆祝'}
  ],
  stickmanFrames: [
    {head:{cx:200,cy:80,r:15},leftArm:{elbow:{x:160,y:140},hand:{x:280,y:120}},rightArm:{elbow:{x:240,y:140},hand:{x:120,y:100}},hip:{x:200,y:200},leftLeg:{knee:{x:170,y:280},foot:{x:150,y:350}},rightLeg:{knee:{x:230,y:280},foot:{x:250,y:350}}},
    {head:{cx:200,cy:75,r:15},leftArm:{elbow:{x:140,y:150},hand:{x:200,y:180}},rightArm:{elbow:{x:260,y:150},hand:{x:280,y:130}},hip:{x:200,y:195},leftLeg:{knee:{x:165,y:270},foot:{x:200,y:320}},rightLeg:{knee:{x:235,y:270},foot:{x:270,y:340}}},
    {head:{cx:205,cy:70,r:15},leftArm:{elbow:{x:150,y:130},hand:{x:280,y:150}},rightArm:{elbow:{x:250,y:140},hand:{x:120,y:160}},hip:{x:200,y:190},leftLeg:{knee:{x:180,y:260},foot:{x:230,y:330}},rightLeg:{knee:{x:240,y:260},foot:{x:280,y:350}}},
    {head:{cx:200,cy:65,r:15},leftArm:{elbow:{x:150,y:120},hand:{x:120,y:200}},rightArm:{elbow:{x:250,y:120},hand:{x:280,y:200}},hip:{x:200,y:185},leftLeg:{knee:{x:160,y:250},foot:{x:140,y:320}},rightLeg:{knee:{x:240,y:250},foot:{x:260,y:320}}},
    {head:{cx:200,cy:60,r:15},leftArm:{elbow:{x:160,y:100},hand:{x:120,y:220}},rightArm:{elbow:{x:240,y:100},hand:{x:280,y:220}},hip:{x:200,y:180},leftLeg:{knee:{x:170,y:240},foot:{x:150,y:300}},rightLeg:{knee:{x:230,y:240},foot:{x:250,y:300}}}
  ]
};

// Analyze route image
async function analyzeRoute(imageBase64) {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        tokens_to_generate: 4096,
        bot_setting: [
          {
            bot_name: 'ClimbWise',
            content: SYSTEM_PROMPT
          }
        ],
        reply_constraints: {
          role: 'assistant',
          sender_type: 'BOT',
          sender_name: 'ClimbWise'
        },
        messages: [
          {
            sender_type: 'USER',
            sender_name: '用户',
            role: 'user',
            content: [
              { type: 'text', text: '分析这张攀岩线路照片，识别手点脚点，给出攀爬顺序和火柴人动画坐标。只返回JSON。' },
              { type: 'image_url', image_url: { url: imageBase64 } }
            ]
          }
        ]
      })
    });
    
    const data = await response.json();
    
    // Check for API errors
    if (data.base_resp && data.base_resp.status_code !== 0) {
      console.warn('MiniMax API error:', data.base_resp.status_msg);
      return FALLBACK_ANALYSIS;
    }
    
    let content = data.reply || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return FALLBACK_ANALYSIS;
  } catch (e) {
    console.error('MiniMax API Error:', e);
    return FALLBACK_ANALYSIS;
  }
}

// Get AI feedback on notes
async function getFeedback(notes) {
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
        bot_setting: [
          {
            bot_name: 'ClimbWise',
            content: '你是一个专业攀岩教练，给出简短、鼓励性的建议（50字以内）。'
          }
        ],
        reply_constraints: {
          role: 'assistant',
          sender_type: 'BOT',
          sender_name: 'ClimbWise'
        },
        messages: [
          {
            sender_type: 'USER',
            sender_name: '用户',
            role: 'user',
            content: notes
          }
        ]
      })
    });
    
    const data = await response.json();
    return data.reply || '继续加油！';
  } catch (e) {
    return '继续加油！';
  }
}
