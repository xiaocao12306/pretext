# 专题：浏览器 ground truth 与工程验证

相关节点：[[专题-工程验证与发布面]]、[[模块-浏览器验证页面]]

## 主题结论
Pretext 的正确性不是靠内部推理自证，而是靠浏览器 ground truth 持续校验。仓库里页面、脚本、快照、研究日志共同构成了这套验证系统。

## 验证梯度

### 1. durable invariant tests
`src/layout.test.ts`

作用：
- 稳定检查 exported API 语义
- 不追逐浏览器细粒度差异

### 2. shared sweep pages
`pages/accuracy.ts`

作用：
- 大范围、共享维度、适合回归

### 3. performance baseline
`pages/benchmark.ts`

作用：
- 证明结构性性能收益
- 监视 prepare/layout/rich path 的不同成本面

### 4. deep diagnostics
`pages/corpus.ts`
`pages/probe.ts`

作用：
- 对 mismatch 做细致定位
- 区分真实算法问题、extractor 问题、宽度累计漂移、局部 shaping/context 问题

## 关键工程模式

### 导航相位
页面会显式发布：
- `loading`
- `measuring`
- `posting`

这使自动化在超时时知道卡在哪个阶段。

### 小报告 vs 大报告
- 小报告走 hash
- 大报告走 `reportEndpoint` POST

这避免把大批 sweep rows 全塞进 URL/hash。

### DOM 与 canvas 双视角
诊断页不只比较“浏览器 vs Pretext”，还经常同时比较：
- segment sum width
- canvas full-string width
- DOM width

这能把“断行错了”继续拆成“哪一层事实漂了”。

## 当前判断
- 浏览器验证页面是产品可信度的一部分，不是附属工具
- 这套验证结构也解释了为什么 `pages/`、`scripts/`、`STATUS.md`、`RESEARCH.md` 都不能从研究范围里排除
