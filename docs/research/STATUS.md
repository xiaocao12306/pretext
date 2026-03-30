# Pretext Research Status

## 当前状态
- [x] C0 研究启动闭环已完成
- [x] C1 公共接口与开发面
- [x] C2 核心引擎全链路
- [ ] C3 页面与 demo dogfooding
- [ ] C4 自动化与快照治理
- [ ] C5 数据资产与研究沉淀
- [ ] C6 最终综合总结

## 本轮完成
1. 阅读 `TASK.md`、[[CHECKLIST]]、[[STATUS]] 的初始内容
2. 阅读 `README.md`、`DEVELOPMENT.md`、`package.json`
3. 扫描仓库目录与代码文件分布
4. 读取核心引擎入口：`src/layout.ts`、`src/analysis.ts`、`src/measurement.ts`、`src/line-break.ts`、`src/bidi.ts`
5. 阅读 `CHANGELOG.md`、顶层 `STATUS.md`、`RESEARCH.md`、`TODO.md`、`tsconfig*.json`、`oxlintrc.json`
6. 产出 [[00-研究路线图与检查点]]、[[01-仓库地图]]、[[01-项目总览]]
7. 产出 [[模块-公共API与Prepared模型]]、[[专题-工程验证与发布面]]
8. 产出 [[模块-文本分析]]、[[模块-文本度量与缓存]]、[[实现-prepare调用链]]
9. 通读 `src/line-break.ts`、`src/bidi.ts`、`src/layout.test.ts`、`src/test-data.ts`
10. 产出 [[模块-断行引擎]]、[[模块-Bidi辅助]]、[[模块-测试与共享测试数据]]
11. 产出 [[实现-layout热路径]]、[[实现-rich-line-API调用链]]
12. 补读 `src/text-modules.d.ts` 并确认 C2 所需 `src/` 文件已全部纳入研究
13. 阅读 `pages/accuracy.ts`、`pages/benchmark.ts`、`pages/corpus.ts`、`pages/probe.ts`、`pages/diagnostic-utils.ts`、`pages/report-utils.ts`
14. 产出 [[模块-浏览器验证页面]]、[[功能-浏览器准确性校验]]、[[功能-benchmark与性能快照]]、[[功能-corpus与probe诊断]]、[[专题-浏览器ground-truth与工程验证]]

## 当前判断
- Pretext 的产品中心是“浏览器近似一致的文本布局预测”，不是自带渲染器
- 冷路径 `prepare()` / 热路径 `layout()` 的硬分离是第一原则
- `src/analysis.ts` 与 `src/line-break.ts` 是当前复杂度最高的两个核心实现区
- `pages/` 与 `scripts/` 不是附属 demo，而是正确性与性能主张的证据链
- `prepare()` 的冷路径边界已经比较清楚：语义预处理在 `analysis.ts`，浏览器 shim 与宽度缓存主要在 `measurement.ts`
- `line-break.ts` 的核心设计不是单一算法，而是 simple/general 双路径 + batched/streaming 共享语义
- `layout.test.ts` 与 `src/test-data.ts` 明确体现了“持久不变量测试”与“浏览器验证共享语料”分层
- 页面层已经显式分成 broad sweep、benchmark baseline、long-form deep diagnostic、short probe 四类工具，不同页面承担不同精度/成本层级

## 下一检查点
1. 继续推进 C3：补读 `pages/gatsby.ts` 与 `pages/demos/**/*`
2. 为页面层建立更细的实现卡，尤其是 report channel 与 diagnostic extractor
3. 开始切入 `scripts/browser-automation.ts` 与各 checker
4. 评估何时将 C3 标记为完成

## Commit 追踪

| 子话题 | commit 次数 | 最新 commit | 状态 | 策略 |
|---|---:|---|---|---|
| 研究启动与总览骨架 | 1 | `docs: 初始化研究路线图与项目总览` | 正常 | 继续进入顶层工程面与 `src/` 核心模块 |
| 公共接口与工程发布面 | 1 | `docs: 研究公共接口与工程发布面` | 正常 | 下一步进入 `src/analysis.ts` 与 `src/line-break.ts` |
| prepare 冷路径分析 | 1 | `docs: 研究prepare冷路径与分析测量模块` | 正常 | 下一步补齐断行引擎与测试视角 |
| line-break/bidi/测试视角 | 1 | `docs: 研究断行引擎与测试语义` | 正常 | 下一步转入页面与验证层 |
| C2 阶段收口 | 1 | `docs: 完成核心引擎C2阶段研究` | 正常 | 转入 `pages/` 验证层 |
| 页面验证层首轮 | 1 | `docs: 研究浏览器验证页面与诊断功能` | 正常 | 下一步补 `gatsby` / demos / scripts |

## 风险与阻塞
- 当前最大的研究风险不是技术卡死，而是过早钻进 `src/analysis.ts` 的局部规则而忽略页面/脚本证据链；已通过 [[00-研究路线图与检查点]] 约束顺序
- `2026-03-31` 推送阻塞：`git push origin main` 失败，原因是当前环境缺少 GitHub HTTPS 凭据；SSH 也返回 `Permission denied (publickey)`
- `TASK.md` 已作为本地任务文件加入 `.git/info/exclude`，有意不纳入版本控制，避免污染仓库提交历史
- 因远端推送凭据缺失，后续 research commit 只能先本地原子化推进；这会暂时违背“本地 ahead 不超过 3”的理想约束，但阻塞点已明确，不再在凭据问题上反复空转

## 死循环监控规则
- 若同一内容相关 commit > 5 次：判定可能陷入牛角尖
- 处理动作：记录卡点、切换研究路径、补未决问题卡、暂停细抠
