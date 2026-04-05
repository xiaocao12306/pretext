# 模块：demo 展示页面

相关文件：
- `pages/demos/index.html`
- `pages/demos/accordion.html`
- `pages/demos/accordion.ts`
- `pages/demos/bubbles.html`
- `pages/demos/bubbles.ts`
- `pages/demos/bubbles-shared.ts`
- `pages/demos/rich-note.html`
- `pages/demos/rich-note.ts`
- `pages/demos/justification-comparison.html`
- `pages/demos/justification-comparison.ts`
- `pages/demos/justification-comparison.data.ts`
- `pages/demos/justification-comparison.model.ts`
- `pages/demos/justification-comparison.ui.ts`
- `pages/demos/dynamic-layout.html`
- `pages/demos/dynamic-layout.ts`
- `pages/demos/dynamic-layout-text.ts`
- `pages/demos/editorial-engine.html`
- `pages/demos/editorial-engine.ts`
- `pages/demos/wrap-geometry.ts`
- `pages/demos/variable-typographic-ascii.html`
- `pages/demos/variable-typographic-ascii.ts`
- `pages/demos/masonry/index.html`
- `pages/demos/masonry/index.ts`
- `pages/demos/masonry/shower-thoughts.json`
- `pages/emoji-test.html`
- `pages/justification-comparison.html`
- `pages/assets/openai-symbol.svg`
- `pages/assets/claude-symbol.svg`

上游：[[01-仓库地图]]、[[01-项目总览]]、[[模块-公共API与Prepared模型]]
下游：[[功能-demo展示链]]、[[功能-editorial-engine交互障碍与多栏续排探针]]、[[实现-demo投影循环与几何路由]]

## 模块定位
这一层不是浏览器 ground-truth 校验页，也不是发布包的一部分，而是 Pretext 的 dogfooding 面。

它承担的核心职责是：
- 把库的 API 变成“用户能看懂的界面能力”
- 验证 Pretext 不只会预测高度，还能支撑用户态布局系统
- 给 GitHub Pages 静态站点提供面向外部的案例入口

和 [[模块-浏览器验证页面]] 相比，这里的重点不是“和浏览器逐条对账”，而是“如果文本几何足够便宜，前端还能做什么”。

## 页面簇分工

### 1. Demo 入口与兼容别名
- `pages/demos/index.html` 是静态 landing page，按能力类型组织 demo 卡片。
- `pages/justification-comparison.html` 只是一个顶层 redirect，真正内容在 `/demos/justification-comparison`。

这说明仓库已经把 demo 视为独立展示面，而不再是零散的试验页面。

### 2. 高度预测与 shrinkwrap demo
- `accordion.ts` 用 `prepare()` + `layout()` 预估展开区高度，只读取容器宽度与行高，不读正文高度。
- `masonry/index.ts` 对全部卡片文本预先 `prepare()`，随后在 resize/scroll 时只做列分配与视窗裁剪。
- `bubbles-shared.ts` / `bubbles.ts` 则更进一步：先得到常规 wrap 结果，再用二分搜索找到“保持同样行数的最窄宽度”，实现多行 chat bubble shrinkwrap。

这一组页面证明 fast path 不只是“算一个总高度”，而是可以支持：
- 可动画折叠 UI
- 近实时的瀑布流排布
- 多行文本的 tight bounding box 搜索

### 3. mixed inline 与用户态排版 demo
- `rich-note.ts` 把内容拆成 text/code/link/chip 四类 inline item。
- 文本 run 用 `prepareWithSegments()` + `layoutNextLine()` 流式续排。
- chip 保持 atomic，不允许被拆断。
- inline 之间的 gap 不是依赖 DOM inline layout，而是先通过 `prepareWithSegments('A A') - prepareWithSegments('AA')` 估算 collapsed space width，再在用户态重建。

