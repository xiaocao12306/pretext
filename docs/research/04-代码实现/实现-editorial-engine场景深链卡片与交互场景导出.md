# 实现-editorial-engine场景深链卡片与交互场景导出

参见：[[功能-demo展示链]]、[[实现-editorial-engine页内摘要面板与preset诊断]]、[[实现-dynamic-layout场景深链卡片与资产源链接]]、[[实现-preset-key路由与报告对齐]]

## 涉及文件
- `pages/demos/editorial-engine.html`
- `pages/demos/editorial-engine.ts`

## 补齐点：editorial-engine 终于把“当前场景”导成可复现入口
之前 `editorial-engine` 已经有：
- `probe rail`
- `preset-card-grid`
- summary / telemetry report

但它仍然缺一个关键层：当前页面状态如何被导出成可点击的复现入口。和 [[实现-dynamic-layout场景深链卡片与资产源链接]] 对比，`editorial-engine` 之前只能“看当前状态”，不能直接把当前状态切回：
- demo 自身入口
- root alias
- report/checker 入口

这次新增 `route-card-grid`，把当前状态直接做成三张卡：
- `Demo path`
- `Root alias`
- `Report run`

## 导出协议
`editorial-engine.ts` 现在按“当前页面状态”而不是初始 URL 来回算深链：

### 命中 preset 时
- 只导出 `preset=...`

### 未命中 preset 时
- 导出 `pageWidth`
- 导出 `pageHeight`
- 导出 `orbPreset`
- 导出 `animate`
- 导出 `showDiagnostics`

这样 framed 页面、orb 布局切换、诊断面板开关都能在卡片里被重新编码；页面不再依赖“你记得最开始怎么进来的”。

## route-card 的页面职责
这组三张卡把 `editorial-engine` 的页面证据链补成四段：
- `probe rail`
- `preset context cards`
- `scenario route cards`
- `summary/report`

`probe rail` 负责快速切场景，`preset cards` 负责解释 preset 参数，`route cards` 负责把当前状态导出到其它入口，`summary/report` 则继续承担运行结果摘要。它们分工后，页面终于和 `emoji` / `justification` / `dynamic-layout` 的导出协议对齐。

## 路由归一化
这次新增了 `normalizeEditorialEnginePath()`，专门在两条入口之间切换：
- `/demos/editorial-engine`
- `/editorial-engine`

再配合 `appendReportQuery()`，页面可以把同一场景直接投影到 checker 入口，而不是让外部脚本自己拼 query。

## 设计判断
- `editorial-engine` 是强交互 demo，但这次导出的仍然是“probe 状态”而不是每个 orb 的瞬时坐标。原因是当前页面已有的稳定协议就在 preset / framing / diagnostics 这一层，瞬时拖拽坐标还没有共享到 checker 协议里。
- 这让页面导出保持和 [[实现-probe预设词汇共享到页面与checker]] 同一层语义，避免为了导出交互瞬态而发明第二套不稳定协议。
- 从 demo 研究角度看，这一步的意义不是多三张卡，而是把 `editorial-engine` 正式接进统一的“页面可见 probe 协议”。这样它不再是只有视觉效果和摘要面板的孤岛 demo。
