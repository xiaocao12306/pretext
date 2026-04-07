# 实现-dynamic-layout与editorial预设上下文卡片

参见：[[功能-demo展示链]]、[[实现-demo页内probe-rail与场景快捷入口]]、[[实现-dynamic-layout资产卡片与几何可视摘要]]、[[实现-editorial-engine页内摘要面板与preset诊断]]

## 涉及文件
- `pages/demos/dynamic-layout.html`
- `pages/demos/dynamic-layout.ts`
- `pages/demos/editorial-engine.html`
- `pages/demos/editorial-engine.ts`

## 动机
之前两个 rich demo 都已经有 `probe rail`，但 rail 只暴露 preset 名称，页面读者仍然要回头翻 query 参数或摘要面板，才能知道每个 preset 到底锁定了什么场景。`dynamic-layout` 还多一个状态漂移问题：点击 logo 旋转以后，URL 里的 `preset=` 还在，但实际几何状态已经偏离原 preset。

这次改动把“preset 代表什么”直接做成页内卡片，并且让 active 态依据当前 demo 状态重新计算，而不是盯着初始 query。

## dynamic-layout：尺寸/角度/诊断三元组
- 在 `probe rail` 旁新增 `preset-card-grid`，每张卡固定展示：
  - 页面尺寸 `pageWidth × pageHeight`
  - `OpenAI / Claude` 的角度组合
  - `showDiagnostics` 是否开启
- `dynamic-layout.ts` 里新增 `DynamicLayoutProbeState`，把当前 viewport override、两枚 logo 角度、诊断开关组合成单一匹配输入。
- `findMatchingDynamicLayoutProbePreset()` 不再依赖初始 `presetKey`，而是用“当前页面状态”回算命中的 preset。
- `buildDynamicLayoutReport()` 也改成基于当前状态写 `presetKey`。这样用户点击 logo 造成角度漂移后，摘要面板和 report 不会继续伪装成旧 preset。

## editorial-engine：尺寸/orb 形态/动画模式卡片
- `editorial-engine` 增加同样的 `preset-card-grid`，每张卡显示：
  - 页面尺寸
  - `orbPreset`
  - `animate` 是 `live` 还是 `paused`
  - 诊断面板开关
- `EditorialEngineProbeState` 把页面 framing、orb 布局、动画开关、诊断开关汇总成统一匹配输入。
- 页面每次 render 后都会重刷 rail 和 cards，保证响应 viewport 变化，不再把 preset 仅当成初始化参数。

## 设计判断
- rail 继续承担“快速切 preset”的职责；卡片承担“说明 preset 语义”的职责。两者分开后，页面不需要把诊断面板挤成参数说明书。
- `presetKey` 只能表示“当前状态命中了哪个 preset”，不能表示“最开始是从哪个 preset 进来的”。对交互 demo 而言，前者才是可用于 checker 和页面摘要的真实语义。
- 这组卡片与 [[实现-emoji与justification预设参数卡片]] 一起，说明 demo 层已经形成统一模式：`rail -> context card -> summary/report` 三段式 probe 证据链。

## 对研究网络的意义
- [[功能-demo展示链]] 不再只是一组静态入口，而是逐步演化成“可见 probe 协议”的展示层。
- [[实现-probe预设词汇共享到页面与checker]] 现在有了更清晰的页面落点：同一套 preset 词汇既进 checker，也进 demo 里的参数语义卡。
