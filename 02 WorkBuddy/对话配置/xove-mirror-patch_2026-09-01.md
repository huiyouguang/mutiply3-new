# Xove Dashboard「笔记映射」补丁文档（可复用）

> 用途：本插件默认只有内置模块，无法把**任意 md 笔记**映射成首页卡片。
> 本补丁在不改动插件内核的前提下，新增「笔记映射」能力，使其与你的主页（dataviewjs 工作台）双向联动。
> **插件更新后，请基于本文件重新评估并手动重打补丁**（插件无 hooks，更新会覆盖 main.js / styles.css）。

---

## 0. 元信息（打补丁时回填）

| 项 | 值 |
|---|---|
| 插件 | xove-dashboard |
| **被打补丁版本** | **0.3.1** |
| 补丁日期 | 2026-09-01 |
| 改动文件 | `main.js`、`styles.css`、`01 主页/主页2.md`（外部）、`01 主页/工作台桥接.md`（新建） |
| 回滚方式 | 用 `02 WorkBuddy/对话配置/backups/xove-dashboard_2026-09-01/` 整目录覆盖 `.obsidian/plugins/xove-dashboard/`，并还原主页2.md |

---

## 1. 为什么做这个补丁（修改原因）

1. **你的主页是 dataviewjs 工作台**（主页2.md，3017 行），Obsidian 的 `MarkdownRenderer` **不执行 dataviewjs**，插件也无法调用 dataview 执行 dataviewjs → 主页2 不能直接「嵌套」进 Xove，映射后会只剩空白+代码块原文。
2. 因此放弃「把打卡清单做成内置模块／把主页嵌进插件」两条路，改为 **通用 md 映射**：任意 md（整文件或某个一级标题区块）用 Obsidian 原生渲染引擎渲染成一张首页卡片。
3. 原生渲染带来三件好事：**原生勾选自动写回源文件**（无需自写解析）、**双链/图片/表格正常**、**通用**（日记、CPA、会议记录都能映射，不止打卡清单）。
4. 双向联动：Xove 工具栏 `打开主页` ↔ 主页2 顶部 `打开 Xove` 按钮；主页2 顶部内嵌 `![[工作台桥接]]`（聚合视图），Xove 映射同一桥接文件 → 一处勾选处处同步。

---

## 2. 核心逻辑

```
设置面板
  ├─ 主页笔记 homeNote        → 工具栏「打开主页」按钮目标
  ├─ 自动分组源 mirrorSources → 一个 md 按标题层级拆成多张卡（新增/删除标题自动跟随）
  └─ 手动映射卡 mirrors       → 整文件或指定标题区块 → 一张原生渲染卡

渲染（mirror 模块，order 8）
  renderMirrorCard
    └─ extractMirrorScope(raw, cfg)  提取整文件 或 heading..下个同级 区块
    └─ MarkdownRenderer.render(...)  原生渲染（勾选/双链/图片均可用）
    └─ bindMirrorTasks               给 task 复选框绑点击
         └─ toggleMirrorTask         行内替换 [ ]↔[x]，可选追加 ✅日期

刷新联动
  onOpen  → syncMirrorSources() 依据分组源重建 mirrors
  vault.on('modify') → refreshMirrors(file)  源文件变更 → 重渲染对应卡
```

关键设计点（与插件内置模块一致，零额外框架）：
- mirror 模块的注册项与内置模块**完全相同结构**（`{id:'mirror', enabled, order, cols, rows}`），因此自动获得排列/缩放/增删能力（注册表 + `renderEnabledModules` + grid span）。
- 勾选写回**复用 Obsidian 原生 checkbox 行为** + 一个轻量监听器，不引入解析库。
- `DEFAULT_SETTINGS` 必须补 `mirrors: []` / `mirrorSources: []`，否则旧 data.json 浅合并读到 `undefined`（同 Thino 补丁教训）。

---

## 3. main.js 改动清单（以「方法名/锚点」重定位，行号仅作 v0.3.1 参考）

### 3.1 数据层
- `DEFAULT_SETTINGS` 新增（参考 L776–783）：
  - 模块注册项 `{ id: 'mirror', enabled: true, order: 8, cols: 1, rows: 2 }`
  - `mirrors: []`、`mirrorSources: []`
- `normalizeSettings`（浅合并补默认）：确保 `mirrors` / `mirrorSources` 永远为数组。

### 3.2 注册表 & 调度
- `this.homeModules` 注册表（搜索锚点 `homeModules`）：加入 `mirror` 条目。
- `onOpen`（参考 L6794）：调用 `await this.syncMirrorSources()` 按分组源重建 mirrors。
- `registerEvent` + `this.app.vault.on('modify')`（参考 L6817）：`void this.refreshMirrors(file)` 做刷新联动。
- 工具栏 `addRibbonIcon`（参考 L7248 附近的 `openHomeNote` 调用）：新增「打开主页」按钮。
- `addCommand`：注册 `open-dashboard` 命令（命令 ID = `xove-dashboard:open-dashboard`），供主页2 按钮调用。

