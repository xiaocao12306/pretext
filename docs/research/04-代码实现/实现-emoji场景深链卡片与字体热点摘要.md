# 实现-emoji场景深链卡片与字体热点摘要

参见：[[功能-demo展示链]]、[[实现-emoji-test报告与checker链]]、[[实现-emoji字体摘要卡片与justification实时preset对齐]]、[[实现-checker编排与快照生成]]

## 涉及文件
- `pages/emoji-test.html`
- `pages/demos/emoji-test.html`
- `scripts/emoji-check.ts`

## emoji-test：把当前扫描场景直接导出成深链
之前 `emoji-test` 已经有 preset rail、size 卡片、font 卡片，但缺少和 `justification` 一样的“场景导出层”。

这次在页内新增 `route-card-grid`，把当前扫描状态直接投影成三张卡：
- `Root path`
  - 指向 `/emoji-test`
  - 命中 preset 时导出 `preset=...`
  - 手动状态导出 `sizes + threshold`
- `Demo alias`
  - 指向新增的 `/demos/emoji-test`
  - 通过 redirect 保持与 root path 同步
- `Report run`
  - 在当前 query 上追加 `report=1`
  - 让页面当前状态可以直接转成交给 checker 的可跑链接

## demo alias：补上 `/demos/emoji-test`
仓库之前没有 `pages/demos/emoji-test.html`，`emoji-test` 只有 root 路径。

这次新增 alias 页面，把：
- `/demos/emoji-test?preset=...`
- `/demos/emoji-test?report=1&sizes=...`

都转发到 `/emoji-test`，并保留 `search/hash`。这样 Phase 3 demo 链里终于有了统一的 `/demos/*` 入口。

## emoji-check：把页面里的 font 层结果吃回脚本
`emoji-test` 页面已经能生成 `fontSummaries`，但 `scripts/emoji-check.ts` 原本仍只消费 `sizeSummaries`。

这次补上：
- `EmojiFontSummary` 类型
- `printReport()` 中的逐字体输出
- `printMatrixSummary()` 中的 `noisyFontCount` / `hottestFont` 汇总

这样 checker 终于能回答“哪个 preset 最吵，以及最吵的是哪个字体”，而不只是停在 size 维度。

## 设计判断
- `emoji-test` 的当前场景不是抽象配置，而是 `sizes + threshold + route` 的组合。场景深链卡片把这层语义显式化了。
- `/demos/emoji-test` 的价值不在于多一张页面，而在于把 `emoji-test` 纳入统一的 demo 入口命名空间。
- checker 对 page report 的消费也更完整了：现在它既能看 size 维度，也能看 font 维度，和页面上的结果卡更加一致。
