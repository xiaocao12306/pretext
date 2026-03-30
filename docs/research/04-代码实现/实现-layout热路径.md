# 实现：layout 热路径

相关模块：[[模块-公共API与Prepared模型]]、[[模块-断行引擎]]
上游：[[实现-prepare调用链]]

## 目标
解释 `layout()` 为什么能保持纯算术，以及这种“热路径纯化”具体落在什么代码结构上。

## 主链
`layout(prepared, maxWidth, lineHeight)`
-> `getInternalPrepared(prepared)`
-> `countPreparedLines(prepared, maxWidth)`
-> `{ lineCount, height: lineCount * lineHeight }`

这里没有：
- DOM 读
- canvas 调用
- 原始文本 materialization

## 第一层分流：simple vs general
`countPreparedLines()` 的第一件事是检查 `prepared.simpleLineWalkFastPath`。

### simple path
调用 `countPreparedLinesSimple()`。

适用范围：
- 普通 `white-space: normal` 形态
- 不需要处理 tab / hard break / soft hyphen 这类额外状态

特点：
- 只维护 `lineCount`、`lineW`、`hasContent`
- 若 segment 过宽且有 `breakableWidths`，就在 grapheme 级别累加
- 对简单 collapsible space 的溢出直接跳过，实现 hanging/trimming 语义

### general path
调用 `walkPreparedLines(prepared, maxWidth)`，但不给 callback。

这意味着：
- 通用 rich-capable walker 也能退化为纯计数器
- 真正的 hot path 只有在语义足够简单时才走最瘦实现

## 热路径依赖的冷路径产物
`layout()` 之所以能保持纯算术，是因为 `prepare()` 已经预先提供了：
- `widths`
- `breakableWidths`
- `breakablePrefixWidths`
- `chunks`
- `tabStopAdvance`
- `discretionaryHyphenWidth`
- `lineEndFitAdvances`
- `lineEndPaintAdvances`

也就是说，`layout()` 不是“聪明”，而是“已经被喂好了”。

## 热路径里的关键语义

### 1. 长词断行
若 segment 自身宽于 `maxWidth` 且存在 `breakableWidths`：
- 不重新分词
- 直接 grapheme 级推进

### 2. hanging whitespace
通过 break 语义与 fit/paint width 设计，trailing space 不会把整行挤到下一行，但 rich path 仍能保持正确 line end cursor。

### 3. line-fit epsilon
`line-break.ts` 仍会读取 `getEngineProfile()`，以浏览器特定 epsilon 来判断边界拟合。

这说明 hot path 虽然不做 DOM/canvas 工作，但仍保留少量浏览器差异策略。

## 当前判断
- `layout()` 本身极薄，真正的热路径复杂度在 `countPreparedLines*()`
- Pretext 的性能论点不是“layout 算法花哨”，而是“prepare 已经把所有昂贵事实前移”
- 若未来有人想在 `layout()` 里补更多验证/测量逻辑，这张卡就是最直接的反例依据
