# 实现：editorial-engine 报告与 orb 场景 checker 链

相关文件：
- `pages/demos/editorial-engine.html`
- `pages/demos/editorial-engine.ts`
- `scripts/editorial-engine-check.ts`
- `package.json`
- `DEVELOPMENT.md`

上游：[[功能-editorial-engine交互障碍与多栏续排探针]]
并列参考：[[实现-demo投影循环与几何路由]]、[[实现-dynamic-layout报告与资产几何探针链]]

## 这张卡关注什么
这里看的不是 `editorial-engine` 的排版算法本身，而是它怎样被改造成一条“可参数化首帧 + 可视摘要 + checker 批量回收”的 probe 链。

## 1. 页面先新增了可重复场景参数
`pages/demos/editorial-engine.ts` 现在会读取：
- `pageWidth/pageHeight`
- `orbPreset`
- `animate`
- `report/requestId`
- `showDiagnostics`

这一步的关键不只是“能传参数”，而是把原本依赖浏览器实时 viewport 与随机时间推进的 demo，收束成可重复起点：
- 场景宽高固定
- orb 初始位置来自命名 preset
- 报告模式默认冻结 orb，而不是边动边采样

也就是说，这次真正被固定下来的是 demo 的初始几何状态。

## 2. orb preset 不是装饰参数，而是压力场景
页面侧新增了多组 preset：
- `default`
- `stacked`
- `diagonal`
- `corridor`

这些 preset 不是 UI 皮肤切换，而是几何压力分布。
它们决定了正文会在什么区域遇到更密集的圆形障碍，进而改变：
- 各列行数
- skipped band 数
- 被选 slot 的宽度

所以 `orbPreset` 本质上是 `editorial-engine` 的场景矩阵入口。

## 3. 报告直接来自真实首帧投影路径
这次没有旁路重算一份摘要。
报告直接在 `render()` 的真实提交路径里，根据页面已经算好的结果组装：
- headline line 数
- 各列正文 line 数
- `cursor` 是否消费完整文本
- pullquote/drop-cap 几何
- orb 快照与整体 bounds
- 汇总后的 routing stats

因此 checker 看到的是页面真正要投影到 DOM 的那一版版式状态。

## 4. `layoutColumn()` 被补成了可汇总的 routing 统计点
之前 `layoutColumn()` 只回 `lines + cursor`。
现在它又显式累计：
- 经过多少 line band
- 有多少 band 遇到 obstacle
- 有多少 band 因没有 slot 被跳过
- 一共看到了多少 candidate slot
- 最终用了多少 slot，以及平均/最小/最大宽度

随后页面再把每列统计合并成总体 `routing`，写入 telemetry 和 report。

这一步很关键，因为它把原本埋在 demo 内部的 line-slot 压力变成了脚本可以消费的结构信号。

## 5. 页面可视诊断与 hash report 用的是同一份摘要
`editorial-engine.html` 新增了 telemetry panel；
页面侧 `syncTelemetry()` 与 `publishNavigationReport()` 读的都是同一个 `EditorialEngineReport`。

这意味着：
- 自动化看到的摘要
- 人工打开页面时右上角看到的摘要

是同一份数据，而不是两套不同口径的显示。

## 6. checker 复用了统一 automation 协议
`scripts/editorial-engine-check.ts` 沿用 repo 既有模式：
- `acquireBrowserAutomationLock()`
- `ensurePageServer()`
- `createBrowserSession()`
- `loadHashReport()`

但又加入了属于这张页自己的矩阵维度：
- `--scenarios=WxH,...`
- `--presets=default,stacked,...`

脚本最终请求：
- `/demos/editorial-engine?report=1`
- 再附带场景宽高、orb preset、`animate=0`

所以它守护的是“固定首帧几何”，不是动画中的任意采样点。

## 7. 命令面已经纳入工程入口
这条 probe 已被加入：
- `package.json` scripts
- `DEVELOPMENT.md` command surface

这说明它不再只是本地临时代码，而是正式进入仓库可重复的脚本入口面。

## 当前判断
- `editorial-engine` 现在已经拥有和 `emoji-test`、`justification-comparison`、`dynamic-layout` 同类的 report/checker 链骨架
- 这次最有价值的不是“又多了一条脚本”，而是把 interaction-driven demo 的首帧几何状态稳定化并可回收
- 后续若要继续扩 probe，不必立刻上 snapshot；先保持这种参数化研究页 + checker 的半正式形态更合适
