# 🧗 ClimbWise

> 你的私人攀岩AI教练——读线·赏线·训练·成长

**在线访问：** https://1073842056-pixel.github.io/climbwise/

---

## 核心功能

### 🧗 读线
拍照识线，AI教你怎么爬。

**流程：** 上传岩壁照片 → 选择线路颜色 → AI识别手点脚点 → 生成火柴人动画 + 个性化Beta

**特色：**
- MiniMax Vision API 图像识别
- 火柴人动画逐帧演示最优动作
- 个性化难度评分（伸展/力量/体重三维）
- 攀岩知识库支持（19种动作类型）

---

### 🎬 赏线
上传爬线视频，AI分析动作质量。

**流程：** 上传视频 → AI提取关键帧 → 动作质量评分 → 改进建议

**特色：**
- 自动识别有效攀爬片段
- 逐帧动作质量打分（1-10）
- 识别实际使用的动作类型（Campusing/DropKnee/Sloper等）
- 对比最优Beta，生成训练计划

---

### 📂 训练
视频批量归类 + 岩馆打卡。

**特色：**
- 批量上传训练视频
- AI自动归类（颜色/难度/岩馆）
- 训练日历
- 完攀/Flash/尝试统计

---

### 👤 我的
能力档案 + 训练洞察。

**特色：**
- 身高/臂展/体重/引体档案
- 能力评分（力量/核心/耐力/柔韧）
- 7天完攀趋势图
- 弱点分析（基于历史动作分析）
- 周进步追踪

---

## 技术架构

```
ClimbWise/
├── index.html          # 4-Tab页面结构
├── app.js              # 主应用逻辑
├── styles.css          # 白底主题样式
├── lib/
│   ├── storage.js      # localStorage 数据持久化
│   ├── vision.js       # 读线（MiniMax Vision API）
│   ├── stickman.js     # SVG火柴人动画引擎
│   ├── video-analysis.js # 赏线分析
│   └── knowledge.js   # 攀岩知识库
└── pages/             # 模块化页面（扩展用）
```

## 数据存储

所有数据保存在浏览器 localStorage：
- `climbwise_profile` — 用户档案
- `climbwise_route_cards` — 保存的线路
- `climbwise_gym_logs` — 训练打卡记录
- `climbwise_analysis_records` — 动作分析记录
- `climbwise_gyms` — 岩馆信息

## 开发

```bash
# 本地预览
cd climbwise
python -m http.server 8765
# 访问 http://localhost:8765

# 部署到 GitHub Pages
git push origin master
# GitHub Actions 自动部署
```

## 技术栈

- **前端：** 原生 HTML/CSS/JavaScript（无框架依赖）
- **AI：** MiniMax Vision API + MiniMax Text API
- **部署：** GitHub Pages
- **存储：** 浏览器 localStorage

## 版本

- **v5 (2026-04-02)** — 白底主题 + 知识库 + 训练洞察
- **v4 (2026-04-01)** — 4-Tab乔布斯风格架构
- **v3 (2026-03-31)** — 初始版本

---

*Made with 🦊 by ClimbWise AI*
