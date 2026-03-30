# 功能：corpus 与 probe 诊断

入口：
- `pages/corpus.ts`
- `pages/probe.ts`

相关模块：[[模块-浏览器验证页面]]

## 功能目标
当 broad sweep 发现问题后，提供更深的“为什么错、错在何处、是不是 extractor 敏感、是不是宽度累计漂移”的定位工具。

## `corpus.ts`

### 目标
针对长文 canary 做：
- 单宽度诊断
- 宽度 sweep
- slice 诊断
- font / lineHeight override
- line-break mismatch 与 width drift 分析

### 重要机制
- 支持 span/range 两类浏览器 line extractor
- 比较 `layoutWithLines()` 行边界与 browser line 边界
- 额外计算：
  - segment sum width
  - full-string canvas width
  - DOM width
  - pair-adjusted width

它已经不是“看高度差多少”，而是“把 mismatch 拆成多种可能原因”。

## `probe.ts`

### 目标
针对一个参数化短文本快速复现问题。

### 重要机制
- 通过 query params 控制 `text`、`width`、`font`、`dir`、`lang`、`whiteSpace`
- 同时跑 primary extractor 与 alternate extractor
- 输出：
  - `firstBreakMismatch`
  - `alternateFirstBreakMismatch`
  - `extractorSensitivity`

这使它特别适合验证：
- Safari `range` vs `span`
- 特定局部文本是否真是算法问题，还是 DOM 提取器问题

## 当前判断
- `corpus.ts` 是“长文/实战 canary 诊断器”
- `probe.ts` 是“最小复现与局部 break 定位器”
- 两者共同把 research log 里的经验性判断变成可重复工具
