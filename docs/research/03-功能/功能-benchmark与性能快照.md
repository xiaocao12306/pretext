# 功能：benchmark 与性能快照

入口：
- `pages/benchmark.ts`
- `scripts/benchmark-check.ts`（后续脚本研究补充）

相关模块：[[模块-浏览器验证页面]]、[[模块-测试与共享测试数据]]

## 功能目标
给 Pretext 的性能主张提供稳定页面基线，并把热路径、rich path 与长文冷路径成本拆开看。

## 页面主链

### 1. 顶层批量 benchmark
测：
- `prepare()`
- `layout()`
- DOM batch
- DOM interleaved

这里的对比重点是：
- 不是只证明“快”
- 而是证明“prepare 冷路径 + layout 热路径”的结构性优势

### 2. rich line API benchmark
测：
- `layoutWithLines()`
- `walkLineRanges()`
- `layoutNextLine()`

并且区分：
- shared-corpus batch
- Arabic long-form stress

### 3. 长文 corpus benchmark
对每个 corpus：
- `profilePrepare()` 拆 `analysisMs` / `measureMs` / `prepareMs`
- 再测热 `layoutMs`

这使得性能回归可以更快判断：
- 是 segmentation/glue 问题
- 还是纯测量量级问题

## 数据来源
- 短文本：来自 `src/test-data.ts`，过滤掉极端 edge case 后重复到 `COUNT = 500`
- 长文：直接导入 `corpora/*.txt`

## 当前判断
- 这个功能不是简单跑 `performance.now()`，而是把产品级性能叙事拆成多个层次
- `profilePrepare()` 在这里很关键，因为它把冷路径拆得足够可诊断
