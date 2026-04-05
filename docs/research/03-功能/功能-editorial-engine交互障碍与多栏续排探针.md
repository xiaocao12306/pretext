# 功能：editorial-engine 交互障碍与多栏续排探针

相关文件：
- `pages/demos/editorial-engine.html`
- `pages/demos/editorial-engine.ts`
- `scripts/editorial-engine-check.ts`
- `DEVELOPMENT.md`

上游：[[模块-demo展示页面]]
下游：[[实现-editorial-engine报告与orb场景checker链]]
并列参考：[[功能-demo展示链]]、[[功能-SVG资产驱动的障碍物绕排]]

## 这张卡关注什么
这里看的不是 `editorial-engine` 的视觉包装，而是它如何把“可拖拽/可暂停的障碍物 + 多栏续排 + pullquote/drop-cap 干扰”外显成一张可以稳定复现场景、还能被脚本回收摘要的研究页。

## 1. 这张页承载的是交互式 obstacle routing，而不是静态展示
`dynamic-layout` 更偏向固定版式里的 logo-aware 几何路由；
`editorial-engine` 则把障碍物换成持续运动、可拖拽、可暂停的 orb。

因此它外显的是另一类假设：
- line slot carving 是否能承受时变圆形障碍物
- 多列 handoff 是否还能在动态障碍下保持连续正文流
- pullquote 与 drop cap 这种“人为插入的矩形干扰”能否与圆形障碍叠加工作

## 2. 这次它从纯 demo 升级成了半正式 probe
页面现在新增了 query 驱动场景参数：
- `report=1`
- `requestId=...`
- `pageWidth=...`
- `pageHeight=...`
- `orbPreset=default|stacked|diagonal|corridor`
- `animate=0|1`

这让 `editorial-engine` 不再只能靠人工拖拽观察，而是可以：
- 固定 viewport 场景
- 固定 orb 初始几何
- 冻结首帧拿到稳定结果
- 再由脚本批量回收摘要

所以它已经进入和 [[功能-emoji校正探针与自动化校验]]、[[功能-段落算法对比与river可视化]] 类似的“研究页到半正式探针”区间。

## 3. 探针重点是正文续排与路由压力
这次外显出来的不是某个像素截图，而是几类更稳的结构信号：
- headline 行数
- body 总行数与各列行数
- 正文是否消费完整，以及停在 `segmentIndex/graphemeIndex` 哪
- pullquote 数量与总行数
- drop-cap 占位矩形
- orb 个数、暂停状态与总体边界
- line-band 路由统计：blocked/skipped band、候选 slot 数、被选 slot 平均宽度

这说明 `editorial-engine` 的探针价值不在“动画漂不漂亮”，而在：
- 动态障碍是否把正文压垮
- 多栏 handoff 是否还能成立
- 页面是否进入某种 slot 过窄、band 大量跳过的退化状态

## 4. checker 现在能扫场景矩阵
`scripts/editorial-engine-check.ts` 复用了统一 automation 骨架，并把 `editorial-engine` 变成可扫的矩阵：
- `--scenarios=1365x900,960x900,640x900`
- `--presets=default,stacked,diagonal,...`

这样脚本就可以批量比较：
- 三栏到双栏到窄屏单栏
- 默认/堆叠/对角等 orb 分布
- 动态 demo 在冻结首帧下的路由压力差异

## 当前判断
- `editorial-engine` 已经从“rich path 能做什么”的展示页，升级成“动态障碍续排在什么场景下还能工作”的研究探针
- 它和 `dynamic-layout` 形成互补：一个更偏 asset-driven 几何路由，一个更偏 interaction-driven 圆形障碍流
- 这条链说明 demo 页并不一定永远停留在手工观察层，只要参数面足够稳定，就能逐步接入脚本回收与研究沉淀
