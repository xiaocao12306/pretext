# 实现：dynamic-layout 资产卡片与几何可视摘要

相关文件：
- `pages/assets/openai-symbol.svg`
- `pages/assets/claude-symbol.svg`
- `pages/demos/dynamic-layout.html`
- `pages/demos/dynamic-layout.ts`

上游：[[功能-demo展示链]]
并列参考：[[实现-SVG资产到wrap-hull投影]]、[[实现-dynamic-layout报告与资产几何探针链]]、[[实现-dynamic-layout页内摘要面板与preset诊断]]

## 这张卡关注什么
这里看的不是 `dynamic-layout` 的总摘要，而是 `pages/assets/*` 驱动出来的几何结果怎样真正以页面元素的形式被展示出来。

此前这张页已经有：
- OpenAI / Claude 两个 SVG asset
- wrap hull / hit hull
- summary panel

但这些 asset 自身的几何状态仍主要埋在：
- `DynamicLayoutReport.logos.*`
- checker 输出
- 代码实现卡

页面默认打开时，用户并不能一眼看见每个 asset 当前到底投影成了什么几何状态。

## 1. 页面现在新增了两张 asset cards
这次在 `summaryPanel` 上方补了一块 `assetCardGrid`，分别渲染：
- OpenAI
- Claude

两张卡片。

每张卡都会直接显示：
- 当前 angle
- rect 宽高
- rect 原点
- layout hull 点数
- hit hull 点数

这让 `pages/assets/*` 不再只是“隐含地影响正文绕排”，而是第一次拥有默认可见的页面级几何读数。

## 2. 这些卡片直接复用页面已有 report 字段
asset cards 没有新算一套几何。

页面在 `commitFrame()` 拿到 `DynamicLayoutReport` 后，直接调用：
- `syncAssetCards(lastCommittedReport)`

然后从：
- `report.logos.openai`
- `report.logos.claude`

读出卡片内容。

也就是说，asset cards、summary panel、hash report、checker 仍然是同一口径。

## 3. 这一步把 `pages/assets/*` 的价值从“背景输入”抬升成“页面可见输出”
过去 asset 的价值主要体现在：
- 正文避障
- hit testing
- checker 摘要

这次之后，用户打开页面就能直接看到：
- 旋转以后 rect 有没有变
- 当前 layout / hit hull 点数是多少
- 两个 logo 分别在什么位置

因此 asset 不再只是 demo 内部依赖，而开始成为页面诊断的一等对象。

## 当前判断
- `dynamic-layout` 现在不只是在 summary panel 里说“logo angle 变了”，而是把两个 asset 的几何状态拆成了可见卡片
- 这一步对 `pages/assets/*` 很重要，因为它让 asset-driven wrap demo 第一次拥有真正面向人的几何可视摘要
- 对后续继续扩 asset demo 或 asset checker 来说，这种“页面直出 per-asset geometry”会比只读日志更有用
