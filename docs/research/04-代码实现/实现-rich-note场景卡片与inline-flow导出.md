# 实现-rich-note场景卡片与inline-flow导出

参见：[[功能-demo展示链]]、[[实现-demo页内probe-rail与场景快捷入口]]、[[实现-demo-landing共享preset入口矩阵]]、[[实现-导航状态与报告通道]]

## 涉及文件
- `pages/probe-presets.ts`
- `pages/demos/rich-note.html`
- `pages/demos/rich-note.ts`
- `pages/rich-note.html`
- `pages/demos/index.html`
- `pages/demos/index.ts`

## 这次补的缺口
`rich-note` 之前已经是一个真实的 inline-flow demo，但还停留在“拖 slider 看宽度变化”的阶段。它没有：
- 命名 preset
- 页内 probe rail
- route/export 卡片
- root alias
- `report=1` 结构化回执

这次把 `rich-note` 从单页交互 demo 补成了 probe-ready 页面。

## preset 词汇：把 body width 变成可共享场景
`pages/probe-presets.ts` 新增 `RICH_NOTE_PROBE_PRESETS`：
- `narrow-320`
- `default-516`
- `wide-680`

这些 preset 不是抽象主题，而是富文本 note 真正的行宽预算。它们后续可以被 landing、route cards 和 checker 共用。

## rich-note 页：从 slider demo 变成可导出的场景页
`pages/demos/rich-note.html` / `pages/demos/rich-note.ts` 现在新增了三层结构：

### 1. `probeRail`
把固定宽度场景变成页内可点击 preset。

### 2. `presetCardGrid`
每张卡直接解释：
- `body`
- `shell`

也就是文本体宽和 note 外壳宽度。

### 3. `routeCardGrid`
把当前状态导出为：
- `Demo path`
- `Root alias`
- `Report run`

这让 `rich-note` 不再只能通过 slider 重现，而是可以直接复制一个稳定场景入口。

## inline-flow report：把页面摘要接回统一 hash 协议
`rich-note.ts` 现在会在 `report=1` 下输出结构化回执，核心字段包括：
- `presetKey`
- `bodyWidth`
- `maxBodyWidth`
- `noteWidth`
- `lineCount`
- `noteBodyHeight`
- `chipCount`
- `fragmentCount`

这组字段关注的是 inline-flow demo 真正的稳定信号：
- 当前宽度预算是多少
- note 变成了几行
- 产生了多少 fragment
- atomic chip 数量是否保持在预期层面

## root alias 与 landing
这次新增了 `pages/rich-note.html`，把：
- `/rich-note`
- `/demos/rich-note`

接成和其它 probe-ready demo 一致的双入口结构。

同时 `pages/demos/index.html` / `pages/demos/index.ts` 把 `Rich Text` 卡从单个链接升级成 preset action 矩阵。这样 landing 里第一次能直接进入具体 rich-note 场景，而不是先进页再拖 slider。

## 设计判断
- `rich-note` 和 `bubbles` 一样，都属于“单一宽度状态，但 layout 结果高度结构化”的 demo，所以很适合先补 route/report 协议。
- 这次没有把每一行 fragment 全量塞进 hash report，只保留了场景级摘要。这样仍然方便 checker 或 snapshot 消费，同时避免把报告变成巨型 DOM dump。
- 从 demo 体系看，`rich-note` 的加入说明 probe-ready 模式已经从 obstacle/emoji 这些重型页面，扩展到了 inline-flow 这种更纯粹的 rich text userland demo。
