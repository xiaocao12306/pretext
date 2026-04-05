# 实现：demo-landing 共享 preset 入口矩阵

相关文件：
- `pages/demos/index.html`
- `pages/demos/index.ts`
- `pages/probe-presets.ts`
- `pages/dynamic-layout.html`
- `pages/editorial-engine.html`
- `pages/justification-comparison.html`
- `pages/emoji-test.html`

上游：[[功能-demo展示链]]
并列参考：[[实现-demo矩阵入口与root别名路由]]、[[实现-probe预设词汇共享到页面与checker]]、[[实现-dynamic-layout与editorial共享probe预设矩阵]]

## 这张卡关注什么
这里看的不是某张 demo 页内部如何读 query，而是 `pages/demos/index` 这张首页怎样继续从“手写几个快捷链接”推进到真正消费共享 preset 词汇的入口矩阵。

## 1. landing page 不再把 probe query 硬编码在 HTML 里
这次给 `pages/demos/index.html` 加了一个配套脚本 `pages/demos/index.ts`。

HTML 现在只保留：
- 卡片结构
- action 容器

真正的 probe action 则由 `index.ts` 在运行时填充。

这意味着首页不再自己维护：
- `pageWidth=1365`
- `orbPreset=stacked`
- `sizes=12,16,24,32`
- `width=364`

这些具体实验参数，而是开始从共享 preset 资产生成入口。

## 2. `probe-presets.ts` 第一次进入 landing 层
`index.ts` 直接消费了四组共享词汇：
- `DYNAMIC_LAYOUT_PROBE_PRESETS`
- `EDITORIAL_ENGINE_PROBE_PRESETS`
- `JUSTIFICATION_PROBE_PRESETS`
- `EMOJI_PROBE_PRESETS`

结果是：
- rich demo 的 framed probe
- paragraph demo 的 width / indicator probe
- emoji 页的 size / threshold probe

现在都能从同一张 landing page 直接点到，而且这些入口和 checker 使用的是同一套命名场景。

## 3. 首页动作开始按“页面类型”选择不同相对入口
这次 landing 并没有统一写死成绝对 `/...` 链接，而是显式区分：
- demo 深页：`./bubbles`、`./rich-note`
- 有顶层入口的 probe 页：`../dynamic-layout`、`../editorial-engine`、`../justification-comparison`、`../emoji-test`

这样做的意义是：
- 本地 dev 下 `pages/demos/index.html` 仍能正确跳到深页或根 alias
- 静态站点根目录下同一份页面也能正确落到对应 slug

也就是说，landing 入口对路径的理解开始从“依赖 build 时重写”部分前移到源码自身。

## 4. 首页第一次完整露出共享 preset 矩阵，而不只是挑两三个例子
之前首页更多是：
- live demo
- 两三个示例 query

现在 `justification` 与 `emoji` 直接露出整组共享 preset；
`dynamic-layout` 与 `editorial-engine` 也变成：
- 一个 live 入口
- 外加完整的 framed preset 列表

因此首页第一次具备了“矩阵控制台”的味道，而不只是“案例导航页”。

## 5. 这一步让 Phase 3 首页和 Phase 4 checker 用上了同一种语言
此前共享 preset 已经打通了：
- 页内 probe rail
- checker CLI

但 landing page 仍然停留在手写 query 的阶段。

这次补上之后，三层终于统一：
- 首页入口
- demo 页 rail
- checker 参数

于是像下面这些 key 不再只是脚本内部词汇：
- `spread-1365`
- `angle-pair`
- `stacked-1365`
- `corridor-640`
- `probe-364`
- `dense`

而是正式进入了 repo 的入口层语言。

## 当前判断
- `pages/demos/index` 现在更像一个研究型 demo 控制台，而不是静态链接页
- 共享 preset 词汇已经从 checker 层、页内 rail 层继续上推到 landing 层，Phase 3 和 Phase 4 的接口面因此更一致了
- 这一步也让后续继续扩 demo suite、snapshot 或 landing 分组时，不必再把一堆 query 字面量抄来抄去
