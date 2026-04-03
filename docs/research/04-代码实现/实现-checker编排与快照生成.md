# 实现：checker 编排与快照生成

相关文件：
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

上游：[[模块-自动化脚本]]、[[功能-自动化批量sweep与发布验收]]
并列参考：[[实现-导航状态与报告通道]]

## 这张卡关注什么
上一张实现卡 [[实现-导航状态与报告通道]] 解释的是“页面和脚本怎么通信”。

这里进一步看“脚本层如何把这条通信链编排成不同等级的工作流”：
- 单点诊断
- 批量 sweep
- 快照持久化
- 发布验收

## 1. 单点 checker 与批量 sweep 是两层速度/信息密度 tradeoff

`gatsby-check.ts` / `probe-check.ts` 的特点：
- 宽度数量少
- 输出很长
- 直接打印 boundary、context、segment window
- 适合人读

`gatsby-sweep.ts` / `corpus-sweep.ts` 的特点：
- 宽度数量多
- 依赖 batched page report
- 先汇总 exact/nonzero，再按需回退到慢速 checker

尤其 `gatsby-sweep.ts` 的模式很典型：
1. 一次导航批量拿所有宽度结果
2. 汇总成 mismatch bucket
3. 如果 `--diagnose`，再调用 `bun run scripts/gatsby-check.ts ...` 只复诊少量坏宽度

这是一种“coarse first, deep later”的两阶段编排。

## 2. corpus 脚本把页面参数化能力吃满了

`corpus-sweep.ts`、`corpus-taxonomy.ts`、`corpus-font-matrix.ts`、`corpus-representative.ts` 都复用同一个 `/corpus` 页面，但传参策略不同：
- `widths`
- `font`
- `lineHeight`
- `diagnostic`
- `reportEndpoint`
- `requestId`

这说明 `/corpus` 页面本身就是一个“多模式后端”，脚本差异主要来自：
- 用哪些 corpus
- 用哪些宽度
- 结果如何聚合

页面复用度高，脚本只负责组织实验矩阵。

## 3. corpus 元数据驱动范围控制

多个 corpus 脚本都会读取 `corpora/sources.json` 的 metadata，例如：
- `id`
- `language`
- `title`
- `min_width`
- `max_width`

然后在脚本端裁剪 sweep 范围。

这避免了：
- 对明显无意义的宽度做浪费性 sweep
- 把 corpus 选择逻辑硬编码到页面里

`corpus-font-matrix.ts` 则在此基础上再引入 `FONT_MATRIX`，为特定 corpus 指定一组真实字体变体。

## 4. taxonomy 是脚本端的研究归因层

`corpus-taxonomy.ts` 不是简单重跑 checker，而是把 mismatch 变成更稳定的分类项。

它当前使用的信号包括：
- `reasonGuess`
- `deltaText` 中是否含引号/标点
- `browserLineMethod`
- `maxLineWidthDrift`

然后归入：
- `edge-fit`
- `shaping-context`
- `glue-policy`
- `boundary-discovery`
- `diagnostic-sensitivity`
- `unknown`

也就是说，taxonomy 脚本是在 checker 结果之上再加一层“研究标签化”。

## 5. representative snapshot 有意保持小而稳

`corpus-representative.ts` 的策略不是保存完整 sweep，而是：
- 固定 corpus 集
- 固定少量宽度
- 固定 browser 集
- 同时保存环境指纹

输出形态里有两类数据：
- `environment`
- `rows`

这非常适合长期版本追踪，因为它比完整 sweep 便宜、稳定，而且能说明“这些代表样本是在什么浏览器环境下得到的”。

## 6. `pre-wrap-check.ts` 是永久 oracle，不是开放式探针

实现上它直接内置 `ORACLE_CASES`：
- hanging spaces
- hard break / trailing final break
- preserved spaces
- default tab stops
- mixed-script indent
- rtl indent

每个 case 都固定：
- text
- width
- font
- lineHeight
- 可选 dir/lang

然后统一走 `/probe?whiteSpace=pre-wrap&method=span`。

所以它不是让用户自由探索，而是把仓库当前认定必须长期守护的 pre-wrap 行为压缩成显式 oracle 集。

## 7. package smoke test 验证的是 tarball 形态，不是源码自洽

`package-smoke-test.ts` 的关键点：
- 先 `npm pack`
- 在临时目录安装 tarball
- 分别创建 JS ESM 与 TS 项目
- 既验证“正确使用能通过”，也验证“错误使用会报对的类型错”

这比在仓库里直接 `tsc` 更强，因为它验证的是：
- `package.json` 导出面
- 打包内容
- consumer 真实安装行为

## 8. static demo site 构建分成“编译”和“重写”

`build-demo-site.ts` 并不只做 `bun build`。

后半段还有两层静态重写：
- `rebaseRelativeAssetUrls()`：在 HTML 被挪到 `slug/index.html` 后，重新计算资源相对路径
- `rewriteDemoLinksForStaticRoot()`：把 landing page 里的 `/demos/...` 链接改成静态根目录下的相对链接

这说明 demo-site 发布的问题不在 bundle 本身，而在“静态托管目录结构变了以后，HTML 引用关系是否仍正确”。

## 当前判断
- 脚本层最成熟的地方不是某一个 checker，而是已经形成了稳定的实验编排模式
- `corpus-taxonomy` 和 `corpus-representative` 很关键，它们把“跑脚本”提升成了“沉淀研究资产”
- `package-smoke-test` / `build-demo-site` 表明仓库已经同时维护两条对外表面：npm tarball 与静态 demo 站点
