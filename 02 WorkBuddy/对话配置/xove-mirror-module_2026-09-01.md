# Xove Dashboard「md 映射卡片」方案（取代方案一）

> 日期：2026-09-01 ｜ 插件版本：Xove Dashboard **0.3.1**
> 状态：⏳ 待确认后实施（未改动任何插件代码）
> 取代：[`xove-home-modules-design_2026-09-01.md`](./xove-home-modules-design_2026-09-01.md) 中的**方案一**（专用内置模块）

---

## 0. 结论先行

放弃「为打卡清单开发专用内置模块」，改用**通用 md 映射卡片**：

> 任意 md 文件 / 标题区块 → 映射成 Xove 首页一张卡片，用 **Obsidian 原生渲染引擎**呈现。
> 插件只负责「映射 + 布局」，**不解析、不写回、不重复实现业务逻辑**。

与主页2 的关系：**不映射渲染结果**（dataviewjs 在插件里无法执行），改为**数据层共用 + 区块桥接 + 入口互跳**三层结合。

---

## 1. 关键调研结论

| 发现 | 位置 | 含义 |
|---|---|---|
| 主页2 = **4 个 dataviewjs 代码块**（8 个围栏） | 主页2.md | 全部 UI 由 JS 动态生成，文件本身几乎没有纯 md 内容 |
| **主页2 已读打卡清单** | 主页2.md:787 | `getAbstractFileByPath('01 主页/人生打卡清单.README.md')` |
| 已有 `vision` 模块 = 人生愿景板（order 4.5） | MODULE_CONFIG:144 | 渲染打卡清单，带 `vision-cb` checkbox |
| 已有 `toggleTask(path, line)` | 主页2.md:86-104 | 点击勾选写回源文件，只替换 `[ ]↔[x]`，**不写日期** |
| 主页2 其它数据源 | — | `TaskNotes/健康数据/*.md`、`TaskNotes/心情/*.md`、`TaskNotes/01 task/注册会计师.md` |
| Xove 插件**未使用** `MarkdownRenderer` | main.js grep 0 | 需新增，但是标准公开 API（可行） |

→ **你的打卡清单在主页2 里已经能看、能勾**。所以 Xove 侧不该再写一遍，只需「映射」同一份数据。

---

## 2. 硬限制（必须先知道）

| 限制 | 影响 |
|---|---|
| **`MarkdownRenderer` 不执行 dataviewjs** | 把主页2 整体映射进 Xove = 空白（只剩代码块原文）。**不可行** |
| **插件无法执行 dataviewjs** | dataview 没有公开的「执行 dataviewjs 脚本」API。**排除** |
| 原生渲染的 checkbox 点击 | Obsidian **自动写回**源文件（`[ ]↔[x]`），但**不会追加 `✅ 日期`** |
| MarkdownRenderer 渲染内容 | 双链、图片、表格、内嵌 `![[ ]]`、任务列表全部原生可用 |

---

## 3. 映射卡片设计（替代方案一）

### 3.1 配置结构（多实例，复用 countdown 的模式）

```js
settings.mirrors = [
  {
    id: 'm1',
    filePath: '01 主页/人生打卡清单.README.md',
    scope: 'file',        // 'file' 整文件 | 'heading' 标题区块 | 'lines' 行区间
    heading: '',          // scope='heading' 时填，如 '## 4 健康 · 自律'
    startLine: 0, endLine: 0,   // scope='lines' 时用
    title: '人生打卡清单',
    icon: '☑',
    showSourceLink: true,
    compact: false,       // 紧凑模式（缩字号 / 隐藏图片）
    cols: 2, rows: 3,
  },
];
```

### 3.2 渲染实现（核心约 40 行）

```js
async renderMirror(board, cfg) {
  const card = this.getOrCreateCard(board, 'ad-card ad-b-mirror');
  card.setAttribute('data-mirror', cfg.id);
  this.cardHead(card, cfg.icon || '◧', cfg.title, '');

  const body = card.createDiv({ cls: 'ad-mirror__body' });
  const file = this.app.vault.getAbstractFileByPath(cfg.filePath);
  if (!(file instanceof obsidian.TFile)) {
    body.createDiv({ cls: 'ad-mirror__empty', text: t('home.mirrorNoFile') });
    return;
  }
  const raw = await this.app.vault.cachedRead(file);
  const md = this.extractScope(raw, cfg);
  // 原生渲染：任务可勾选（Obsidian 自动写回）、双链可点、图片/表格/内嵌正常
  await obsidian.MarkdownRenderer.render(this.app, md, body, file.path, this);
}
```
- `this` 即 Component（`DashboardView` 继承 `ItemView` → 继承 `Component`），视图卸载时自动清理子资源，**无需手动 unload**
- `extractScope()`：按 `scope` 切出整文件 / 标题区块（支持标题文字精确或前缀匹配）/ 行区间

### 3.3 交互（全部原生，零自研）

| 交互 | 行为 |
|---|---|
| 点任务 checkbox | Obsidian 原生写回源文件（零代码，兼容 Tasks 等插件） |
| 点双链 / 链接 | 原生跳转 |
| 卡片头「⤢」 | 缩放（现有编辑态） |
| 长按拖拽 | 排序（现有编辑态） |
| 拖到垃圾桶 | 移除该映射（现有编辑态） |
| 卡片头「打开源文件」 | 在主分区打开该 md |

### 3.4 数据联动（与主页2 天然双向）

- `vault.on('modify')` → 路径命中 `mirrors[].filePath` → 防抖 300ms → **只重渲染那一张卡**（不重建首页）
- 在主页2 里勾选（dataviewjs `toggleTask` 写回文件）→ Xove 卡片自动刷新
- 在 Xove 里勾选（原生写回文件）→ 主页2 的 dataviewjs 下次渲染自动更新
- **同一份文件，两处视图，永远一致**（无需任何同步代码）

