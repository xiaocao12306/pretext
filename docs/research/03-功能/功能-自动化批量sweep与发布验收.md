# 功能：自动化批量 sweep 与发布验收

相关脚本：
- `scripts/gatsby-check.ts`
- `scripts/gatsby-sweep.ts`
- `scripts/corpus-sweep.ts`
- `scripts/corpus-font-matrix.ts`
- `scripts/corpus-taxonomy.ts`
- `scripts/corpus-representative.ts`
- `scripts/pre-wrap-check.ts`
- `scripts/probe-check.ts`
- `scripts/package-smoke-test.ts`
- `scripts/build-demo-site.ts`

上游：[[模块-自动化脚本]]
下游：[[实现-checker编排与快照生成]]、[[专题-工程验证与发布面]]

## 功能定位
这一组脚本把页面层能力转成了四类可重复执行的工程动作：
- 慢速单点诊断
- 快速批量 sweep
- 快照/研究产物生成
- package 与 demo-site 验收

它们共同回答的是：“页面已经能测，那工程系统怎样稳定地跑、筛、存、发这些结果？”

## 1. 慢速单点诊断
代表脚本：
- `gatsby-check.ts`
- `probe-check.ts`

作用：
- 针对单个或少量宽度给出高细节诊断
- 输出首个 break mismatch、boundary 描述、segment window、extractor sensitivity
- 更适合解释“为什么错”，而不是“总共有多少处错”

这是人为排查与脚本化回归之间的桥接层。

## 2. 快速批量 sweep
代表脚本：
- `gatsby-sweep.ts`
- `corpus-sweep.ts`

作用：
- 让页面一次导航批量测多个宽度
- 把大量 width row 收回本地，汇总 exact/nonzero 情况
- 把 diff bucket 化，快速锁定异常宽度区间

特别之处：
- `gatsby-sweep.ts` 还能在 coarse sweep 之后，按需调用 `gatsby-check.ts` 做少量慢速复诊
- `corpus-sweep.ts` 支持 `--all`、`--samples`、`font` / `lineHeight` override，不需要为同一 corpus 额外造页面

这对应仓库文档里“先廉价 sweep，再细查坏宽度”的方法论。

## 3. 字体矩阵、taxonomy 与代表性快照
代表脚本：
- `corpus-font-matrix.ts`
- `corpus-taxonomy.ts`
- `corpus-representative.ts`

作用：
- `corpus-font-matrix.ts`：比较同一 corpus 在多个真实字体组合下的稳定性
- `corpus-taxonomy.ts`：把 mismatch 按 edge-fit / shaping-context / glue-policy / boundary-discovery / diagnostic-sensitivity 分类
- `corpus-representative.ts`：产出紧凑、长期保存的 representative snapshot，并附浏览器环境指纹

这说明 corpus 工具链的目标不只是“看一眼结果”，而是：
- 找出问题族群
- 比较条件变化
- 沉淀长期跟踪样本

## 4. whitespace 与 probe 专项守护
代表脚本：
- `pre-wrap-check.ts`
- `probe-check.ts`

作用：
- `pre-wrap-check.ts` 把仓库对 `{ whiteSpace: 'pre-wrap' }` 的 standing oracle 压缩成一小组明确案例
- `probe-check.ts` 则是更通用的短文本 CLI，可切 `whiteSpace`、`method`、`dir`、`lang`

两者一起构成了“小而准的白空格/提取器专项检查面”。

## 5. 发布与静态站点验收
代表脚本：
- `package-smoke-test.ts`
- `build-demo-site.ts`

作用：
- `package-smoke-test.ts` 不相信工作区源码表面形态，而是先 `npm pack`，再用临时 JS/TS consumer 项目验证 tarball 的运行时导出和 `.d.ts` 约束
- `build-demo-site.ts` 把 demo 页面编成静态站点，并重写 HTML 位置与相对资源路径，使 GitHub Pages 根目录能直接托管

这两者证明：
- 发布面关注的是“最终 tarball / site 形态是否真的可消费”
- 仓库已经把 demo 当成一条需要被构建与分发的产线，而不只是本地开发玩具

## 当前判断
- `gatsby-sweep` / `corpus-sweep` / `pre-wrap-check` 体现的是“页面驱动的自动化回归”
- `corpus-taxonomy` / `corpus-representative` 体现的是“研究结果的结构化沉淀”
- `package-smoke-test` / `build-demo-site` 则把研究仓库继续推向了对外可发布、可托管的工程闭环
