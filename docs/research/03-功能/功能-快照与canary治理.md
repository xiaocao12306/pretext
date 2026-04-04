# 功能：快照与 canary 治理

相关文件：
- `accuracy/*.json`
- `benchmarks/*.json`
- `corpora/STATUS.md`
- `corpora/TAXONOMY.md`
- `corpora/representative.json`
- `corpora/sources.json`

上游：[[模块-语料与快照资产]]
下游：[[实现-快照文件结构与状态页映射]]、[[专题-快照与canary证据链]]

## 功能定位
Pretext 不只是“能跑 checker”，还实现了一套快照与 canary 治理功能。它回答的是：
- 哪些结果要长期保存
- 哪些结果要压缩成 dashboard
- 哪些结果要升级为代表性 canary
- 当 mismatch 出现时，用什么词汇来决定下一步工程动作

## 1. browser accuracy 快照治理
目标：
- 保存跨浏览器大 sweep 的 machine-readable 当前状态
- 让 `STATUS.md` 背后有可回溯的 raw rows

关键文件：
- `accuracy/chrome.json`
- `accuracy/safari.json`
- `accuracy/firefox.json`

这里的治理重点是“官方回归门槛”。

## 2. benchmark 快照治理
目标：
- 保存热路径、rich path、长文 corpus 的当前性能基线
- 防止性能讨论只停留在口头印象

关键文件：
- `benchmarks/chrome.json`
- `benchmarks/safari.json`

这里的治理重点是“性能主张要有可复查的快照”。

## 3. long-form corpus canary 治理
目标：
- 用真实语言与真实长文发现 sweep 捕不到的问题
- 区分“产品形状 canary”和“官方回归 gate”

关键文件：
- `corpora/*.txt`
- `corpora/sources.json`
- `corpora/STATUS.md`

这里的治理重点是：
- 选什么 corpus
- 用什么 canonical font / width range
- 哪些 canary 值得长期保留

## 4. representative row 治理
目标：
- 把高价值 canary 压缩成小而稳的代表样本
- 让未来版本比较不必每次重放完整 sweep

关键文件：
- `corpora/representative.json`

这是一种介于 raw sweep 和人工状态页之间的中间资产。

## 5. mismatch vocabulary 治理
目标：
- 把“错了”变成可复用的决策语言
- 避免每次新 miss 都从零解释

关键文件：
- `corpora/TAXONOMY.md`

它把 mismatch 和下一步动作联系起来：
- `corpus-dirty` → 清洗或弃用语料
- `boundary-discovery` / `glue-policy` → 调整预处理边界
- `edge-fit` → 先看 tolerance
- `shaping-context` → 警惕越修越偏，可能需要更深架构变化

## 当前判断
- 快照与 canary 治理是 Pretext 可信度的一部分，不是文档附属物
- `representative.json` 和 `TAXONOMY.md` 很关键，因为它们把“结果存档”提升成了“可比较资产”和“可执行决策语言”
