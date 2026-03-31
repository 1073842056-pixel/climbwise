# ClimbWise - AI攀岩私教

> 你的AI攀岩私教，随时随地的专业指导

![ClimbWise](https://img.shields.io/badge/ClimbWise-AI%20Climbing%20Coach-blue?style=for-the-badge&logo=mountain)

## 产品简介

ClimbWise 是一款AI驱动的攀岩助手Web App，为攀岩爱好者提供专业、个性化的指导。

## 核心功能

### 1. AI 智能对话
与AI教练实时交流，获取攀岩技术动作、训练计划、伤病预防等专业建议。支持图片上传，让AI分析你的攀爬姿态。

### 2. 训练计划生成器
根据你的目标、水平和时间，生成专属的攀岩训练计划。支持周期化训练设计。

### 3. 技术动作指导
学习标准的技术动作，包括：
- 脚法（ smear, frog, heel hook等）
- 手部动作（crimping, open grip, pinch等）
- 身体姿态（flag, drop knee, back step等）

### 4. 伤病预防与恢复
了解常见攀岩伤病的预防和康复方法，保护自己的身体。

### 5. 营养与心理
科学补充营养，建立比赛和红点的心态。

## 技术栈

- **前端**: HTML5 + CSS3 (Tailwind CSS) + JavaScript
- **AI**: MiniMax API (多模态大模型)
- **部署**: Vercel

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/climbwise.git
cd climbwise

# 本地开发（直接打开index.html即可）
# 或使用任意静态服务器
npx serve .
```

## 项目结构

```
climbwise/
├── index.html          # 主页
├── styles.css          # 样式
├── app.js              # 主逻辑
├── pages/
│   ├── chat.html       # AI对话页面
│   └── trainer.html    # 训练计划生成器
├── lib/
│   └── api.js          # MiniMax API封装
├── knowledge/
│   └── system-prompt.js # 攀岩知识库
└── README.md
```

## 配置

在 `lib/api.js` 中配置你的 MiniMax API Key：

```javascript
const API_KEY = 'YOUR_MINIMAX_API_KEY';
const BASE_URL = 'https://api.minimax.chat';
```

## 关于

© 2026 ClimbWise. 用 ❤️ 攀岩
