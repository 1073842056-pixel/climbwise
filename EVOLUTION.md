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

## 进化计划

### Hour 1: 架构重构 + 白底主题
- [ ] 拆分app.js为模块化结构
- [ ] 重写styles.css为白底主题
- [ ] 重构HTML组件

### Hour 2: 攀岩技术理论学习
- [ ] 学习"攀岩技术图解"知识库
- [ ] 分析100+条真实beta的特征
- [ ] 建立beta分类体系（力量型/技术型/柔韧型/综合型）

### Hour 3: 交互体验调研
- [ ] 学习Netflix/Keep/Strava的UX设计
- [ ] 学习优秀攀岩App（Rock Prodigy/Crag地牢）
- [ ] 优化手势交互和动画

### Hour 4-5: Beta算法强化
- [ ] 建立动作类型分类（campusing/knees-bar/mantel等）
- [ ] 建立难度感知系统
- [ ] 建立针对性建议生成器

### Hour 6-7: 视频分析+火柴人升级
- [ ] 优化stickman为带骨骼动画的更真实角色
- [ ] 建立动作对比系统（用户动作 vs 最优beta）
- [ ] 添加视频片段自动剪辑

### Hour 8: 完整测试+GitHub Pages部署
- [ ] 完整功能测试
- [ ] 性能优化
- [ ] 部署并汇报

---

## 迭代日志

### Round 1 (00:00)
- 完成架构梳理
- 启动攀岩技术学习
- 研究优秀App UX设计
