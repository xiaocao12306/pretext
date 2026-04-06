# 实现：editorial-engine-check 矩阵摘要

相关文件：
- `scripts/editorial-engine-check.ts`

上游：[[功能-editorial-engine交互障碍与多栏续排探针]]
并列参考：[[实现-editorial-engine报告与orb场景checker链]]、[[实现-checker对preset回执的协议校验]]

## 这张卡关注什么
这里看的不是 `editorial-engine` 页面怎么出 report，而是 `editorial-engine-check` 怎样把一串逐条 report 提升成可横向比较的矩阵摘要。

此前脚本已经能：
- 逐个 scenario/preset 拉 `EditorialEngineReport`
- 校验 `presetKey` 回执协议
- 打印单次运行的 headline/body/routing/orb 信息

但它还缺一个明显的问题：
- 单次打印适合诊断某一条 run
- 不适合快速回答“这一轮矩阵整体有没有退化、哪个 preset 更挤、哪些场景开始截断正文”

## 1. checker 现在会在末尾补一段 matrix summary
这次脚本在收完全部 report 后，新增了 `printMatrixSummary(reports)`。

这段摘要不会替代逐条输出，而是在末尾追加一层聚合视角，集中回答：
- 总共跑了几条
- ready/error 各多少
- 完整吃完正文的 run 有多少
- narrow/spread 场景各多少
- body line 数的整体区间
- blocked/skipped band 的整体区间
- 平均 chosen slot 宽度的整体区间

也就是说，checker 第一次开始给出“矩阵级健康度”，不再只有一长串单点 log。

## 2. 聚合维度按 preset 收束，而不是只看 scenario
摘要行会再按 `report.presetKey ?? report.orbs.preset` 分组。

这样做的意义在于：
- 对 probe preset 运行，能直接按命名场景看稳定性
- 对手工 `orbPreset + scenarios` 矩阵运行，也仍然能按 orb 几何模式聚合

所以脚本现在既服务：
- Phase 3 demo 场景词汇
- 也服务 Phase 4 手工压力矩阵

而不是把两种运行方式拆成两套完全不同的阅读面。

## 3. 摘要选的都是“续排压力”信号
新增摘要没有去重复打印所有字段，而是只保留最像 probe 信号的那几项：
- `body.lineCount`
- `body.consumedAllText`
- `page.isNarrow`
- `routing.blockedBandCount`
- `routing.skippedBandCount`
- `routing.avgChosenSlotWidth`

这说明脚本作者关心的不是页面“长得像不像”，而是：
- 文本有没有被 obstacle 挤坏
- routing 压力有没有明显恶化
- spread/narrow 两种形态下是否还能稳定续排

## 当前判断
- `editorial-engine-check` 现在从“能拉报告”进一步走到“能概览矩阵”
- 这不会改变 report 协议本身，但明显改善了 Phase 4 的脚本可读性
- 对后续 `dynamic-layout` / `editorial-engine` 这类 rich demo 来说，矩阵级 digest 是很有价值的，因为真正的风险往往不是单条 run 红了，而是某组 preset 的 slot 压力整体开始恶化