### 3.3 核心方法（参考 L10022–10251）
| 方法 | 作用 |
|---|---|
| `resolveMirrorPath(p)` | 解析相对/绝对路径 |
| `extractMirrorScope(raw, cfg)` | 提取整文件或标题区块 |
| `renderMirrorCard(board, id)` | 渲染单张映射卡（含「打开源文件」「去设置」按钮） |
| `bindMirrorTasks(box, file, mdText, startLine)` | 绑定复选框点击 |
| `toggleMirrorTask(file, lineNo, cb)` | 行内写回 `[ ]↔[x]` + 可选 ✅日期 |
| `syncMirrorSources()` | 分组源 → 重建 mirrors |
| `refreshMirrors(file)` | 文件变更 → 重渲染对应卡 |
| `openMirrorSettings()` | 打开设置定位到映射区 |
| `openHomeNote()` | 打开 settings.homeNote |
| `syncMirrorsNow()`（参考 L11140） | 设置面板内即时刷新（防抖后重建 + 重渲染） |

### 3.4 设置面板（参考 L1235–1385，`display()` 内）
- `secMirror` 分区标题
- 主页笔记输入 + `MdFileSuggest`（参考 L833 类定义，复用现有 `FileSuggest` 思路的新类）
- 分组源列表：文件选择（MdFileSuggest）、标题层级、图标、自动同步开关、增删
- 手动映射卡列表：标题、文件、可选标题区块、增删
- 任何改动 → `this.plugin.syncMirrorsNow()`

### 3.5 i18n（内联字典，zh 参考 L81/L180–290，en 参考 L406/L505–615）
新增 key：`mirror*` 系列（mirrorEmpty / mirrorGoSettings / mirrorNoFile / mirrorNoHeading / mirrorOpen / mirrorWriteFailed）、`secMirror` / `mirrorHomeNote`(+Desc) / `mirrorSources`(+Desc) / `mirrorAddSource` / `mirrorSrcFile` / `mirrorSrcLevel` / `mirrorSrcIcon` / `mirrorSrcAuto` / `mirrors`(+Desc) / `mirrorAdd` / `mirrorAuto`。

---

## 4. styles.css 改动

追加 `.ad-mirror*` 与 `.ad-suggest__path`、`.xove-home-btn` 三段（在文件末尾 `.dashboard-collapse` 之后）。
- `.ad-mirror` 系列：映射卡容器/正文/标题/任务复选框/链接/图片/代码/分隔线样式（沿用 `.ad-memo` 已有的 `--ad-*` 变量）。
- `.xove-home-btn`：主页2 顶部「打开 Xove」按钮样式。

---

## 5. 外部改动（不属于插件，但补丁配套）

### 5.1 新建 `01 主页/工作台桥接.md`
聚合桥接文件，内嵌：
```
![[01 主页/健康追踪]]
![[01 主页/CPA 备考]]
![[01 主页/人生打卡清单.README]]
![[01 主页/主页集成方案]]
```
Xove 映射此文件（手动映射卡 `filePath: 01 主页/工作台桥接.md`），主页2 顶部 `![[工作台桥接]]` 内嵌同一文件 → 双向同步。

### 5.2 改 `01 主页/主页2.md` 顶部
在 `# Mutiply Obsidian · 每日工作台` 标题下插入：
```markdown
> [!info]- 工作台桥接（Xove 映射区）
> 与 Xove Dashboard 实时同步的聚合视图 ↓
> ![[工作台桥接]]

\`\`\`dataviewjs
const btn = document.createElement('button');
btn.className = 'xove-home-btn';
btn.textContent = '🏠 打开 Xove 工作台';
btn.addEventListener('click', () => app.commands.executeCommandById('xove-dashboard:open-dashboard'));
dv.container.appendChild(btn);
\`\`\`
```

---

## 6. 插件更新后「重打补丁」步骤

1. 备份当前插件：`cp -r .obsidian/plugins/xove-dashboard 02\ WorkBuddy/对话配置/backups/xove-dashboard_<日期>/`
2. 更新插件（覆盖 main.js / styles.css / manifest）。
3. 读新 `manifest.json` 版本号，回填本文件 §0。
4. 按 §3 锚点逐个 grep 重定位（方法名基本稳定，行号会变）：
   - 若插件新增了 hooks/事件总线 → 可改为订阅式，减少侵入。
   - 若 `homeModules` 注册表结构变化 → 仅调整 §3.2 注册项写法。
   - 若 i18n 字典结构变化 → 仅调整 §3.5 key 落点。
5. 重放 §4（styles.css 追加）与 §5（外部文件不受影响，一般无需动；若主页2 结构大改再核对按钮锚点）。
6. 重载插件，验证：工具栏「打开主页」/「打开 Xove」互跳、映射卡勾选写回、源文件改动后卡片自动刷新。

---

## 7. 已知限制

- 映射依赖 Obsidian 原生渲染，**dataviewjs / dataview 查询结果不会被渲染**（这是「映射而非嵌套」的根本原因，已与用户确认）。
- 勾选写回为行内正则替换，源文件若用非常规 task 语法可能不识别；双链 `[[ ]]`、标签 `#tag` 由 Obsidian 原生处理，无需补丁干预。