### 3.5 样式适配

- `.ad-mirror__body` 内覆盖 `p / ul / li / task` 的字号（用 `cqi` 容器查询）、颜色（`--ad-text` 等）、间距，与卡片风格统一
- 长内容：`max-height` + `overflow: auto`
- `compact` 模式：缩字号、隐藏图片，适合小卡
- 沿用既有规范：只用 `--ad-*` 令牌，不写死颜色，自动适配明暗主题

### 3.6 为什么「映射」优于「内置模块」

| 维度 | 方案一（专用内置模块） | 映射方案 |
|---|---|---|
| 代码量 | ~200 行（解析 + 渲染 + 写回 + 指纹校验） | ~40 行（渲染 + 区块提取） |
| 维护成本 | 插件更新要重打，逻辑与插件深度耦合 | 几乎无业务逻辑，重打成本极低 |
| 通用性 | 只服务打卡清单 | **任意 md / 任意区块**：清单、日记、会议记录、项目计划、CPA 任务… |
| 勾选交互 | 自己实现写回（有并发/覆盖风险） | Obsidian 原生（更可靠，兼容 Tasks 插件） |
| 与主页2 | 把已有能力重做一遍 | 共用同一份数据，各渲染各的，不重复 |
| 自动日期 | 可实现 `✅ YYYY-MM-DD` | 原生不含（见 §5 待确认 2） |

---

## 4. 与主页2 的结合：三层方案

### 层 1 · 数据共用（零成本，建议先做）

Xove 映射卡片直接指向**主页2 的同一批数据源**：

| 数据源 | 主页2 里的用途 | Xove 映射卡片 |
|---|---|---|
| `01 主页/人生打卡清单.README.md` | vision 人生愿景板 | 「人生打卡清单」卡 |
| `TaskNotes/健康数据/YYYY-MM-DD.md` | healthSummary 健康概览 | 「今日健康」卡 |
| `TaskNotes/01 task/注册会计师.md` | cpa 备考模块 | 「CPA 任务」卡 |
| `thino/2026/YYYY-MM-DD.md` | thino 灵感 / 快速记录 | 已有「今日闪念」卡 |

→ 主页2 负责「丰富可视化」，Xove 负责「可拖拽缩放的卡片墙」，**同一份数据、两种呈现、互不干扰**。

### 层 2 · 区块桥接（需要「主页里写、Xove 里看」时）

若想让某段内容**在主页2 和 Xove 里同时出现**，用「桥接文件」：

1. 新建纯 md 文件，如 `01 主页/工作台桥接.md`
   ```markdown
   ## 📌 今日三件事
   - [ ] 第一件事
   - [ ] 第二件事

   ## 💡 随手记
   - [ ] ...
   ```
2. **主页2** 里用 `![[工作台桥接]]` 嵌入引用（Obsidian 原生 embed，正常渲染、可勾选）
3. **Xove** 映射该文件（整文件或按 `## ` 区块）

→ 一处编辑，两处显示；主页2 靠 embed，Xove 靠映射，都是只读同一文件。
⚠️ 不建议把桥接区直接写在主页2 内部：主页2 是 dataviewjs 生成 UI，纯 md 段落会以其原始形态混在页面里，且用 `%%` 注释包裹后 Xove 也读不到。

### 层 3 · 入口互跳（两个工作台双向可达）

- **Xove → 主页2**：`shortcuts` 卡片加一项「打开我的主页2」→ 打开 `01 主页/主页2.md`
- **主页2 → Xove**：在 dataviewjs 里加一个按钮，点击执行
  ```js
  app.workspace.getLeaf(false).setViewState({ type: 'xove-dashboard', active: true });
  ```
  （或在 Xove 里注册一个命令，主页2 用 `app.commands.executeCommandById('xove-dashboard:open')` 调用，更稳）

---

## 5. 实施清单（确认后按序执行）

1. `DEFAULT_SETTINGS` 新增 `mirrors: []` + `normalizeSettings` 补齐（浅合并陷阱）
2. 注册表加 `mirror` 模块（**多实例**，复用 `countdown` 的 `settings 数组 + data-idx` 模式）
3. 新增 `renderMirror(board, cfg)`、`extractScope(raw, cfg)`
4. 设置面板新增「映射卡片」管理区：新增 / 编辑 / 删除 + `MdFileSuggest` 文件选择 + 区块选择（列出文件内标题供选）
5. `refreshAll` 增加路径匹配 → 只重渲染命中卡片
6. i18n（zh/en）新增 `home.mirror*`、`settings.mirror*`；styles.css 新增 `.ad-mirror*`
7. （可选）`shortcuts` 模块 + 主页2 反向跳转按钮

---

## 6. 待你确认

1. **打卡清单怎么映射**：整文件一张大卡（9 组约 90 条，建议 `2×3` 可滚动）→ 还是按组拆多张卡（如「健康·自律」单独一张）？
2. **勾选是否自动追加 ` ✅ YYYY-MM-DD`**：
   - A. 不要日期（纯原生，最省最稳）
   - B. 交给 Tasks 插件处理（若你已装 Tasks，其「完成时自动追加日期」设置即可）
   - C. 我在映射卡里加轻量拦截（约 20 行，自己写回并追加日期）
3. **桥接文件方案**是否接受（新建 `工作台桥接.md`，主页2 用 `![[ ]]` 嵌入）？
4. 是否需要**入口互跳**（Xove 里「打开主页2」+ 主页2 里「打开 Xove」按钮）？
5. 映射卡默认是否启用、默认尺寸？
6. 除打卡清单外，还要先映射哪些数据源（健康数据 / CPA 任务 / 桥接区）？
