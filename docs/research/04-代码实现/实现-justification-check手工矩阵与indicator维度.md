# 实现-justification-check手工矩阵与indicator维度

参见：[[功能-demo展示链]]、[[实现-justification结果卡片与checker矩阵摘要]]、[[实现-checker对preset回执的协议校验]]、[[实现-justification-demo报告与checker链]]

## 涉及文件
- `scripts/justification-check.ts`

## 之前的缺口
`justification-check` 之前已经能做两件事：
- 跑 `preset=...`
- 跑 `--widths=...`

但这条脚本还有一个明显断层：
- preset 分支有成型的矩阵摘要
- 手工分支却只有逐条日志

而且手工分支还把：
- `showIndicators`

硬编码成 `0`，这意味着页面协议明明支持：
- `width`
- `showIndicators`

脚本却只消费了其中一半。

## 这次把手工分支补成真正的矩阵
`scripts/justification-check.ts` 现在新增：
- `parseShowIndicatorModes()`
- `buildRuns()`
- `JustificationRun`

脚本会先把运行模型统一成同一种 run 描述：
- `width`
- `showIndicators`
- 可选 `presetKey`

然后无论是 preset 还是手工诊断，都走同一条循环。

这意味着 `justification-check` 不再是“两套半独立逻辑”，而是开始拥有一致的矩阵执行骨架。

## 新增 `--showIndicators=0,1`
手工分支现在可以显式扫：
- `--widths=260,364,520`
- `--showIndicators=0,1`

于是脚本终于能回答：
- 同一列宽下，visualizer 开关会不会影响页面回执
- `cssOverlayRiverCount` 在 hidden / visible 两种状态下是否还保持稳定

默认值仍然保守地保持在 `0`，避免无意扩大老命令的运行量；但脚本现在已经具备完整维度，不再把 indicator 状态排除在外。

## matrix summary 现在覆盖 preset 和 manual 两条路径
这次最重要的变化不是新 flag，而是 summary 口径统一了。

脚本现在会在所有 run 结束后统一输出：
- `widths` 区间
- `indicators on` 占比
- `css rivers` 区间
- `Δhyphen avg` 区间
- `Δoptimal avg` 区间

并逐条打印：
- 当前 width
- `showIndicators` on/off
- `best avg`
- `best river`
- `Δhyphen`
- `Δoptimal`

因此 `justification-check` 不再只对 preset 有矩阵视图，手工诊断也第一次进入同一层摘要面。

## 设计判断
- 这一步补的不是新算法，而是把页面已经暴露出来的 `width + showIndicators` 协议真正收进脚本矩阵。
- `justification-comparison` 页面侧和 `justification-check` 脚本侧现在更对称了：页面能导出 `width/showIndicators`，脚本也能系统性消费它。
- 对 Phase 4 来说，这比继续加单条日志更有用，因为它把“手工 URL 诊断”推进成了“可批量 sweep 的矩阵维度”。
