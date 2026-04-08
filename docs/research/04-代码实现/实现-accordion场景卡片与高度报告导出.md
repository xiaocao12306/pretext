# 实现-accordion场景卡片与高度报告导出

参见：[[功能-demo展示链]]、[[实现-demo页内probe-rail与场景快捷入口]]、[[实现-demo-landing共享preset入口矩阵]]、[[实现-导航状态与报告通道]]

## 涉及文件
- `pages/probe-presets.ts`
- `pages/demos/accordion.html`
- `pages/demos/accordion.ts`
- `pages/accordion.html`
- `pages/demos/index.html`
- `pages/demos/index.ts`

## 这次补的缺口
`accordion` 之前只是一个“点击看高度是否稳定”的 demo，还没有接入统一的 probe/export 协议。它缺少：
- 命名 preset
- 页内 probe rail
- route/export 卡片
- root alias
- `report=1` 结构化回执

这次把它补成了 probe-ready 的 UI height demo。

## preset 词汇：把 page width + open item 变成共享场景
`pages/probe-presets.ts` 新增 `ACCORDION_PROBE_PRESETS`：
- `shipping-780`
- `research-780`
- `mixed-520`

这些 preset 不只是“哪个 panel 展开”，还把页面 framing 宽度一起编码进来。因为 `accordion` 的内容宽度直接决定行数和 panel 高度，所以单看 open item 不足以构成可复现场景。

## accordion 页：从点击 demo 变成可导出的场景页
`pages/demos/accordion.html` / `pages/demos/accordion.ts` 现在新增了三层结构：

### 1. `probeRail`
把固定页面宽度 + open item 场景做成页内可点击 preset。

### 2. `presetCardGrid`
每张卡直接解释：
- `page`
- `open`

### 3. `routeCardGrid`
把当前状态导出为：
- `Demo path`
- `Root alias`
- `Report run`

这让 `accordion` 不再只能手点重现，而能直接拿到稳定场景链接。

## 高度报告：把 panel 行数与高度接回统一 hash 协议
`accordion.ts` 现在会在 `report=1` 下输出结构化回执，核心字段包括：
- `presetKey`
- `pageWidth`
- `contentWidth`
- `openItemId`
- `openLineCount`
- `maxPanelHeight`
- 每个 item 的 `lineCount` / `height`

这组字段关注的是这个 demo 真正稳定的信号：
- 页面宽度是否变了
- 当前展开项行数是多少
- 哪个 panel 最高
- 各 panel 的高度分布是否和预期一致

## root alias 与 landing
这次新增了 `pages/accordion.html`，把：
- `/accordion`
- `/demos/accordion`

接成和其它 probe-ready demo 一致的双入口结构。

同时 `pages/demos/index.html` / `pages/demos/index.ts` 把 `Accordion` 卡从单个链接升级成 preset action 矩阵。这样 landing 里可以直接进入具体高度场景，而不用先进页再点开某个 panel。

## 设计判断
- `accordion` 的状态面虽然比 `bubbles` 多一维，但仍然很适合先补 route/report 协议：`page width + open panel` 就足够构成稳定场景。
- 这次没有把 DOM 真实高度和预测高度分开做双通道报告，因为当前 demo 本身就是“用 Pretext 结果驱动高度”，这里更重要的是把场景和布局摘要接回 checker 协议，而不是在页面里重复做一次自我对照。
- 从 demo 体系看，这一步说明 probe-ready 模式已经从测量/obstacle/rich-inline 场景扩展到了更典型的“预测驱动 UI 高度”场景。
