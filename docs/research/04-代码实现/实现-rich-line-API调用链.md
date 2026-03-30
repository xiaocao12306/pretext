# 实现：rich line API 调用链

相关模块：[[模块-公共API与Prepared模型]]、[[模块-断行引擎]]、[[模块-Bidi辅助]]

## 目标
解释 `layoutWithLines()`、`walkLineRanges()`、`layoutNextLine()` 如何建立在同一套 breaker 语义之上，同时把额外成本留在 rich path。

## 主链拆分

### 1. `walkLineRanges()`
`walkLineRanges(prepared, maxWidth, onLine)`
-> `walkPreparedLines(getInternalPrepared(prepared), maxWidth, ...)`
-> 把 `InternalLayoutLine` 转成 `LayoutLineRange`

特点：
- 不物化行文本
- 只暴露几何信息：`width`、`start`、`end`
- 是 shrink-wrap 与 aggregate geometry 的低成本接口

### 2. `layoutWithLines()`
`layoutWithLines(prepared, maxWidth, lineHeight)`
-> `walkPreparedLines(...)`
-> `materializeLayoutLine(...)`
-> `createLayoutLine(...)`
-> `buildLineTextFromRange(...)`

特点：
- 先拿到行范围
- 再把范围翻译成 `text + width + cursors`
- 共享 `WeakMap` 基础上的 grapheme cache，避免重复拆 segment

### 3. `layoutNextLine()`
`layoutNextLine(prepared, start, maxWidth)`
-> `stepLineRange(...)`
-> `layoutNextLineRange(...)`
-> `materializeLine(...)`

特点：
- 允许用户一行一行拿结果
- 每次调用都可给不同 `maxWidth`
- 是 obstacle-aware / editorial flow 一类用户态布局的核心出口

## 关键辅助

### `normalizeLineStart()`
streaming path 不直接信任调用方 cursor，而会先归一化：
- 跨过 chunk 内的 hanging 起始空白
- 处理 empty chunk
- 避免从只具有断点意义的 segment 上错误开行

### grapheme text cache
rich path 在 `layout.ts` 中使用：
- `sharedLineTextCaches: WeakMap<PreparedTextWithSegments, Map<number, string[]>>`

作用：
- 多次物化行文本时避免重复 grapheme split
- 不把这类 cache 混进 fast path API

### soft hyphen 文本物化
`buildLineTextFromRange()` 会检查：
- 这一行是否以 soft hyphen 断开
- 若是，则在展示文本里补可见 `-`

这说明 rich path 的“显示文本”不等于内部 segment 原文拼接。

## 统一语义，不同成本层级
这组 rich APIs 最重要的设计，不是多提供了三个名字，而是：
- 都建立在 `line-break.ts` 的同一断行状态机之上
- 差异只在于是否保留 range、是否物化文本、是否流式步进

因此仓库避免了最危险的一类漂移：
- `layout()` 一套语义
- rich manual layout 又是另一套语义

## 与 bidi 的关系
rich prepared handle 会携带 `segLevels`，但这些 level：
- 由 `prepareWithSegments()` 冷路径提供
- 不参与行断
- 主要服务 custom rendering 的额外元数据需求

## 当前判断
- rich line APIs 的架构重点是“共享 breaker + 分层暴露成本”
- `walkLineRanges()` 是这一组里最工程化的接口，因为它给了几何信息但不支付文本物化成本
- `layoutNextLine()` 则是最面向复杂用户态布局的出口
