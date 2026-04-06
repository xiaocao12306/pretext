# 实现：preset key 路由与报告对齐

相关文件：
- `pages/emoji-test.html`
- `pages/demos/justification-comparison.ts`
- `pages/demos/dynamic-layout.ts`
- `pages/demos/editorial-engine.ts`
- `pages/demos/index.ts`
- `scripts/emoji-check.ts`
- `scripts/justification-check.ts`
- `scripts/dynamic-layout-check.ts`
- `scripts/editorial-engine-check.ts`

上游：[[功能-demo展示链]]
并列参考：[[实现-probe预设词汇共享到页面与checker]]、[[实现-dynamic-layout与editorial共享probe预设矩阵]]、[[实现-demo-landing共享preset入口矩阵]]

## 这张卡关注什么
这里看的不是 preset 定义本身，而是 repo 怎样把共享 preset 进一步升级成真正的一等 URL / report 合同。

此前虽然已经有共享 key，但页面入口大多还是把它们重新展开成原始 query 参数。
这次则继续往前推一步：让页面、landing、checker 都能直接说 `?preset=...`。

## 1. 页面开始原生接受 `preset=...`
这次四类页面都新增了 preset 解析：
- `emoji-test.html`
- `justification-comparison.ts`
- `dynamic-layout.ts`
- `editorial-engine.ts`

它们现在会先尝试从 `preset` 找到共享配置，再用显式 query 覆盖：
- `sizes` / `threshold`
- `width` / `showIndicators`
- `pageWidth` / `pageHeight` / `openaiAngle` / `claudeAngle`
- `orbPreset` / `animate` / `showDiagnostics`

这意味着 preset 终于不只是“别名常量”，而是页面正式支持的参数入口。

## 2. 显式 raw query 仍然保留最高优先级
这次没有为了收敛 preset 而牺牲诊断能力。

页面采用的是：
- 先读 `preset`
- 再让显式 query 覆盖 preset 字段

因此两类需求可以同时成立：
- 日常分享与 checker 调用走短小稳定的 `?preset=...`
- 临时诊断仍可直接打裸参数做细抠

这个优先级设计很关键，因为 repo 既要有稳定场景语言，也要保留研究现场的手工探针自由度。

## 3. 页内 rail 和 landing 入口都改成产出 `preset=...`
这次不仅是页面支持读 preset，连产出链接的地方也一起切过去了：
- `emoji-test` / `justification` / `dynamic-layout` / `editorial-engine` 的页内 rail
- `pages/demos/index.ts` 的 landing action 矩阵

所以 repo 的入口层现在终于不再反复展开：
- 宽度
- 阈值
- 角度
- orbPreset

而是开始稳定输出场景 key。

## 4. checker 也改成真正请求 preset URL，而不是本地重展开参数
这次四条 checker 里只要是共享 preset 分支，就会直接请求：
- `?preset=tight`
- `?preset=probe-364`
- `?preset=spread-1365`
- `?preset=stacked-1365`

只有非 preset 的自由矩阵分支，才继续手动拼原始参数。

这一步的价值在于：
- checker 和 landing 不再只是“恰好指向同一组参数”
- 它们真的开始请求同一个 URL 合同

## 5. 页面 report 现在会把 `presetKey` 回写出来
页面报告对象现在也会在“纯 preset 驱动、未被裸参数覆盖”时回写 `presetKey`。

这让 automation 输出第一次具备了稳定的场景身份字段，而不只是：
- `width=364`
- `threshold=0.5`
- `pageWidth=1365`

等一堆需要外部再猜一次的原始参数。

## 当前判断
- 共享 preset 现在已经从“仓库内部词汇”变成“页面入口、checker 请求、report 回执”三者共享的协议面
- 这一步比单纯提取常量更重要，因为它真正消除了 landing / 页面 / checker 三层重复拼 query 的结构性噪音
- 后续如果要继续给 snapshot、静态站点或外部文档暴露稳定 demo 场景，`preset=` 会比继续扩散原始参数字符串更稳
