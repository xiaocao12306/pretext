# 实现-justification场景深链卡片与probe-check矩阵摘要

参见：[[功能-demo展示链]]、[[实现-justification-demo报告与checker链]]、[[实现-preset-key路由与报告对齐]]、[[实现-checker编排与快照生成]]

## 涉及文件
- `pages/demos/justification-comparison.html`
- `pages/demos/justification-comparison.ts`
- `scripts/probe-check.ts`

## justification demo：把当前场景导出成可跑深链
`justification-comparison` 以前有 preset rail 和结果卡，但缺一层“把当前场景导出给别人”的面板。用户能拖 slider、切 indicator，却不能从页面里直接拿到：
- demo path 深链
- root alias 深链
- 带 `report=1` 的 checker 入口

这次新增 `route-card-grid`，由页面根据当前控件状态实时生成三张链接卡。

### 三张卡的职责
- `Demo path`
  - 指向 `/demos/justification-comparison`
  - 当前状态命中 preset 时导出 `preset=...`
  - 未命中时导出 `width + showIndicators`
- `Root alias`
  - 指向 `/justification-comparison`
  - 保持和 demo path 等价的当前场景参数
- `Report run`
  - 在当前场景 query 上额外附加 `report=1`
  - 让页面里已经可见的交互状态直接转成 checker 入口

这让 demo 页从“只可观看”变成“可导出场景”。

## probe-check：从单宽度 CLI 变成小型矩阵 checker
`probe-check.ts` 之前一次只能跑一个 `--width`，更像最薄的单点诊断器。

这次补上：
- `--widths=260,320,480` 多宽度运行
- 每个宽度逐条打印原有详细报告
- 末尾再输出 `matrix summary`
- `--output=...` 可把单次结果或多次数组写成 JSON

### matrix summary 输出的内容
- 总运行数 / ready 数 / error 数
- width 范围
- diff 范围
- exact 比例
- 每个宽度的 `diff / lines / height / method / exact|mismatch`

这样它就从“单点解释器”升级成“单点解释器 + 小矩阵总览”两用脚本。

## 设计判断
- demo 页的当前场景应该可以直接落到 URL；否则 preset rail 和交互控件之间仍然隔着一层人工转述。
- `probe-check` 不需要演化成另一个 corpus/gatsby sweep，只需要在“少量宽度诊断”这档补一个轻量 summary，就足够覆盖常见比较需求。
- 页面里的 `Report run` 深链和脚本里的 `--widths` matrix 属于同一条证据链：都在缩短“看到问题场景”到“复现问题场景”的距离。
