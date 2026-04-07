# 实现-demo-landing预设卡片与资产预览

参见：[[功能-demo展示链]]、[[实现-demo-landing共享preset入口矩阵]]、[[实现-probe预设词汇共享到页面与checker]]、[[实现-dynamic-layout资产卡片与几何可视摘要]]

## 涉及文件
- `pages/demos/index.html`
- `pages/demos/index.ts`
- `pages/assets/openai-symbol.svg`
- `pages/assets/claude-symbol.svg`

## 问题
原来的 demo landing 只把 preset 深链渲染成一串普通按钮。它能跳，但看不出每个 preset 的参数轮廓，也看不出 `dynamic-layout` 这类页面到底用了哪些资产输入。页面只是“入口目录”，还不是“demo 入口链”。

## 本次改动
- 将四组 probe-ready demo 的入口按钮升级成小型 preset cards。
- 每张入口卡都直接显示关键参数摘要，而不是只暴露 label：
  - `dynamic-layout`: `width × height + OpenAI/Claude angle`
  - `editorial-engine`: `width × height + orbPreset + animate`
  - `justification`: `width + indicators`
  - `emoji`: `size range + threshold`
- `emoji` 额外保留 `Live sweep` 入口，让 landing 能直接跳到无 preset 的完整扫描页。

## assets 进入 landing 视图
- `pages/assets/openai-symbol.svg` 与 `pages/assets/claude-symbol.svg` 不再只活在 `dynamic-layout` 正文页里。
- landing 里的 `Dynamic Layout` 卡片新增 asset strip，直接展示两枚 logo 的 preview chip。
- 这样读者在进入 demo 前就能知道这不是抽象参数页，而是和实际 wrap asset 绑定的场景入口。

## 实现方式
- `index.ts` 引入 SVG 资产并用 `resolveImportedAssetUrl()` 做和 demo 页一致的 URL 解析。
- `ActionDefinition` 从纯 `label + href` 扩成 `label + href + meta`，由脚本统一渲染成两层入口卡。
- landing 没有复用页面内的 `probe rail` DOM 结构，而是保持“目录页”自己的紧凑入口卡风格；它展示的是场景切片，不是运行中状态。

## 设计判断
- demo landing 的任务不是替代 demo 页本身，而是把“该点哪一个 preset”这件事前置。
- 参数摘要和资产预览一起出现后，用户第一次进入页面前就能看见：
  - 哪些是 viewport probe
  - 哪些是 interactive scene
  - 哪些与真实 asset wrap 绑定
- 这让 [[功能-demo展示链]] 从“可点击链接集合”变成了“从 landing 到运行页的 preset/asset 证据链”。
