# 模块：公共 API 与 Prepared 模型

上游：[[01-项目总览]]
下游：[[实现-prepare调用链]]、[[实现-layout热路径]]、[[实现-rich-line-API调用链]]

## 模块定位
这个模块主要对应 `src/layout.ts`。它不是简单的“导出汇总文件”，而是 Pretext 的编排层：
- 向外暴露稳定 API
- 向内组装 analysis / measurement / bidi / line-break
- 区分 fast path 与 rich path
- 把内部并行数组模型藏在 opaque handle 后面

## 对外 API 面

### Fast path
- `prepare(text, font, options?)`
- `layout(prepared, maxWidth, lineHeight)`

目标：
- 文本初次出现时做一次冷路径预处理与度量
- resize 或容器宽度变化时只做纯算术布局

### Rich path
- `prepareWithSegments(text, font, options?)`
- `layoutWithLines(prepared, maxWidth, lineHeight)`
- `walkLineRanges(prepared, maxWidth, onLine)`
- `layoutNextLine(prepared, start, maxWidth)`

目标：
- 为 canvas / SVG / custom layout 提供按行物化或非物化遍历能力
- 复用同一套断行语义，而不是另开第二套算法

### 运维辅助
- `clearCache()`
- `setLocale(locale?)`
- `profilePrepare()`：仅诊断/benchmark 页面使用，用来拆开分析耗时与度量耗时

## Prepared 模型

### Opaque PreparedText
`prepare()` 返回 `PreparedText`，只暴露 brand，不暴露内部结构。这是一个非常刻意的 API 决策：
- 公共 API 不被并行数组结构绑死
- 调用方不能依赖内部实现细节
- 后续可以继续重排内部字段而不破坏包表面

### Rich PreparedTextWithSegments
`prepareWithSegments()` 返回 richer handle，在 opaque core 之上额外提供：
- `segments`
- `segLevels`
- 用于 rich layout 的 line cursor 范围信息

这说明 rich path 是“受控泄露结构信息”，不是把 fast path 也一起打开。

### 内部核心字段
从 `PreparedCore` 看，当前内部模型至少包含：
- `widths`
- `lineEndFitAdvances`
- `lineEndPaintAdvances`
- `kinds`
- `simpleLineWalkFastPath`
- `segLevels`
- `breakableWidths`
- `breakablePrefixWidths`
- `discretionaryHyphenWidth`
- `tabStopAdvance`
- `chunks`

这些字段反映了三个设计意图：
- 预先把断行需要的宽度信息准备好
- 同时保留“fit width”和“paint width”这两个视角
- 用 chunk 支持 `pre-wrap` hard break 之类的分段行走

## 核心调用链

### `prepare()`
`prepare()` -> `prepareInternal()` -> `analyzeText()` -> `measureAnalysis()`

这里发生的不是一次简单测量，而是：
- 文本归一化与分段
- 语言/脚本特化预处理
- segment 宽度缓存命中或度量
- breakable run 的 grapheme 宽度预备
- rich path 可选 bidi level 映射

### `layout()`
`layout()` -> `countPreparedLines()`

它只接触 prepared arrays，不再碰 canvas、DOM 或原始文本。这是仓库里最重要的性能边界之一。

### Rich line APIs
- `walkLineRanges()` -> `walkPreparedLines()`
- `layoutNextLine()` -> `layoutNextLineRange()` -> 行文本物化
- `layoutWithLines()` -> `walkPreparedLines()` + `materializeLayoutLine()`

rich path 的额外成本主要来自：
- line range bookkeeping
- grapheme cache
- line text materialization

但这些成本被留在 rich API 中，没有污染 hot `layout()`。

## 模块内部的关键辅助设计

### 1. Grapheme segmenter 与 line text cache
`src/layout.ts` 在 rich path 里维护：
- 共享 grapheme segmenter
- `WeakMap<PreparedTextWithSegments, Map<number, string[]>>` 形式的 line text cache

这说明 rich path 的性能也被认真考虑，但它的缓存策略被限定在 rich handle 生命周期上。

### 2. Soft hyphen 的显示/隐藏分离
公共 API 不直接暴露 soft-hyphen metadata flag，但 `buildLineTextFromRange()` 会在断到 soft hyphen 时补可见 `-`。

这类实现细节很关键，因为它展示了：
- 内部语义 token 与外部显示文本可以不同
- rich line API 需要比 fast path 更高层的文本物化逻辑

### 3. `setLocale()` 的策略
`setLocale(locale?)` 通过 `setAnalysisLocale()` + `clearCache()` 一起工作，意味着 locale 切换是面向“未来 prepare 调用”的全局策略，而不是对现有 prepared handle 做原地变更。

## 设计评价

### 值得借鉴
- API 面小而清晰，内部结构可以继续演化
- fast path / rich path 分裂得足够硬
- `profilePrepare()` 这种诊断出口没有污染主 API 叙事

### 需要继续验证
- `src/layout.ts` 既承担公共 API，又承担 rich path 文本物化；后续要继续观察这里是否会慢慢吸进过多实现细节
- `PreparedCore` 已经积累了不少字段，后续实现卡需要确认这些字段之间有没有可进一步规整的分组
