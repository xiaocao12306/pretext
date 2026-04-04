# Pretext Research Checklist

说明：
- 本清单按研究阶段组织，不按“想到什么写什么”堆条目
- 每个研究对象只出现一次，避免重复统计
- 阶段标题中的数字是当前真实进度：`已完成/总数`

## Phase 0. 研究脚手架 `4/4`
- [x] 阅读 `TASK.md`、现有 [[CHECKLIST]]、[[STATUS]]
- [x] 建立 [[00-研究路线图与检查点]]
- [x] 补全 [[00-MOC-Pretext]] 导航骨架
- [x] 建立 checkpoint 与 dead-loop 监控规则

## Phase 1. 仓库总览与顶层工程面 `10/10`
- [x] 阅读 `README.md`
- [x] 阅读 `DEVELOPMENT.md`
- [x] 阅读 `package.json`
- [x] 阅读 `CHANGELOG.md`
- [x] 阅读顶层 `STATUS.md`
- [x] 阅读 `RESEARCH.md`
- [x] 阅读 `TODO.md`
- [x] 阅读 `tsconfig.json` / `tsconfig.build.json` / `oxlintrc.json`
- [x] 产出 [[01-仓库地图]]
- [x] 产出 [[01-项目总览]]

## Phase 2. 核心引擎 `src/` `8/8`
- [x] 研究 `src/layout.ts`
- [x] 研究 `src/analysis.ts`
- [x] 研究 `src/measurement.ts`
- [x] 研究 `src/line-break.ts`
- [x] 研究 `src/bidi.ts`
- [x] 研究 `src/layout.test.ts`
- [x] 研究 `src/test-data.ts`
- [x] 研究 `src/text-modules.d.ts`

## Phase 3. 页面层 `pages/` `10/10`
- [x] 研究 `pages/accuracy.ts` / `pages/accuracy.html`
- [x] 研究 `pages/benchmark.ts` / `pages/benchmark.html`
- [x] 研究 `pages/corpus.ts` / `pages/corpus.html`
- [x] 研究 `pages/probe.ts` / `pages/probe.html`
- [x] 研究 `pages/gatsby.ts` / `pages/gatsby.html` / `pages/gatsby.txt`
- [x] 研究 `pages/diagnostic-utils.ts` / `pages/report-utils.ts`
- [x] 研究 `pages/demos/**/*`
- [x] 研究 `pages/emoji-test.html`
- [x] 研究 `pages/justification-comparison.html`
- [x] 研究 `pages/assets/*`

## Phase 4. 自动化与脚本层 `scripts/` / `shared/` `10/10`
- [x] 研究 `scripts/browser-automation.ts`
- [x] 研究 `scripts/report-server.ts`
- [x] 研究 `scripts/accuracy-check.ts`
- [x] 研究 `scripts/benchmark-check.ts`
- [x] 研究 `scripts/corpus-check.ts`
- [x] 研究 `shared/navigation-state.ts`
- [x] 研究 Gatsby 相关脚本：`scripts/gatsby-check.ts`、`scripts/gatsby-sweep.ts`
- [x] 研究 corpus 其余脚本：`scripts/corpus-sweep.ts`、`scripts/corpus-font-matrix.ts`、`scripts/corpus-taxonomy.ts`、`scripts/corpus-representative.ts`
- [x] 研究其余 checker：`scripts/pre-wrap-check.ts`、`scripts/probe-check.ts`
- [x] 研究构建/发布脚本：`scripts/package-smoke-test.ts`、`scripts/build-demo-site.ts`

## Phase 5. 数据与研究素材 `8/8`
- [x] 研究 `accuracy/*.json`
- [x] 研究 `benchmarks/*.json`
- [x] 研究 `corpora/README.md`
- [x] 研究 `corpora/STATUS.md`
- [x] 研究 `corpora/TAXONOMY.md`
- [x] 研究 `corpora/representative.json`
- [x] 研究 `corpora/sources.json`
- [x] 审视 `corpora/*.txt` 与 `pages/assets/*` 在研究体系中的角色

## Phase 6. 研究产出网络 `4/8`
- [x] 建立 `docs/research/02-模块/` 的第一批模块卡
- [x] 建立 `docs/research/03-功能/` 的第一批功能卡
- [x] 建立 `docs/research/04-代码实现/` 的第一批实现卡
- [x] 建立 `docs/research/05-专题/` 的专题卡网络
- [ ] 建立 `docs/research/06-问题与风险/` 的风险卡网络
- [ ] 完成从总览 → 模块 → 功能 → 代码实现 的双链闭环
- [ ] 清点所有代码文件都已被某张卡片覆盖
- [ ] 通过原子化 commit 持续推进到研究收束

## 总体进度 `50/50`
- 已完成：`50`
- 未完成：`0`
- 当前阶段重点：Phase 6
