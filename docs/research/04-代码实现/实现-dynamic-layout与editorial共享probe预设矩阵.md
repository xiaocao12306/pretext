# 实现：dynamic-layout 与 editorial 共享 probe 预设矩阵

相关文件：
- `pages/probe-presets.ts`
- `pages/demos/dynamic-layout.ts`
- `pages/demos/editorial-engine.ts`
- `scripts/dynamic-layout-check.ts`
- `scripts/editorial-engine-check.ts`
- `DEVELOPMENT.md`

上游：[[功能-demo展示链]]
并列参考：[[实现-probe预设词汇共享到页面与checker]]、[[实现-dynamic-layout报告与资产几何探针链]]、[[实现-editorial-engine报告与orb场景checker链]]

## 这张卡关注什么
这里看的不是报告协议本身，而是 `dynamic-layout` / `editorial-engine` 怎样把“页内 probe rail 的快捷场景”继续收束成和 checker 共用的 preset vocabulary。

这一步的重点是让 rich demo 的 framed 场景第一次拥有稳定 key，而不只是页面里几条硬编码 query。

## 1. `pages/probe-presets.ts` 现在开始承载 rich demo 场景
这次新增了两组 preset：

- `DYNAMIC_LAYOUT_PROBE_PRESETS`
  - `spread-1365`
  - `narrow-700`
  - `angle-pair`
- `EDITORIAL_ENGINE_PROBE_PRESETS`
  - `stacked-1365`
  - `diagonal-960`
  - `corridor-640`

它们不只是 label，而是完整的 framed scenario：
- `pageWidth/pageHeight`
- 几何状态参数
  - `dynamic-layout` 的 `openaiAngle/claudeAngle`
  - `editorial-engine` 的 `orbPreset`
- probe 行为参数
  - `animate`
  - `showDiagnostics`

因此这里被共享的其实不是“名字”，而是一套可复现的 demo 首帧合同。

## 2. `Live` 继续留在页面本地，checker 只接 framed preset
这次没有把所有 rail 项都抽到共享层。

两个 rich demo 都保留了一个本地 `Live` 入口：
- 不固定 `pageWidth/pageHeight`
- 保留交互语义
- 不要求确定性的脚本复现

而共享 preset 只覆盖：
- 固定 frame
- 固定几何起点
- 适合 automation 回收

这个边界很重要，因为它把“人类交互入口”和“脚本可重复入口”明确分开了，避免 checker 偷吃 viewport 实时状态或动画状态。

## 3. 页面 rail 现在直接消费共享 preset，而不是重复写 query
`pages/demos/dynamic-layout.ts` 与 `pages/demos/editorial-engine.ts` 都改成：
- 保留本地 `Live`
- 其余 rail 项从共享 preset 数组映射生成
- active 判定也按 preset 的显式字段比较

于是页面里不再散落多份：
- `1365x900`
- `700x900`
- `stacked`
- `corridor`
- `-Math.PI / Math.PI`

这让 rich demo rail 从“几个手写链接”提升成“共享场景视图”。

## 4. checker 开始接受同一批 rich demo preset key
这次两条脚本都补上了 shared-preset 入口：

- `scripts/dynamic-layout-check.ts`
  - 新增 `--presets=spread-1365,angle-pair`
  - 也支持环境变量 `DYNAMIC_LAYOUT_CHECK_PRESETS`
- `scripts/editorial-engine-check.ts`
  - `--presets=` 现在既能吃旧的 orb preset：`default,stacked,...`
  - 也能吃新的 framed preset：`stacked-1365,diagonal-960,...`

其中 `editorial-engine` 刻意保留了旧 orb preset 语义：
- 旧语义还是 `scenarios x orbPresets` 的笛卡尔积
- 新语义则是页面 rail 对应的具体 framed scenario

这使得脚本既没有丢掉原来的 sweep 能力，也补上了和页面直连的命名场景。

## 5. 这一步把 rich demo 的场景矩阵从“页面实现细节”抬成了 repo 内部语言
之前 rich demo 的 framed 场景虽然已经存在，但它们主要存在于：
- 页内 `buildProbeHref(...)`
- checker 里的本地默认矩阵

现在这批场景第一次有了 repo 内部的稳定 key。

因此文档、页面、脚本终于可以说同一种话：
- `spread-1365`
- `angle-pair`
- `stacked-1365`
- `corridor-640`

这意味着：
- Phase 3 demo 页的 rail 不再只是 UI 糖
- Phase 4 checker 也不再只是重新拼 query
- 研究卡可以直接引用这些场景 key，而不是每次重抄参数

## 当前判断
- `probe-presets.ts` 现在不只是 measurement/paragraph 页的 preset 表，也开始承载 rich demo 的 framed scenario vocabulary
- `dynamic-layout` 与 `editorial-engine` 的 rail 和 checker 终于进入同一套命名空间，说明 Phase 3 与 Phase 4 在 rich demo 上也真正打通了
- 这一步尤其适合后续继续扩 root alias、landing 页和 snapshot 脚本，因为场景 key 已经不再埋在页面局部实现里
