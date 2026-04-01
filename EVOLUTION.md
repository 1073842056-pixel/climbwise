# ClimbWise 进化追踪

> 2026-04-02 大磊委托：专注迭代ClimbWise，持续到醒来

## 进化原则
- 每10分钟一轮迭代
- 每小时汇报进展给大磊
- 先梳理再优化，每轮有交付物
- 不关闭gateway，不重启

---

## 现有架构分析

### 文件结构
```
climbwise/
├── index.html    19KB   4-Tab页面
├── app.js       30KB   全部业务逻辑（单文件）
├── styles.css   14KB   黑色主题样式
├── lib/
│   ├── storage.js        7.7KB  localStorage封装
│   ├── vision.js        11.6KB 读线API（MiniMax Vision）
│   ├── stickman.js       6.8KB  SVG火柴人渲染
│   ├── video-analysis.js 8.1KB  赏线分析
│   └── api.js           6.1KB  MiniMax API封装
└── .github/workflows/pages.yml  GitHub Pages配置
```

### 当前Tab结构
1. **读线** - 上传照片→选颜色→AI识别→火柴人动画+beta
2. **赏线** - 上传视频→帧提取→动作评分+改进建议
3. **训练** - 视频归类→岩馆打卡→训练日历
4. **我的** - 能力档案+训练日历+岩馆打卡+我的线路

### 核心问题（待优化）
1. **黑色主题** → 大磊要求白底
2. **火柴人太简陋** → 只有线条火柴人
3. **Beta推荐无理论支撑** → 需要学习真实攀岩技术
4. **评分算法简单** → 仅靠臂展/体重/引体三个维度
5. **视频分析弱** → 仅提取帧，无真正姿态分析
6. **无训练计划** → 只有记录，没有进阶指导
7. **单文件app.js** → 30KB过大，难以维护
8. **无离线支持** → 纯前端，无service worker

### API调用链
```
用户上传照片 → vision.js → MiniMax Vision API → 手点脚点JSON
                                              ↓
用户档案(臂展/体重/引体) → 评分算法 → 个性化beta
                                              ↓
stickman.js → SVG火柴人动画（逐帧渲染）
```

---

## 迭代日志（完整版）

### Round 1 (00:00) - 架构梳理 + 白底主题基础
- 完成架构梳理（5个lib模块）
- 新建 EVOLUTION.md 进化追踪文档
- styles.css 白底主题系统 v1 完成
  - 纯白背景 #ffffff
  - 橙色强调 (#ff6b35) + 青色辅助 (#00b4a6)
  - 大圆角卡片 + 柔和阴影
  - iOS原生字体风格
- 推送 GitHub Pages

### Round 2 (00:10) - 知识库 + app.js 重构
- 新建 knowledge.js (11.8KB)：19种动作类型+10种Beta模式+评分算法
  - CLIMBING_KNOWLEDGE 对象：MOVE_TYPES/BETA_PATTERNS/DIFFICULTY_FACTORS/GRADE_CHARACTERISTICS/CLIMBER_STYLES
  - generateSuggestions() 个性化建议生成器
  - evaluateRouteMatch() 线路适配度评估
  - scoreToGrade() 分数转V级
- app.js 重构整合 28KB
- knowledge.js 集成到读线流程
- 推送 GitHub Pages

### Round 3 (00:20) - 火柴人 v2 + Vision 知识融合
- stickman.js 全面升级 v2：
  - 渐变身体（linearGradient）
  - 关节圆点（肩/肘/膝）
  - 眼睛细节
  - SVG发光滤镜（glow-orange/glow-blue）
  - 帧间插值平滑过渡
  - 运动轨迹虚线
- vision.js 知识融合：
  - Beta每步含 moveType + style 标签
  - Fallback含19种动作类型描述
  - 新增 betaPattern 字段
- 推送 GitHub Pages

### Round 4 (00:30) - 视频分析升级
- video-analysis.js 升级：
  - 新增 detectedMoves 识别动作类型数组
  - 新增 trainingPlan 个性化训练计划
  - Fallback含专业动作类型
- app.js 新增：
  - 识别到的动作类型标签展示
  - 训练计划卡片
  - Beta分析新增 betaPattern
- 推送 GitHub Pages

### Round 5 (00:40) - Beta对比 + 分析记录持久化
- Beta对比卡片（新功能）：
  - 用户Beta vs 最优Beta并排展示
  - 匹配度百分比
  - 侧边比较视觉设计
- storage.js 升级：
  - 新增 ANALYSIS_RECORDS storage key
  - saveAnalysisRecord() / getAnalysisRecords()
  - getTrainingInsights() 计算弱点+周趋势+进步
  - computeWeeklyImprovement() 本周vs上周对比
- app.js：赏线保存时写入analysis_records
- 推送 GitHub Pages

### Round 6 (00:50) - 训练洞察UI
- "我的"页面新增训练洞察卡片：
  - 7天完攀趋势柱状图（flex实现）
  - 弱点优先级标签（核心/换脚/肩部等）
  - 周对比进步箭头（↑↓→）
- switchPage 自动刷新训练洞察
- index.html 新增 training-insights div
- 推送 GitHub Pages

### Round 7 (00:60) - 最终整理
- README.md 完整文档
- 全部推送 GitHub Pages
- 功能完整性最终检查


### 精读 Round 1-3 (01:00-01:30)
- R1: Prompt升级4维度格式(hand/foot/hip/body)+坐标校验
- R2: Beta自动播放(1.5s步进)+步骤指示器
- R3: 岩壁照片手点脚点标注(蓝色手/绿色脚+emoji+序号)

### 精读 Round 4 (01:40) - 消干扰+路线阅读框架
- prompt融入路线阅读5步法(起点终点→Hold角色→难点定位→手脚配对→休息点)
- beta新增cruxStep/restPoint标记
- holds新增holdRole字段(pulloff/directional/stabilizer/enabler/deceptive)
- 手脚配对格式强化
- 标注升级:步骤序号+更大发光效果
- drawHoldsOverlay只显示所选颜色点(其他颜色消除)

### 精读 Round 7 (01:50) - 火柴人步骤高亮
- 火柴人当前步骤用到的手点脚点高亮(白色边框+外圈)
- _isInStepHold()距离匹配高亮
- beta步骤坐标提取驱动姿态

### 精读 Round 8 (02:00) - 读线结果页分层
- 顶部概览区:难点(cruxDescription)+体感评分+起点说明
- Beta卡片突出展示(当前步骤高亮)
- 移除重复的底部难度说明
- .beta-card CSS类样式继承

### 精读 Round 9 (02:10) - UX最终打磨
- beta-card使用CSS类样式,移除冗余inline覆盖
- 概览区cruxText/difficultyReason合并显示
- 移除底部重复的难度说明元素