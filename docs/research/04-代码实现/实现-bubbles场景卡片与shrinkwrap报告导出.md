# 实现-bubbles场景卡片与shrinkwrap报告导出

参见：[[功能-demo展示链]]、[[实现-demo页内probe-rail与场景快捷入口]]、[[实现-demo-landing共享preset入口矩阵]]、[[实现-导航状态与报告通道]]

## 涉及文件
- `pages/probe-presets.ts`
- `pages/demos/bubbles.html`
- `pages/demos/bubbles.ts`
- `pages/bubbles.html`
- `pages/demos/index.html`
- `pages/demos/index.ts`

## 这次补的是哪条缺口
`bubbles` 之前已经是一个真实可跑的 shrinkwrap demo，但它还停留在“拖 slider 看效果”的阶段，缺少和 `dynamic-layout` / `editorial-engine` / `emoji` / `justification` 对齐的 probe 证据链：
- 没有 preset vocabulary
- 没有页内场景导出卡
- 没有 root alias
- 没有 report hash 输出
- landing 里也还只是单个普通链接

这次把它补成可见的 Phase 3 场景页，而不再只是一个孤立 demo。

## preset 词汇：把 chat width 变成可共享场景
`pages/probe-presets.ts` 新增 `BUBBLE_PROBE_PRESETS`：
- `narrow-260`
- `default-340`
- `wide-460`

这些 preset 的意义很直接：不是抽象模式，而是 shrinkwrap 对比里真正决定聊天气泡宽度预算的 `chatWidth`。这样 landing、页内 rail、route card 和未来 checker 可以共用同一套词汇。

## bubbles 页：从 slider demo 变成 probe-ready page
`pages/demos/bubbles.html` / `pages/demos/bubbles.ts` 现在新增了三层页内结构：

### 1. `probeRail`
把固定宽度场景做成可点击入口，而不是继续要求用户手改 query。

### 2. `presetCardGrid`
每张卡直接解释当前 preset 的含义：
- `chat`
- `bubble max`

### 3. `routeCardGrid`
把当前状态导出成三种入口：
- `Demo path`
- `Root alias`
- `Report run`

其中 `Report run` 不再只是视觉入口，而是真的会触发 `report=1` 并通过 hash 输出 shrinkwrap 摘要。

## report 输出：把 bubbles 接回导航报告协议
`bubbles.ts` 现在会在 `report=1` 下使用 [[实现-导航状态与报告通道]] 的同一套 hash 协议输出：
- `presetKey`
- 当前 `chatWidth`
- `bubbleMaxWidth`
- 当前 viewport 下的 `maxChatWidth`
- `totalWastedPixels`
- `totalSavedWidth`
- `maxSavedWidth`
- `maxCssWidth`
- `maxTightWidth`

这意味着 `bubbles` 不再只是“目测省了多少空白”，而是能把 shrinkwrap 的结果编码成结构化回执。

## root alias 与 landing：把场景入口拉通
这次还新增了 `pages/bubbles.html`，把：
- `/bubbles`
- `/demos/bubbles`

接成和其它 probe-ready demo 一致的双入口关系。

同时 `pages/demos/index.html` / `pages/demos/index.ts` 把 bubbles 卡从单个 `<a>` 升级成 preset action 矩阵。这样 landing 里终于能直接点到具体 bubbles 场景，而不是只能先进入页面再拖 slider。

## 设计判断
- `bubbles` 的核心变量只有一个 `chatWidth`，所以它是最适合先做成 probe-ready 的传统 demo。它不需要像 `dynamic-layout` 那样导出复杂几何状态，也能形成完整场景协议。
- 这次没有把每条消息的瞬时 line metrics 全量塞进 report；当前保留的是场景级摘要。这样既能服务 checker/快照，又不会把 hash 报告膨胀成页面内调试 dump。
- landing 的 bubbles 卡升级后，`pages/demos/*` 不再只有四个“富 demo”拥有 preset 入口；shrinkwrap 这条线也正式进入同一矩阵。
