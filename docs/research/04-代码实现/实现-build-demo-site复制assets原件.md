# 实现-build-demo-site复制assets原件

参见：[[功能-demo展示链]]、[[实现-assets预览页与demo导流]]、[[实现-assets-atlas报告与checker链]]

## 涉及文件
- `scripts/build-demo-site.ts`
- `pages/assets/index.html`
- `pages/assets/openai-symbol.svg`
- `pages/assets/claude-symbol.svg`

## 这次补的是哪条缺口
前面虽然已经补出了：
- `/assets/` atlas 页面
- `source svg` 链接
- `asset atlas` 深链

但 `site:build` 仍然只会产出：
- `site/assets/index.html`

不会把真正的 SVG 原件复制进静态站。

这会导致一个很实际的问题：
- atlas 页里的 `<img src="/assets/openai-symbol.svg">`
- `dynamic-layout` 资产卡里的 `source svg`

在静态站里都可能指向不存在的文件。

## `scripts/build-demo-site.ts`：显式复制 `pages/assets/*`
这次构建脚本新增了一个收尾步骤：
- 扫描 `pages/assets/`
- 跳过 `index.html`
- 把其余静态文件复制到 `site/assets/`

当前直接覆盖到静态站里的，就是：
- `site/assets/openai-symbol.svg`
- `site/assets/claude-symbol.svg`

## 为什么这一步是必要的
`pages/assets/index.html` 只是页面入口，不是资产本体。
如果只 build HTML，不复制原始 SVG，那么：
- atlas 页面能打开
- 但真正的图片源和原件链接会 404

这会把之前几轮刚补起来的资产证据链又掏空一半。

## 设计判断
- 这一轮推进的是静态构建链，而不是再加页面文案。
- `/assets/` 要想成为真正可发布的 demo 节点，必须同时带着 atlas 页面和 SVG 原件一起进入 `site/`。
- 这一步把 `pages/assets/*` 从“开发时能看”推进到了“静态构建后仍然完整可用”。
