# 编辑器行级滑轨（EditorRail）实现方案

## Context（背景）

Crisp File Explorer 插件目前在文件列表（`.nav-files-container`）右侧渲染弹簧滑轨 + 小球，用于快速导航文件。用户希望把同样的滑轨体验移植到 **Markdown 编辑器**：刻度对应文档每一行，小球默认跟随光标所在行，拖动小球可把光标定位到对应行但不滚动视图（"仅定位不跳转"）。这样在长文档里可以快速把光标"预置"到某行而不离开当前视口。

新增 `EditorRail` 类，挂载到 `.cm-editor`，复用现有弹簧/音效/拖动手感与全部视觉样式。文件列表滑轨（`FileExplorerRail`）完全不动。

---

## 核心设计

### 1. 挂载与 DOM

- 挂载到 `view.editor.cm.dom`（即 `.cm-editor`，CM6 主题内置 `position: relative`，不随内容滚动，最稳定）。
- 滚动源用 `view.editor.cm.scrollDOM`（`.cm-scroller`）的 `scrollTop`。
- 容器加类 `crisp-fe-container crisp-fe-editor-container`，rail/line/ticks/orb 的 DOM 结构与 FileExplorerRail 完全一致，复用现有类名。
- 滑轨位于编辑器**右侧**（`right: 6px`，避让滚动条），高度 = 视口高度（`100%`）。

### 2. 坐标系：视口坐标（非文档坐标）

EditorRail 内 `displayY / targetY / tick.y` 一律用**视口坐标** `∈ [0, clientHeight]`（与 FileExplorerRail 的文档坐标不同）。所有 `nearestIndex`/`indexRangeAround`/`morphProgress`/`waveOffset` 的纯像素语义无需改动。

### 3. 行 ↔ Y 映射（CodeMirror 6 API）

- **行 → 视口 Y**（跟随光标用）：
  `lineDocY = cm.heightAtLine(line, "document") + lineHalfHeight(line)`
  `viewportY = clamp(lineDocY - scrollEl.scrollTop, 0, clientHeight)`
- **视口 Y → 行**（拖动用）：
  `docY = scrollEl.scrollTop + viewportY`
  `block = cm.lineBlockAtHeight(docY)`
  `line = cm.state.doc.lineAt(block.from).number`
- `heightAtLine` 对未渲染行也有效（基于 heightmap 估算），无虚拟滚动盲区；折叠区已跳过折叠文本。

### 4. 刻度稀疏化（长文档不拥挤）

```
TARGET_LONG_TICKS = 80
step = lineCount <= 100 ? 1 : Math.max(1, Math.ceil(lineCount / TARGET_LONG_TICKS))
```
- 100 行以内：每行一个长刻度。
- 1000 行：step≈13，约 77 个长刻度。
- 10000 行：step≈125，仍 ~80 个。
- 光标行若不在 step 网格上，单独插入一项保证 orb 精确落点。
- 复用 `buildTickMarks`（精简版 `buildEditorTickMarks`，去掉 isToday/isMagnet 分支）在 gap≥22px 处自动插短刻度。
- 仅在 `lineCount !== lastLineCount` 时重建 ticks，避免每次 cursorActivity 重算。

### 5. 小球跟随光标

- 监听 `view.editor.on("cursorActivity", ...)`（rAF 节流）。
- `refresh` 内算 `targetY = clamp(光标行视口Y, 0, clientHeight)`：
  - 光标行在视口内 → orb 精确落在该行。
  - 光标行滚出视口上方 → orb 停在顶端；下方 → 底端。
- 拖动期间 `suppressCursorFollow = true`，屏蔽 cursorActivity 回跟；释放后置回 false。

### 6. 拖动定位不滚动

- `pointermove`：反推行号 → `cm.dispatch({ selection: { anchor: 行首pos }, scrollIntoView: false })`，仅行号变化时 dispatch。
- `scrollIntoView: false` 是 CM6 标准 TransactionSpec 字段，确保视图不滚动。
- 释放：不打开文件、不滚动、不抢焦点；光标停在最后 dispatch 的行。复用 `releaseSoundEnabled` + `audio.release()`。
- 刻度音效复用 `render()` 内 `tickSideMap` 滞后逻辑，`dragProgress = line / (lineCount - 1)`。

### 7. 删除的 FileExplorerRail 功能

磁吸（`applyMagnet`）、自动滚动（`performDragScroll`）、自动展开文件夹、今日轨迹、MutationObserver、`dispatchMouseSequence`、item 的 `el` DOM 位移。`render()` 内 item 位移分支跳过。

---

## 代码改动清单

### main.js

**新增**（`FileExplorerRail` 类结束后、`renderAboutCard` 前，约 L2013）：
- `function buildEditorTickMarks(items)`：精简版刻度构建。
- `class EditorRail`：约 350 行，镜像 FileExplorerRail 精简版。构造（DOM + CM 事件监听）、`destroy`、`refresh`、`render`、`animate`、`handlePointerDown/Move/Up`、`updateDrag`、`lineCenterY`、`scheduleRefresh`。

