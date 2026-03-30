# 实现：prepare 调用链

相关模块：[[模块-公共API与Prepared模型]]、[[模块-文本分析]]、[[模块-文本度量与缓存]]

## 目标
这条调用链解释 `prepare()` 为什么既是功能入口，也是 Pretext 的冷路径复杂度中心。

## 主链
`prepare(text, font, options?)`
-> `prepareInternal(text, font, includeSegments, options?)`
-> `analyzeText(text, getEngineProfile(), options?.whiteSpace)`
-> `measureAnalysis(analysis, font, includeSegments)`

如果走 rich path，则同一主链只是在 `includeSegments = true` 下返回 richer handle。

## 第一步：拿到 engine profile
`prepareInternal()` 在进入分析前先调用 `getEngineProfile()`。

这意味着浏览器差异不是只影响测量，也会影响分析策略，例如：
- `carryCJKAfterClosingQuote`

也就是说，prepare 冷路径从一开始就携带浏览器 profile。

## 第二步：`analyzeText()`
`analyzeText()` 产出的是“带语义的 segment 流”，不是最终 PreparedText。

它至少完成：
- whitespace 模式处理
- `Intl.Segmenter` 初始分词
- segment break kind 分类
- URL / 数字串 / glue / Arabic / CJK / escaped quote 等预处理
- hard-break chunk 编译

此时结果还是 analysis 级别的数据：
- `texts`
- `isWordLike`
- `kinds`
- `starts`
- `chunks`

## 第三步：`measureAnalysis()`
这一段把 analysis 级 segment 转成 prepared 级并行数组。

关键步骤包括：

### 1. 建 measurement state
- 取得共享 grapheme segmenter
- 取得 engine profile
- 通过 `getFontMeasurementState()` 取得：
  - font 级 cache
  - fontSize
  - emojiCorrection

### 2. 预备额外宽度事实
- `discretionaryHyphenWidth`
- `spaceWidth`
- `tabStopAdvance`

这些宽度会在后续断行中直接消费，因此被提前算好。

### 3. 遍历 analysis segments
对每个 analysis segment，`measureAnalysis()` 会按 kind 决定如何落入 prepared arrays：
- `soft-hyphen`：本身宽度为 0，但保留断到它时要补的可见连字符宽度
- `hard-break` / `tab`：保留结构信息，不在这里做显示宽度累加
- 含 CJK 的 text：继续按 grapheme 拆成更小的 prepared 单元，并做 kinsoku / closing quote 等粘连判断
- 其他 text：按 segment 宽度缓存结果落表

### 4. 准备 breakable widths
对于 `segWordLike && segText.length > 1` 的 segment，可能额外准备：
- `graphemeWidths`
- `graphemePrefixWidths`

这是后续 `overflow-wrap: break-word` 风格能力的基础。

### 5. rich path 可选 metadata
只有 `includeSegments` 为真时，才会多准备：
- `segments`
- `segStarts`
- `segLevels`

也就是说，bidi metadata 和文本物化支撑都不是 fast path 必付成本。

## 第四步：返回 Prepared handle
最终得到的 prepared handle 统一表现为并行数组模型，但 API 层做了两种外观：
- opaque `PreparedText`
- rich `PreparedTextWithSegments`

## 为什么这条链重要

### 1. 它体现了“复杂度前移”
语言规则、浏览器差异、emoji 修正、breakable run 预备，全部集中在 `prepare()`。

### 2. 它解释了 `layout()` 为什么能保持纯算术
因为 `prepare()` 已经为后续断行提供了：
- segment 宽度
- line-end fit/paint advance
- breakable run 宽度
- tab stop 宽度
- hard-break chunk 边界

### 3. 它说明 rich path 是在同一冷路径上增量扩展
rich path 没有复制第二套 prepare 算法，只是在同一 prepare 主链上请求更多结构信息。

## 当前判断
- `prepare()` 是 Pretext 最值得研究的冷路径核心
- `analysis.ts` 与 `measurement.ts` 的边界总体清晰：前者负责语义，后者负责宽度与浏览器差异
- 下一步需要把这条调用链继续接到 [[实现-layout热路径]]，形成完整的 prepare -> layout 闭环
