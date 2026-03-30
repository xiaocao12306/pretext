# Pretext Research Checklist

## A. 研究脚手架
- [x] 阅读 `TASK.md`、现有 [[CHECKLIST]]、[[STATUS]]
- [x] 建立 [[00-研究路线图与检查点]]
- [x] 补全 [[00-MOC-Pretext]] 导航骨架
- [x] 建立 checkpoint 与 dead-loop 监控规则

## B. 项目地图与第一版总览
- [x] 阅读 `README.md`、`DEVELOPMENT.md`、`package.json`
- [x] 梳理目录结构与代码文件分布
- [x] 识别项目入口、启动方式、发布入口、校验命令
- [x] 产出 [[01-仓库地图]]
- [x] 产出 [[01-项目总览]]

## C. 顶层工程面
- [x] 阅读 `CHANGELOG.md`
- [x] 阅读顶层 `STATUS.md`
- [x] 阅读 `RESEARCH.md`
- [x] 阅读 `TODO.md`
- [x] 阅读 `tsconfig.json` / `tsconfig.build.json` / `oxlintrc.json`

## D. 核心引擎 `src/`
- [x] 研究 `src/layout.ts`
- [x] 研究 `src/analysis.ts`
- [x] 研究 `src/measurement.ts`
- [x] 研究 `src/line-break.ts`
- [x] 研究 `src/bidi.ts`
- [x] 研究 `src/layout.test.ts`
- [x] 研究 `src/test-data.ts`
- [x] 研究 `src/text-modules.d.ts`
- [ ] 研究 `src/text-modules.d.ts`

## E. 页面与 demo `pages/`
- [x] 研究 `pages/accuracy.ts` / `pages/accuracy.html`
- [x] 研究 `pages/benchmark.ts` / `pages/benchmark.html`
- [x] 研究 `pages/corpus.ts` / `pages/corpus.html`
- [x] 研究 `pages/probe.ts` / `pages/probe.html`
- [ ] 研究 `pages/gatsby.ts` / `pages/gatsby.html` / `pages/gatsby.txt`
- [x] 研究 `pages/diagnostic-utils.ts` / `pages/report-utils.ts`
- [ ] 研究 `pages/demos/**/*`
- [ ] 研究 `pages/emoji-test.html` / `pages/justification-comparison.html`

## F. 脚本与自动化 `scripts/`
- [ ] 研究 `scripts/browser-automation.ts`
- [ ] 研究 `scripts/report-server.ts`
- [ ] 研究 accuracy / benchmark / pre-wrap / probe checkers
- [ ] 研究 corpus 相关脚本
- [ ] 研究 Gatsby 相关脚本
- [ ] 研究 `scripts/package-smoke-test.ts`
- [ ] 研究 `scripts/build-demo-site.ts`

## G. 数据与研究素材
- [ ] 研究 `accuracy/*.json`
- [ ] 研究 `benchmarks/*.json`
- [ ] 研究 `corpora/README.md`
- [ ] 研究 `corpora/STATUS.md`
- [ ] 研究 `corpora/TAXONOMY.md`
- [ ] 研究 `corpora/representative.json`
- [ ] 研究 `corpora/sources.json`
- [ ] 审视语料文本在仓库中的角色

## H. 输出与综合
- [ ] 建立 `docs/research/02-模块/` 的模块卡网络
- [ ] 建立 `docs/research/03-功能/` 的功能卡网络
- [ ] 建立 `docs/research/04-代码实现/` 的实现卡网络
- [ ] 建立 `docs/research/05-专题/` 的专题卡网络
- [ ] 建立 `docs/research/06-问题与风险/` 的风险卡网络
- [ ] 完成从总览到实现的双链闭环
- [ ] 通过原子化 commit 持续推进
