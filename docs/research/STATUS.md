# Pretext Research Status

## 当前状态
- [x] C0 研究启动闭环已完成
- [x] C1 公共接口与开发面
- [ ] C2 核心引擎全链路
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

## 当前判断
- Pretext 的产品中心是“浏览器近似一致的文本布局预测”，不是自带渲染器
- 冷路径 `prepare()` / 热路径 `layout()` 的硬分离是第一原则
- `src/analysis.ts` 与 `src/line-break.ts` 是当前复杂度最高的两个核心实现区
- `pages/` 与 `scripts/` 不是附属 demo，而是正确性与性能主张的证据链
- `prepare()` 的冷路径边界已经比较清楚：语义预处理在 `analysis.ts`，浏览器 shim 与宽度缓存主要在 `measurement.ts`

## 下一检查点
1. 推进 C2：继续研究 `src/line-break.ts` 与 `src/bidi.ts`
2. 建立 `layout()` 热路径与 rich line APIs 的实现卡
3. 读取 `src/layout.test.ts` 与 `src/test-data.ts`，补测试视角
4. 完成核心引擎第一轮模块卡

## Commit 追踪

| 子话题 | commit 次数 | 最新 commit | 状态 | 策略 |
|---|---:|---|---|---|
| 研究启动与总览骨架 | 1 | `docs: 初始化研究路线图与项目总览` | 正常 | 继续进入顶层工程面与 `src/` 核心模块 |
| 公共接口与工程发布面 | 1 | `docs: 研究公共接口与工程发布面` | 正常 | 下一步进入 `src/analysis.ts` 与 `src/line-break.ts` |
| prepare 冷路径分析 | 1 | `docs: 研究prepare冷路径与分析测量模块` | 正常 | 下一步补齐断行引擎与测试视角 |

## 风险与阻塞
- 暂无实际阻塞
- 当前最大的研究风险不是技术卡死，而是过早钻进 `src/analysis.ts` 的局部规则而忽略页面/脚本证据链；已通过 [[00-研究路线图与检查点]] 约束顺序

## 死循环监控规则
- 若同一内容相关 commit > 5 次：判定可能陷入牛角尖
- 处理动作：记录卡点、切换研究路径、补未决问题卡、暂停细抠
