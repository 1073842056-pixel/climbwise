# ClimbWise - 攀岩AI助手

🧗 你的智能攀岩伙伴

## 功能特性

### 🔥 P0：线路照片分析
- 上传岩壁照片，AI自动识别手点脚点
- SVG火柴人动画展示攀爬顺序
- 提供详细的beta指导

### 🔥 P0：线路记录
- 打卡岩馆、线路编号
- 支持V系列（V0-V17）和YDS（5.10a-5.15d）双难度体系
- Send / Flash / Onsight / 尝试 多种结果记录
- 成就统计：总线路数、Send率、Flash率、连续天数
- 难度分布柱状图

### 🔥 P1：攀岩圈聊天
- 按岩馆分房间
- localStorage存储，支持演示

## 技术栈

- **前端**: HTML5 + CSS3 + JavaScript (原生)
- **样式**: Tailwind CSS (CDN)
- **AI**: MiniMax API (多模态图像分析)
- **存储**: localStorage (纯前端MVP)
- **部署**: 静态托管

## 快速开始

1. 克隆项目
2. 直接用浏览器打开 `index.html`
3. 或使用任意静态服务器：
   ```bash
   npx serve .
   # 或
   python -m http.server 8080
   ```

## 项目结构

```
climbwise/
├── index.html          # 主入口
├── styles.css          # 样式文件
├── app.js              # 主逻辑
├── lib/
│   └── api.js          # MiniMax API 调用
├── knowledge/
│   └── system-prompt.js # 攀岩教练知识库
└── README.md
```

## API配置

MiniMax API Key 已配置在 `lib/api.js` 中。

## 移动端适配

- iPhone Safari 优先
- 响应式设计
- 触摸友好

## 颜色主题

- 背景: #0f172a (深蓝黑)
- 主色: #38bdf8 (天蓝)
- 强调色: #f97316 (橙)
- 文字: #f1f5f9 / #94a3b8

## License

MIT
