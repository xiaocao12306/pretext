# 实现-build-demo-site重写根路径链接

参见：[[功能-demo展示链]]、[[实现-build-demo-site复制assets原件]]、[[实现-assets预览页与demo导流]]、[[实现-dynamic-layout资产卡接入atlas深链]]

## 涉及文件
- `scripts/build-demo-site.ts`
- `pages/assets/index.html`
- `pages/emoji-test.html`
- `pages/demos/justification-comparison.ts`
- `pages/demos/dynamic-layout.ts`

## 这次补的是哪条缺口
上一轮已经补了静态站里的 SVG 原件复制，但还有一个更隐蔽的问题：

很多页面和内联脚本仍在输出根路径链接，例如：
- `/assets/openai-symbol.svg`
- `/assets/?asset=openai&size=144`
- `/emoji-test?preset=dense`
- `/demos/justification-comparison?preset=river-tight`

在本地根目录 server 下这没问题，但静态产物一旦挂到 repo 子路径或非根路径站点，这些链接会直接跳出当前子路径上下文。

## `scripts/build-demo-site.ts`：补一层通用根路径重写
这次在 `moveBuiltHtml()` 里新增了 `rewriteRootRelativeSiteLinks()`，专门处理内联 HTML/JS 里被引号包住的站内根路径字符串。

它会覆盖当前 demo 链里常见的前缀：
- `assets`
- `demos`
- `emoji-test`
- `dynamic-layout`
- `editorial-engine`
- `justification-comparison`
- 以及其余几个 root alias demo

重写方式不是硬编码替换，而是按当前产物目标路径计算相对地址。

### 结果
例如：
- `assets/index.html` 里的 `/emoji-test?...` 会变成 `../emoji-test?...`
- `dynamic-layout/index.html` 里的 `/assets/?asset=openai&size=144` 会变成 `../assets/?asset=openai&size=144`
- atlas 页里的 `/assets/openai-symbol.svg` 也会落成当前静态目录可消费的相对路径

## 为什么这一步和“复制 assets 原件”是两回事
复制原件只解决“文件在不在”。
这次解决的是“链接指不指得到那个文件”。

如果没有这层 rewrite，就会出现：
- `site/assets/openai-symbol.svg` 已经存在
- 但 atlas 页和 demo 页仍然硬跳 `/assets/openai-symbol.svg`
- 最终在子路径站点里照样打不开

所以这一步补的是静态构建链里的 URL 语义，而不是文件物理存在性。

## 设计判断
- 这轮推进的是 `site:build` 的路径健壮性，不是又加一个页面。
- 复制原件 + 重写根路径链接合起来，才算把 `pages/assets/*`、`emoji-test`、`justification-comparison`、`dynamic-layout` 这些页面真正带入可部署的静态 demo 链。
- 对 Phase 4 来说，这比继续加报告摘要更关键，因为它直接决定构建产物在真实托管环境里能不能用。
