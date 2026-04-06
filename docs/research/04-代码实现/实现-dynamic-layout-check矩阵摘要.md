# 实现：dynamic-layout-check 矩阵摘要

相关文件：
- `scripts/dynamic-layout-check.ts`

上游：[[功能-SVG资产驱动的障碍物绕排]]
并列参考：[[实现-dynamic-layout报告与资产几何探针链]]、[[实现-checker对preset回执的协议校验]]

## 这张卡关注什么
这里看的不是 `dynamic-layout` 页面怎么生成 report，而是 `dynamic-layout-check` 怎样把一批 scenario/angle 运行结果收束成矩阵级 digest。

此前脚本已经能：
- 逐条打印某个场景的 headline/body/routing/logo 状态
- 校验 `presetKey` 回执协议
- 输出 JSON 结果给后续脚本消费

但如果一次性跑：
- 多个 viewport
- 多组 logo angle
- 或一批共享 preset

读者还是得手工滚日志才能回答：
- 哪些 run 真正用到了右栏
- 哪些 run 开始截断正文
- 资产绕排压力整体是不是正在恶化

## 1. checker 现在会在末尾追加 matrix summary
这次脚本新增了 `printMatrixSummary(reports)`。

它不会替代逐条输出，而是在所有 run 结束后，先给一个聚合视角：
- 总 run 数、ready/error 数
- `complete` 比例
- `narrow/spread` 分布
- `right-column used` 比例
- 正文总行数区间
- credit slot 数区间
- 左右栏 blocked band 区间
- 左右栏平均 chosen slot 宽度区间

这样一轮脚本跑完之后，不需要先读每条日志，也能大致知道这组矩阵有没有明显退化。

## 2. 手工角度矩阵与 preset 运行共用同一层摘要
这次摘要分组时优先用：
- `report.presetKey`

没有 preset 时，再退回到：
- `openaiAngle:claudeAngle`

所以脚本并没有因为引入 preset 协议，就丢掉手工角度矩阵的可读性。

它现在同时支持两种阅读方式：
- probe preset 场景汇总
- angle pair 压力矩阵汇总

这正好对应 `dynamic-layout` 目前的两类使用场景：
- Phase 3 demo 的命名场景
- Phase 4 几何压力实验

## 3. 摘要刻意只保留“续排是否成立”的指标
新增 digest 没去重复打印 logo hull 点数或 headline 细节，而是集中看：
- `body.totalLineCount`
- `body.consumedAllText`
- `body.rightColumnUsed`
- `routing.creditSlotCount`
- `routing.left/right.blockedBandCount`
- `routing.left/right.avgChosenSlotWidth`

这说明脚本关心的重点仍然是：
- 正文 handoff 是否继续成立
- 资产投影是否把路由压到危险区
- spread/narrow 两种版式是否都还在工作

也就是说，矩阵摘要守护的是“资产驱动正文续排”本身，而不是某一帧的视觉外观。

## 当前判断
- `dynamic-layout-check` 现在从“能跑矩阵”进一步升级成“能概览矩阵”
- 这和 `editorial-engine-check` 的摘要层形成了并行能力，说明 Phase 4 的 rich demo checker 开始拥有共同的阅读面
- 对 `pages/assets/*` 驱动的这条 demo 链来说，这一步很关键，因为真正的风险往往不是单条 run 报错，而是某组角度/视口组合下的 slot 压力整体收窄