**修改**：
| 位置 | 改动 |
|---|---|
| `DEFAULT_SETTINGS`（~L17-34） | 增加 `editorRailEnabled: true,` |
| `onload`（~L2284） | 增加 `this.editorControllers = new Map();` |
| `onload` 命令区（~L2308） | 增加 `toggle-editor-rail` 命令 |
| `startRuntime`（~L2332 后） | 调用 `this.enhanceEditors()`；注册 `app.vault.on("modify", () => this.scheduleRefresh())` |
| `onunload`（~L2385-2388 后） | 追加 editorControllers 销毁循环 |
| `updateOrbStyles`（~L2537-2542） | 追加 editorControllers 遍历 |
| `scheduleRefresh`（~L2732-2751） | rAF 回调内追加 `enhanceEditors()` + editorControllers.refresh 循环 |
| `CrispFileExplorerPlugin` 类内 | 新增 `enhanceEditors()` 方法 |
| 设置面板 `display`（~L2271 后） | 插入「编辑器行级滑轨」分组（总开关 + 音效/外观说明） |

**不动**：`FileExplorerRail` 类、所有工具函数、`CrispAudio`、常量、`buildTickMarks`/`hasStableTickTopology` 等复用函数签名。

### styles.css（文件末尾追加，约 15 行）

```css
body.crisp-file-explorer-enabled .crisp-fe-editor-container {
  --crisp-fe-rail-x: 9px;
  --crisp-fe-accent: var(--interactive-accent, var(--color-accent));
  --crisp-fe-line-color: var(--text-faint);
  position: relative;
}
body.crisp-file-explorer-enabled .crisp-fe-editor-container .crisp-fe-rail {
  left: auto;
  right: 6px;
  width: 72px;
  height: 100%;
  overflow: hidden;
}
```
现有 `.crisp-fe-rail/.crisp-fe-line/.crisp-fe-tick/.crisp-fe-orb` 规则自动继承，无需改动。

---

## 复用点（不重写）

| 函数/类 | 位置 | 用途 |
|---|---|---|
| `clamp`/`mix`/`stepSpring` | main.js ~L855-886 | 弹簧物理 |
| `nearestIndex`/`indexRangeAround` | ~L888-928 | 最近刻度查找 |
| `morphProgress`/`gaussianInfluence`/`waveOffset` | ~L863-874 | 刻度 morph 动画 |
| `getOwnerDocument`/`getOwnerWindow`/`requestOwnerFrame`/`setOwnerTimeout` | ~L801-853 | DOM 工具 |
| `CrispAudio` 实例 `this.audio` | ~L1037, L2284 | 音效 |
| `buildTickMarks`/`hasStableTickTopology` | ~L943-1001 | 刻度拓扑（精简版复用） |
| `resolveOrbStyle`/`normalizeOrbStyle`/`IMAGE_ORB_ASSETS`/`ORB_SVGS` | ~L541, L572-570 | 小球样式 |
| `prefersReducedMotion` | ~L797 | 动画降级 |

---

## 风险与边界

| 风险 | 处理 |
|---|---|
| 编辑器未就绪（`cm` 为空，刚切叶子） | `enhanceEditors` 内跳过，下次 `layout-change` 补建 |
| 阅读视图 | `view.getViewType() !== "markdown"` 跳过 |
| Live Preview vs Source | 同一 `cm` 实例，API 行为一致 |
| cursorActivity 高频 | `scheduleRefresh` 已 rAF 节流，合并为一帧 |
| heightAtLine 性能 | 仅 `lineCount` 变化时重建 ticks（`lastLineCount` 缓存） |
| 折叠区拖动 | `lineBlockAtHeight` 返回折叠块，光标落折叠起点，可接受 |
| 滑轨压滚动条 | CSS `right: 6px` 避让 |
| 多 markdown 叶子 | 每叶独立 EditorRail，各自跟随自身光标 |
| 卸载顺序 | `onunload` 先销毁 editorControllers 再销毁 FE controllers |

---

## 验证

1. **语法**：`node --check main.js`
2. **加载**：`obsidian plugin:reload id=crisp-file-explorer` + `obsidian dev:errors` 无报错
3. **功能**（手动在 Obsidian 验证）：
   - 打开长 Markdown 文档，右侧出现滑轨 + 刻度 + 小球。
   - 在不同行打字，小球跟随到对应行刻度。
   - 滚动文档，光标行滚出视口时小球停在边缘。
   - 拖动小球，光标实时移到对应行，**视图不滚动**。
   - 松开小球，光标停在那行；若有 releaseSoundEnabled 播放释放音。
   - 切换文件，旧滑轨销毁、新滑轨建立。
   - 关闭 `editorRailEnabled` 开关，滑轨消失。
   - 切换 orb 样式，编辑器小球同步变化。
4. **边界**：阅读视图不挂载；10000 行长文档刻度稀疏正常；折叠展开后刻度重算。

---

## 实现顺序

1. `DEFAULT_SETTINGS` 加 `editorRailEnabled` + `onload` 加 `editorControllers` Map + `onunload` 销毁。
2. `EditorRail` 骨架：构造（DOM + CM 监听）、`destroy`、`refresh`（orb 跟随光标）、`render`、`animate`。
3. `enhanceEditors` + `scheduleRefresh` 集成。
4. `buildEditorTickMarks` + 步长采样 + tick morph 渲染。
5. 拖动：`handlePointerDown/Move/Up` + `cm.dispatch({scrollIntoView:false})` + `suppressCursorFollow`。
6. 音效复用。
7. 设置面板分组 + 命令。
8. styles.css 容器规则 + 滚动条避让微调。
9. 边界打磨：`viewportChange` 折叠重算、`vault.modify` 行数变化重建。
