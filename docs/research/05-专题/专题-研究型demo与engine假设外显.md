# 专题：研究型 demo 与 engine 假设外显

相关节点：[[模块-demo展示页面]]、[[功能-段落算法对比与river可视化]]、[[功能-emoji校正探针与自动化校验]]、[[实现-SVG资产到wrap-hull投影]]、[[实现-emoji-test报告与checker链]]

## 主题结论
Pretext 的 demo 里有一类页面不是“产品效果展示”，而是把核心引擎里的假设直接外显出来，变成可以观察、比较、质疑的研究台。

当前最典型的是两类：
- `pages/demos/justification-comparison.*`
- `pages/emoji-test.html`

## 1. `justification-comparison` 外显的是段落级假设

它外显了这些问题：
- 浏览器默认 greedy justification 的 spacing 代价是什么
- soft hyphen 与更积极的 hyphenation 策略能改善多少
- 如果允许全局 badness 优化，段落视觉能改善多少

这类问题如果只存在于代码里，会变成“也许以后可以做”。
被做成 demo 之后，它就变成：
- 同文本
- 同宽度
- 同指标
- 同屏可比较

因此它让“用户态段落算法实验”从抽象想法变成了可验证假设。

## 2. `emoji-test.html` 外显的是 measurement 层假设

这页真正关心的是：
- canvas 与 DOM 的 emoji 宽度差是否稳定
- 这种差是否主要由字号决定
- 差值是否近似不依赖 font family

这正对应了 `measurement.ts` 中 emoji correction 的核心工程前提。

重要的是：
- 它现在已经接上 `emoji-check`，可以自动回收摘要报告
- 但它仍不输出 repo 级 snapshot
- 它的角色依然是“探针优先、gate 次之”，用于验证一个实现假设是否足够可信，值得固化进 engine

## 3. 研究型 demo 的价值

这类页面比普通 demo 多做了一步：
- 普通 demo 展示“库能做什么”
- 研究型 demo 展示“库为什么敢这样做”

`justification-comparison` 让人看到：
- rich path 不只是 line.text 输出器
- 它足够支持另一套段落策略

`emoji-test` 让人看到：
- emoji correction 不是凭感觉加的 magic number
- 它有明确的 DOM/canvas 对比探针来源

## 4. 研究型 demo 的边界

它们也有明确局限：
- 不是正式回归 gate
- 结果未必长期落入 snapshot
- 更多服务于“设计假设验证”而不是“长期守护”

这点很重要，因为如果把所有探针都升级成 snapshot/gate，仓库会很快被噪声淹没。

## 当前判断
- `pages/emoji-test.html` 和 `justification-comparison` 最值得保留的不是页面本身，而是这种“把 engine 假设外显到浏览器里”的研究方法
- `emoji-test` 新接入 checker 后，更像“研究页到半正式守护”的过渡样板：先把假设做成浏览器探针，再决定是否值得升级成长期资产
- 未来再加研究页时，应该继续遵守这个边界：先当探针，再决定是否升级成正式校验资产
