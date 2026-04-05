# 功能：demo 展示链

相关页面：
- `pages/demos/index.html`
- `pages/demos/accordion.*`
- `pages/demos/bubbles.*`
- `pages/demos/rich-note.*`
- `pages/demos/justification-comparison.*`
- `pages/demos/dynamic-layout.*`
- `pages/demos/editorial-engine.*`
- `pages/demos/variable-typographic-ascii.*`
- `pages/demos/masonry/*`
- `pages/emoji-test.html`

上游：[[模块-demo展示页面]]
下游：[[实现-demo投影循环与几何路由]]、[[专题-工程验证与发布面]]

## 功能定位
demo 展示链回答的问题不是“Pretext 准不准”，而是“准而且便宜之后，应用层能得到哪些新的布局能力”。

它实际覆盖了五类功能证明。

## 1. 零文本高度测量的组件布局
代表页面：
- `accordion`
- `masonry`

展示点：
- 组件能在渲染前得到文本高度
- resize 后可直接重算位置与尺寸
- 不需要插入隐藏测量 DOM 或等待 `ResizeObserver`

这对应的是最直接的产品价值：把“文本高度”从浏览器私有信息变成用户态廉价数据。

## 2. 多行 shrinkwrap
代表页面：
- `bubbles`

展示点：
- 先算出当前宽度下的行数
- 再二分搜索最小可接受宽度
- 让多行文本气泡比 CSS `fit-content` 更紧

这个能力直接建立在 `walkLineRanges()` / `layout()` 可重复调用且成本低的前提上。

## 3. mixed inline 富文本续排
代表页面：
- `rich-note`

展示点：
- 不同 font/style 的 text run 可以共存
- code span 有额外 chrome 宽度
- chip 作为原子块不能拆行
- 整体仍可在一个统一宽度预算下续排

这说明 `layoutNextLine()` 已经能从“纯文本 line breaker”升级为“富 inline 流的底层积木”。

## 4. 用户态段落算法与排版质量比较
代表页面：
- `justification-comparison`

展示点：
- 同一份段落数据可同时走 CSS native、Pretext greedy、Pretext optimal 三条路径
- soft hyphen、space stretch、river 指标都能在用户态显式计算
- 页面不仅展示结果，还展示质量指标与 visual overlay

这说明 Pretext 并不把使用者锁死在浏览器默认段落算法里。

## 5. obstacle-aware editorial flow
代表页面：
- `dynamic-layout`
- `editorial-engine`

展示点：
- 文本可以跨列连续 handoff，而不是预先拆成左右两段
- 同一段正文可以绕开标题、图片、logo、pull quote、可拖拽 orb
- 障碍几何变化后，文本能在下一帧重新投影

这是 demo 链里最强的功能声明：Pretext 不只是“测高度”，而是能支撑应用层自定义文本流系统。

## 6. 旁路测量与假设验证
代表页面：
- `variable-typographic-ascii`
- `emoji-test.html`

展示点：
- 除了 line breaking，`prepareWithSegments()` 还能做字符级宽度选择
- emoji correction 的“字号常量、近似与字体无关”假设有单独页面验证

这类功能不面向最终产品 API，但会反过来支持 engine 内部设计决策。

## 与验证页面的分工
- [[功能-浏览器准确性校验]] 负责证明“结果接近浏览器”
- [[功能-demo展示链]] 负责证明“这些结果足够便宜，所以值得用来做新界面”

两者缺一不可：
- 只有 accuracy，没有 demo，产品价值不够具体
- 只有 demo，没有 accuracy，能力声明缺乏可信证据

## 当前判断
- demo 链已经把 fast path、rich path、用户态算法扩展这三条价值线讲清楚了
- `justification-comparison` 与 `editorial-engine` 特别重要，因为它们证明 Pretext 不只是 CSS 的替代测量器，而是用户态文本排版的底层原语
- landing page 现在开始直接暴露 probe preset，而不只是给一条“点进去再自己猜 query”的 demo 链接；这让 Phase 3 的展示矩阵开始和 Phase 4 的脚本参数面真正连上
- `dynamic-layout` / `editorial-engine` 又进一步在页内补上了 probe rail，所以 preset 不再只存在于首页和脚本参数里，而是进入了 demo 自身的交互面
