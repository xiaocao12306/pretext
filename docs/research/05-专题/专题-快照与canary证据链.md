# 专题：快照与 canary 证据链

相关节点：[[模块-语料与快照资产]]、[[功能-快照与canary治理]]、[[专题-浏览器ground-truth与工程验证]]

## 主题结论
Pretext 的验证系统不是单一分数，而是一条分层证据链：
- browser sweep raw snapshot
- benchmark raw snapshot
- corpus canary 文本与 metadata
- representative snapshot
- compact status dashboard
- mismatch taxonomy

这条链的价值在于，不同文件各自只承担一种证据角色。

## 为什么不能只靠一个 `STATUS.md`

如果只保留状态页，会立刻出现三个问题：
- 无法回看原始行级数据
- 无法比较环境指纹差异
- 无法把“当前分数”与“代表性长文样本”分开

Pretext 现在的做法是刻意拆层：
- `accuracy/*.json` / `benchmarks/*.json`：raw snapshot
- `corpora/representative.json`：compact machine-readable anchors
- `corpora/STATUS.md`：人类可读 dashboard
- `corpora/TAXONOMY.md`：解释词汇与 steering rule

## 三种 canary 粒度

### 1. 官方 browser regression gate
来源：
- `accuracy/*.json`

特点：
- 维度固定
- 规模大
- 目标是“官方回归必须绿”

### 2. 长文 product-shaped canary
来源：
- `corpora/*.txt`
- `corpora/STATUS.md`

特点：
- 更接近真实产品文本
- 能暴露 broad sweep 不容易显现的脚本/标点/长段落问题

### 3. representative anchors
来源：
- `corpora/representative.json`

特点：
- 小
- 稳
- 适合长期版本比较

它不是拿来替代全量 corpus，而是拿来让“高价值 canary”有固定锚点。

## taxonomy 在证据链里的位置

taxonomy 很容易被误解成“分类文档”。更准确地说，它是证据链里的决策翻译层。

它把 mismatch 从：
- 一个具体宽度
- 一段具体文本
- 一次具体浏览器 miss

翻译成：
- 这是 dirty corpus 还是真实算法问题
- 应该改预处理，还是先看 tolerance，还是怀疑 probe

也就是说，taxonomy 不是证明事实，而是决定如何使用这些事实。

## benchmark 快照为什么也在这条链里

如果只看 accuracy/corpus，仓库能说明“算得准”。
但 Pretext 的产品主张同时包括“算得便宜”。

所以：
- `accuracy/*.json` 证明 correctness gate
- `corpora/*` 证明长文/真实脚本 canary
- `benchmarks/*.json` 证明性能主张

三者缺一个，这条证据链都不完整。

## 当前判断
- 这套证据链最大的优点是角色分离清楚：raw、anchor、dashboard、taxonomy 各就各位
- 未来若有文档膨胀风险，最该保护的不是某个单独文件，而是这条分层关系本身
