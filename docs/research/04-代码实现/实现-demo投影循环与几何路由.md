# 实现：demo 投影循环与几何路由

相关文件：
- `pages/demos/bubbles-shared.ts`
- `pages/demos/rich-note.ts`
- `pages/demos/justification-comparison.model.ts`
- `pages/demos/justification-comparison.ui.ts`
- `pages/demos/wrap-geometry.ts`
- `pages/demos/dynamic-layout.ts`
- `pages/demos/editorial-engine.ts`
- `pages/demos/masonry/index.ts`
- `pages/demos/accordion.ts`
- `pages/demos/variable-typographic-ascii.ts`
- `pages/emoji-test.html`

上游：[[模块-demo展示页面]]、[[功能-demo展示链]]
并列参考：[[实现-layout热路径]]、[[实现-rich-line-API调用链]]

## 这张卡关注什么
这里不再按页面逐个介绍，而是总结 demo 层反复出现的实现套路：
- 怎么准备文本
- 怎么在动画帧里算投影
- 怎么把障碍几何转成 line slot
- 怎么避免 demo 自己退化成 DOM 测量循环

## 1. prepare once，交互时只重算投影

典型例子：
- `masonry/index.ts`：`rawThoughts.map(text => prepare(text, font))`
- `bubbles-shared.ts`：`prepareBubbleTexts()`
- `dynamic-layout.ts`：`preparedByKey`
- `rich-note.ts`：初始化阶段把每个 inline item 的 prepared 结果与整段宽度都算好
- `justification-comparison.model.ts`：`createDemoResources()` 一次性准备 base/hyphenated paragraphs

这和主库的冷/热路径设计完全同构：
- 冷路径：文本预处理与宽度准备
- 热路径：宽度变化、障碍物变化、交互输入变化时的重新投影

## 2. 事件只入队，真正计算统一放到 rAF

demo 层普遍不是在事件回调里直接重排，而是：
- input / resize / pointer 事件只更新 state
- `scheduleRender()` 去重
- 真正布局在下一帧统一执行

这样做有两个结果：
- 避免一帧内重复布局
- 把文本布局与 DOM 写合并到同一批次

`accordion.ts`、`bubbles.ts`、`rich-note.ts`、`dynamic-layout.ts`、`editorial-engine.ts` 都遵循这一模式。

## 3. `layoutNextLine()` 是 demo 层最关键的 rich-path 原语

在 demo 侧最有穿透力的 API 不是 `layoutWithLines()`，而是 `layoutNextLine()`。

原因：
- `rich-note.ts` 需要在一个行宽预算里混排 text run 与 atomic chip
- `dynamic-layout.ts` 需要把左栏未消费完的 cursor 交给右栏
- `editorial-engine.ts` 需要按 slot 宽度逐行续排，还要在同一 y band 里尝试多个 slot

这几个场景共同说明：
- `layoutWithLines()` 适合“给定单一矩形，求整段 lines”
- `layoutNextLine()` 才是“用户态排版引擎”的真正 escape hatch

## 4. 障碍几何的标准形态是“line band blocked interval”

`wrap-geometry.ts` 的意义在于把复杂图形统一压缩成 line breaker 能消费的形式。

实现步骤：
1. 资源侧：从 SVG / image alpha 中提取每个扫描行的 left/right 边界
2. 归一化：生成 normalized polygon hull，并按 `src + mode + smoothRadius + convexify` 缓存
3. 投影侧：按当前 `Rect + angle` 变换成页面坐标
4. 带状查询：对某个 line band 计算 polygon 或 rect 的 blocked interval
5. 排版侧：`carveTextLineSlots(base, blocked)` 得到该行可用 slot

所以 rich demo 的核心中间表示不是多边形本身，而是“这一行高度范围里哪些 x 区间不能写字”。

## 5. 标题、pull quote、logo 都会回流成 obstacle

`dynamic-layout.ts` 里：
- 标题先自己排出来
- 再把标题行投成 `Rect[]`
- 然后标题本身又作为 `titleObstacle` 参与右栏正文路由

`editorial-engine.ts` 里：
- circle orb 是动态 obstacle
- pull quote 是矩形 obstacle
- drop cap 会改变正文首段的 slot 宽度

这说明 demo 层不是“文字绕图片”，而是任何已排版对象都能再次成为下一阶段文本流的几何约束。

## 6. DOM 写入被压缩成 projection commit

几个代表模式：
- `dynamic-layout.ts` / `editorial-engine.ts`：
  - 先构造 `TextProjection`
  - 用 `textProjectionEqual()` 比较新旧投影
  - 只有变化时才 `projectTextProjection()`
- `editorial-engine.ts`：
  - `syncPool()` 维护 headline/body/pullquote 节点池
- `masonry/index.ts`：
  - 先算所有卡片坐标
  - 再基于 viewport 只保留可见节点
- `rich-note.ts`：
  - 先形成 `RichLine[]`
  - 再一次性生成 line-row DOM

这保证 demo 的主要复杂度仍在“文本几何计算”，而不是被节点增删或样式抖动淹没。

## 7. 页面仍会读少量 DOM，但读的是 chrome，不是文本真值

比如：
- `accordion.ts` 读取 copy 容器宽度、padding、line-height
- `rich-note.ts` 读取 viewport width
- `dynamic-layout.ts` / `editorial-engine.ts` 读取 viewport 尺寸与 pointer 位置

这些 DOM read 读取的是环境约束，不是文本真实换行或真实高度。
这和 accuracy/corpus 页面对 DOM line extractor 的依赖是不同性质的。

## 8. 两个研究性旁路实现

### `justification-comparison.model.ts`
- 先在词间或 soft hyphen 后建立 break candidates
- 再用 DP + badness 搜最优换行
- badness 同时考虑 slack、river、过紧空格、hyphen penalty

这证明 Pretext 的 prepared segments 足够稳定，可以被用户态拿来实现另一套段落算法。

### `pages/emoji-test.html`
- 以 `font × size × emoji` 批量比较 canvas 宽度和 DOM 宽度
- 观察 diff 是否按字号保持常量、是否跨字体近似一致

它并不参与正式 checker，但它是 `measurement.ts` 中 emoji correction 假设的旁证来源之一。

## 当前判断
- demo 层最值得保留的经验不是视觉风格，而是“projection-first、geometry-first”的实现纪律
- 如果后续继续扩展示例，最该抽象复用的不是页面壳子，而是：
  - line slot routing
  - projection diff / node pool
  - prepared-text cache 与字体就绪协同
