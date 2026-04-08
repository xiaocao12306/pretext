# 实现-emoji与justification钻取深链导出

参见：[[功能-demo展示链]]、[[实现-emoji-test尺寸与字体钻取面板]]、[[实现-justification-comparison列钻取面板]]、[[实现-preset-key路由与报告对齐]]

## 涉及文件
- `pages/emoji-test.html`
- `pages/demos/justification-comparison.ts`

## 这次补的是哪条缺口
前两轮已经把两张页都补成了可钻取页面：
- `emoji-test` 可以选中 `size / font`
- `justification-comparison` 可以选中 `focusColumn`

但这些交互还只是“当前页状态”。

用户虽然能点进：
- 某个 `size × font`
- 某个 `CSS / Hyphen / Optimal`

却还不能把这个焦点态直接导出成稳定 URL。

这会带来一个明显问题：
- 页面上看到了异常焦点
- route cards 仍然只导出 preset / width / threshold
- 复制链接后，对方打开的还是未聚焦的默认状态

## `emoji-test`：把 `focusSize/focusFont` 接进导出链
`pages/emoji-test.html` 现在新增了两类 query 状态：
- `focusSize`
- `focusFont`

页面会在首次加载时从 query 恢复焦点；
后续只要用户在页面里切换 size / font 焦点，route cards 就会同步重建，把当前 drilldown 一起导出。

因此像下面这类状态终于可以被稳定分享：
- `preset=dense&focusSize=16`
- `sizes=12,16,24&threshold=0.5&focusSize=16&focusFont=Georgia`

## `justification-comparison`：把 `focusColumn` 接进 route cards
`pages/demos/justification-comparison.ts` 现在会解析：
- `focusColumn=css|hyphen|optimal`

并在用户点击：
- comparison card
- 实际列容器
- clear focus

之后同步刷新 route cards。

这意味着这张页的 drilldown 也不再只是本地点击态，而开始成为可复现 probe state。

## 设计判断
- 这次不是新增 another panel，而是把“页内 drilldown”接进已有 deep-link 导出协议。
- `emoji-test` 和 `justification-comparison` 现在都从“能点进去看”推进到了“能把当前焦点导出去”。
- 对 Phase 3 demo 来说，这一步很关键，因为它把临时交互状态提升成了真正可复现的场景链接，也让后续 checker / 手工诊断更容易围绕同一组 URL 协议收敛。