- `justification-comparison.model.ts` 则把 Pretext 推到另一个方向：
  - 一条路径是 greedy + 可见 soft hyphen
  - 一条路径是带 badness 的全局最优断行
  - `justification-comparison.ui.ts` 用 canvas 重绘列排版，再和 CSS justification 并排比较 river / spacing drift

这说明 rich API 的价值不只在“拿到 line.text”，而在“把浏览器本来没暴露的段落级排版控制权交回用户态”。

### 4. editorial / obstacle-aware demo
- `dynamic-layout.ts` 是 logo-aware 的固定视口 editorial spread：
  - 标题本身通过 Pretext fit font size
  - 左右两栏共享一个连续 cursor
  - OpenAI / Claude logo 的外轮廓从 SVG alpha 推导而来
  - 文本逐 line band 绕开标题与 logo 几何体
- `editorial-engine.ts` 进一步把障碍物换成可拖拽、可暂停、持续运动的 orb，并加入 pull quote、drop cap、多列 handoff 与选择态处理。
- 现在它还接上了 query 参数、telemetry panel 与 `editorial-engine-check`，开始从“互动展示页”过渡到“可批量复现的 orb-routing probe”。
- `wrap-geometry.ts` 是这类 demo 的共享几何内核：把 SVG 栅格 alpha 变成 normalized wrap hull，再按 band 求 blocked interval，并 carve 出可排版 slot。

这一簇页面说明 Pretext 的 rich path 不是附属功能，而是可以作为“手工文本流系统”的几何内核。

### 5. 旁路测量与研究性页面
- `variable-typographic-ascii.ts` 不做断行，而是用 `prepareWithSegments()` 测字符宽度，为 proportional ASCII 选择更合适的 glyph。
- `pages/emoji-test.html` 是单页实验工具：批量对比 canvas 与 DOM emoji 宽度差，验证“emoji correction 是否按字号近似常量、是否基本与 font family 无关”。

这类页面虽然不在正式验证链路里，但它们承担了 engine 设计假设的可视化探针角色。

## 共通实现模式

### 1. prepare once, render many
- `accordion`、`masonry`、`bubbles`、`rich-note`、`dynamic-layout`、`editorial-engine` 都显式缓存 prepared 结果。
- demo 页面普遍把 font ready 当成第一次稳定 render 的前置条件。

### 2. 渲染循环与输入解耦
- slider / resize / pointer 事件只写入 state 或 queued events。
- 真正计算统一放到 `requestAnimationFrame()` 中。

### 3. DOM 只负责投影，不负责求几何
- 多数 demo 的 DOM 只承担容器宽度读取、节点池化、绝对定位投影。
- 文本是否换行、每行宽度是多少、该落在哪个 slot，主要都在 JS 里完成。

### 4. 资产文件是几何输入，不只是装饰资源
- `openai-symbol.svg` / `claude-symbol.svg` 不只是被 `<img>` 展示。
- 它们会先进入 `wrap-geometry.ts` 的 alpha 扫描流程，变成文本避障 hull 与 hit-test polygon。

## 当前判断

### 值得借鉴
- demo 层很好地把 fast path、rich path、用户态 layout engine 三类能力拆开展示了
- 很多页面都坚持“不用 DOM 测文本高度/换行结果”这个约束，因此有真实 dogfooding 价值
- `dynamic-layout` / `editorial-engine` 说明 cursor handoff + line slot routing 已经足够支撑连续文本流，而不只是产出一组 `lines[]`
- `editorial-engine` 新接入 report/checker 后，说明 interaction-driven demo 也能在不变成正式 snapshot 的前提下，先进入“半正式探针”阶段

### 风险点
- `editorial-engine.ts` 与 `dynamic-layout.ts` 已经接近“小型应用”，后续若继续扩展，可能需要把共享投影/几何层再抽薄
- `emoji-test.html` 已经接上 hash report 与 `emoji-check`，但仍不是 accuracy/corpus 那种正式快照 gate；它目前更像“半正式探针”，适合持续核对 correction 假设，不适合承载大体量历史快照
