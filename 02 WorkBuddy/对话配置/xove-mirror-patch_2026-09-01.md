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

---

## 8. 人生打卡清单「独立顶栏整页」（追加补丁，v0.3.1）

> 用户最终确认：要的是「像灵感收集（灵感看板）那样**独立面板**展示并管理内容」，而非首页小卡。
> 因此在一期 md 映射卡之外，新增一个**与灵感看板并列的独立整页 tab**——`人生打卡清单`。

### 8.1 形态与体验
- 顶栏新增 `打卡` 入口（受 `checklistEnabled` 控制，默认开启）；点击进入整页。
- 整页左侧分组侧栏（全部 / 各一级标题），右侧任务列表；顶部有「添加任务」输入框与刷新按钮。
- 任务项：复选框（勾选写回源文件，可选追加 ✅日期）、悬停出现 `✕` 删除。
- 数据源默认 `01 主页/人生打卡清单.README.md`，按一级标题 `#` 分组；在设置里可改文件 / 名称 / 是否追加日期。

### 8.2 新增设置项（DEFAULT_SETTINGS）
`checklistEnabled: true` / `checklistTitle: '人生打卡清单'` / `checklistFile: '01 主页/人生打卡清单.README.md'` / `checklistAppendDate: false`

### 8.3 main.js 改动锚点（方法名重定位，行号仅 v0.3.1 参考）
| 锚点 | 作用 |
|---|---|
| `DEFAULT_SETTINGS` 末尾 | 加 checklist* 四项 |
| `normalizeSettings` 第 6 段 | 旧 data.json 补缺 checklist* 默认（浅合并陷阱） |
| `DashboardView` 构造函数 | `this.checklistBoard = new ChecklistBoard(this)` |
| `renderActions` 导航组 | `if (checklistEnabled) navItems.push({ action:'checklist', glyph:'☑' })` |
| `renderActions` 点击分发 | `if (it.action==='checklist') void this.checklistBoard.show()` |
| `refreshNav` 第 4 段 | 关闭时停该页回主页；开启时停该页重刷 |
| `onOpen` 的 `modify` 监听 | `else if (currentPage==='checklist' && checklistEnabled)` → `checklistBoard.scheduleRefresh()` |
| `DashboardSettingTab.display()` | `/* 人生打卡清单 */` 区块（启用开关 + 名称 + 数据源文件(MdFileSuggest) + 追加日期） |
| `class ChecklistBoard`（顶层，在 `OpportunityBoard` 之前） | 整页渲染器：parseGroups / toggleTask / addTask / deleteTask / show / renderSidebar / renderMain |
| i18n zh | `nav.checklist` + `secChecklist` / `checklistEnable*` / `checklistName*` / `checklistFile*` / `checklistAppendDate*` |
| i18n en | 对应 `checklist*` 英文键 |

### 8.4 styles.css
追加 `.ck-board` / `.ck-container` / `.ck-sidebar*` / `.ck-main` / `.ck-toolbar` / `.ck-group*` / `.ck-tasks` / `.ck-task*` / `.ck-empty` 等。

### 8.5 修改原因
一期"md 映射卡"是首页小卡，用户要求"像灵感收集那样独立面板、能管理内容"。灵感看板是独立顶栏整页，故新增对等整页 `ChecklistBoard`，数据源直接读 md、按一级标题分组，勾选/增删即时写回源文件——满足"清晰独立入口 + 独立面板 + 管理"。

### 8.6 重打提示
插件更新后，§6 通用步骤同样适用；新增本整页时额外注意：`ChecklistBoard` 是顶层 class（与 `OpportunityBoard` 同级），插入位置任意顶层即可；`todayStr$1()` 用于追加日期，确认仍存在。

### 8.7 主页卡片被压成竖条的修复
- **现象**：`.ck-board { display: flex; }` 被追加到 `styles.css` 末尾后，从「打卡清单」页切回「主页」时，`showDashboard()` 只移除了 `.po-board`/`.op-board`，未移除 `.ck-board`，导致 `.ad-board` 的 `display: grid` 被 `.ck-board` 覆盖，首页所有模块卡片被压成竖条。
- **修复**：在以下 4 个 board 切换点全部加入 `removeClass('ck-board')`，保证每个页面 boardEl 只保留当前页 class：
  - `showDashboard()` 切回首页
  - `ProjectBoard.show()` 进入全部项目
  - `OpportunityBoard.show()` 进入灵感看板
  - `ChecklistBoard.show()` 进入打卡清单

### 8.8 新增 4 个主页2 风格卡片
- **需求**：用户希望「添加卡片到首页」弹窗里不止「倒计时」，可挑选主页2 中的模块加入。
- **实现**：在 `this.homeModules` 注册表追加 4 个模块，默认不启用，用户从首页「＋ 添加卡片」弹窗手动添加。
  - `daily-quote` 每日一言：内置 8 条名言，按日期 hash 轮播。
  - `recent` 最近编辑：按文件 mtime 列出最近 6 个 Markdown 笔记，点击打开。
  - `quick-links` 快捷链接：4 个默认按钮（收件箱/日记/主页2/打卡清单），点击打开文件或执行命令；配置在 `settings.quickLinks`。
  - `goals` 目标进度：3 个默认目标（阅读/运动/写作），带进度条与 +/- 计数，数据保存到 `settings.goals`。
- **关键锚点**：
  - 默认常量：`DEFAULT_DAILY_QUOTES`、`DEFAULT_QUICK_LINKS`、`DEFAULT_GOALS`（`main.js` 顶部）。
  - 注册表：`this.homeModules` 中追加 4 项；`DEFAULT_SETTINGS.homeModules` / `DEFAULT_HOME_MODULES` 同步追加。
  - 渲染：`DashboardView.renderDailyQuote` / `renderRecentFiles` / `renderQuickLinks` / `renderGoals`（插入在 `renderPomodoro` 之后）。
  - 样式：`styles.css` 末尾 `.ad-b-quote / .ad-b-recent / .ad-b-quicklinks / .ad-b-goals`。
  - 兼容：`normalizeSettings()` 对旧 `data.json` 补齐 `dailyQuotes / quickLinks / goals`。
- **配置方式**：当前通过编辑 `.obsidian/plugins/xove-dashboard/data.json` 中 `dailyQuotes`、`quickLinks`、`goals` 数组实现；设置面板 UI 尚未添加。

### 8.9 新增 4 卡片导致插件启动失败的修复（TDZ）
- **现象**：加了 §8.8 后插件「加载失败，启动不了」。
- **根因**：`DEFAULT_DAILY_QUOTES / DEFAULT_QUICK_LINKS / DEFAULT_GOALS` 三个常量最初被插入在 `DEFAULT_SETTINGS` 的 `};` **之后**，而 `DEFAULT_SETTINGS`（L741）内部 `dailyQuotes: DEFAULT_DAILY_QUOTES.map(...)` 等立即引用了它们。ES 的 `const` 有暂时性死区（TDZ），模块顶层执行到 `DEFAULT_SETTINGS` 初始化时就抛出 `ReferenceError`，整个 `main.js` 加载失败，Xove 全部功能不可用。
- **修复**：把这三个常量整体移到 `const DEFAULT_SETTINGS = {` **之前**（紧跟 `HOME_LAYOUT_VERSION` 之后），保证「先定义、后引用」。
- **验证**：`node --check` 通过；进一步用 stub 掉 `obsidian` + `require` 后 `new Function(src)()` 跑顶层初始化，输出 `TOPLEVEL_OK`，确认不再有 TDZ/引用错误。
- **教训**：往 `DEFAULT_SETTINGS` 这种在文件较早处初始化的对象里塞「引用外部常量」的字段时，那些常量必须定义在该对象**之前**，否则即触发 TDZ。

---

## 9. 本次改动的可直接 apply 补丁块（覆盖 §8.7 / §8.8 / §8.9）

> **适用版本**：`xove-dashboard` **0.3.1**（同 §0）。重打前插件须已回到 v0.3.1 基线，且已按 §3、§8.1–8.6 打完「笔记映射」+「人生打卡清单」前置补丁（本节依赖其中的 `mirror` 注册项、`.ck-board` 样式、`.ad-*` 变量）。
>
> **格式说明**：下列每个 ```` ``` ```` 块为 **SEARCH/REPLACE 补丁**（CodeBuddy `apply` 格式）。在目标文件里搜索 `<<<<<<< SEARCH` 与 `=======` 之间的代码，整体替换为 `=======` 与 `>>>>>>> REPLACE` 之间的代码。
> 所有块均以**唯一锚点字符串**定位，行号仅作 v0.3.1 参考；插件更新后只要锚点字符串未变即可直接套用。
>
> **重打顺序**：**先 E（常量前置）→ D（字段/注册表/函数/样式）→ C（removeClass 清理）**。
> 搜索时若目标代码已存在（重复打补丁），直接跳过该块即可。

### 9.1 文件与位置总表（本次改动）

| # | 文件 | 改动点 | 性质 | 对应小节 |
|---|------|--------|------|----------|
| 1 | `main.js` | i18n `zh`：`home.modules` 字典新增 4 key | 新增 | D |
| 2 | `main.js` | i18n `en`：`home.modules` 字典新增 4 key | 新增 | D |
| 3 | `main.js` | 顶部常量 `DEFAULT_DAILY_QUOTES/QUICK_LINKS/GOALS` 前置到 `DEFAULT_SETTINGS` 前 | 移动（修复 TDZ） | E |
| 4 | `main.js` | `DEFAULT_SETTINGS` 新增 `dailyQuotes/quickLinks/goals` 字段 | 新增 | D |
| 5 | `main.js` | `homeModules`（DEFAULT_SETTINGS 与 DEFAULT_HOME_MODULES 两处）追加 4 模块项 | 新增 | D |
| 6 | `main.js` | `this.homeModules` 渲染注册表追加 4 项 | 新增 | D |
| 7 | `main.js` | `DashboardView` 新增 4 个 render 方法（插在 `pomoWorkMs` 前） | 新增 | D |
| 8 | `main.js` | `showDashboard()` 增 `removeClass('ck-board')` | 新增（修复） | C |
| 9 | `main.js` | `ProjectBoard.show()` 增 `removeClass('ck-board')` | 新增（修复） | C |
| 10 | `main.js` | `OpportunityBoard.show()` 增 `removeClass('ck-board')` | 新增（修复） | C |
| 11 | `main.js` | `ChecklistBoard.show()` 增 `removeClass('ck-board')` | 新增（修复） | C |
| 12 | `styles.css` | 末尾新增「主页2 风格扩展卡片」样式块 | 新增 | D |
| 13 | `main.js` + `styles.css` | 新增「专注时间」卡片（读取 focus-time 插件数据）：i18n / 注册表 / homeModules / render 方法 / 样式 | 新增 | D(新) |
| 14 | `main.js` + `styles.css` | 新增「心情日记 / 喝水记录 / 灵感闪念」3 张卡片（共用主页1 数据文件） | 新增 | D(新) |

---

### 块 1 — i18n `zh`（§8.8 / D）

```main.js
<<<<<<< SEARCH
            heatmap: '笔记统计', countdown: '倒计时', pomodoro: '番茄钟',
            mirror: '笔记映射',
=======
            heatmap: '笔记统计', countdown: '倒计时', pomodoro: '番茄钟',
            mirror: '笔记映射',
            dailyQuote: '每日一言', recent: '最近编辑',
            quickLinks: '快捷链接', goals: '目标进度',
>>>>>>> REPLACE
```
- **原因**：注册表/卡片标题 `t('home.modules.xxx')` 需要这 4 个 key，缺失会显示 key 名。
- **依赖**：无。

### 块 2 — i18n `en`（§8.8 / D）

```main.js
<<<<<<< SEARCH
            heatmap: 'Note stats', countdown: 'Countdown', pomodoro: 'Pomodoro',
            mirror: 'Note mirror',
=======
            heatmap: 'Note stats', countdown: 'Countdown', pomodoro: 'Pomodoro',
            mirror: 'Note mirror',
            dailyQuote: 'Daily quote', recent: 'Recent edits',
            quickLinks: 'Quick links', goals: 'Goal progress',
>>>>>>> REPLACE
```
- **原因**：同块 1（英文文案）。
- **依赖**：无。

### 块 3 — 默认常量前置（§8.9 / E，修复 TDZ）

```main.js
<<<<<<< SEARCH
const HOME_LAYOUT_VERSION = 3;
const DEFAULT_SETTINGS = {
=======
const HOME_LAYOUT_VERSION = 3;
/** 每日一言默认库（按日期取模轮播） */
const DEFAULT_DAILY_QUOTES = [
    { text: '种一棵树最好的时间是十年前，其次是现在。', author: 'Dambisa Moyo' },
    { text: '不要等待机会，而要创造机会。', author: 'George Bernard Shaw' },
    { text: '微小的进步，胜过完美的计划。', author: '' },
    { text: '行动是治愈恐惧的良药。', author: 'William James' },
    { text: '你不需要很厉害才开始，但你需要开始才很厉害。', author: '' },
    { text: '专注当下，把今天过好。', author: '' },
    { text: '习惯的枷锁，开始时轻得难以察觉，后来重得难以挣脱。', author: 'Warren Buffett' },
    { text: '输出倒逼输入，项目驱动成长。', author: '' },
];
/** 快捷链接默认入口 */
const DEFAULT_QUICK_LINKS = [
    { icon: '📥', name: '收件箱', path: '00 Inbox', color: '#3b82f6' },
    { icon: '📓', name: '今日日记', path: 'Daily', color: '#10b981' },
    { icon: '🏠', name: '主页2', path: '01 主页/主页2.md', color: '#8b5cf6' },
    { icon: '☑', name: '打卡清单', path: 'xove-dashboard:open-checklist', color: '#f59e0b' },
];
/** 目标进度默认卡片 */
const DEFAULT_GOALS = [
    { id: 'g1', name: '阅读目标', target: 50, current: 0, unit: '本', icon: '📚', color: '#8b5cf6' },
    { id: 'g2', name: '运动天数', target: 100, current: 0, unit: '天', icon: '🏃', color: '#10b981' },
    { id: 'g3', name: '写作字数', target: 100000, current: 0, unit: '字', icon: '✍️', color: '#f59e0b' },
];
const DEFAULT_SETTINGS = {
>>>>>>> REPLACE
```
- **原因（E / TDZ）**：这三个常量被 `DEFAULT_SETTINGS` 内 `dailyQuotes: DEFAULT_DAILY_QUOTES.map(...)` 引用，**必须定义在该对象之前**，否则触发暂时性死区 `ReferenceError`，整个 `main.js` 加载失败、插件启动不了。
- **依赖**：块 4 的 `DEFAULT_SETTINGS` 字段会引用它们。

### 块 4 — `DEFAULT_SETTINGS` 新增数据字段（§8.8 / D）

```main.js
<<<<<<< SEARCH
    homeLayoutVersion: HOME_LAYOUT_VERSION,
    countdown: [{ eventName: '2027', targetDate: '2027-01-01' }],
    pomodoro: { workMin: 25, breakMin: 5 },
=======
    homeLayoutVersion: HOME_LAYOUT_VERSION,
    countdown: [{ eventName: '2027', targetDate: '2027-01-01' }],
    pomodoro: { workMin: 25, breakMin: 5 },
    dailyQuotes: DEFAULT_DAILY_QUOTES.map((q) => ({ ...q })),
    quickLinks: DEFAULT_QUICK_LINKS.map((l) => ({ ...l })),
    goals: DEFAULT_GOALS.map((g) => ({ ...g })),
>>>>>>> REPLACE
```
- **原因**：为 4 卡片提供默认数据；旧 `data.json` 经 `normalizeSettings` 浅合并会丢嵌套默认，故在此给默认值。
- **依赖**：块 3 常量（必须先定义，见 E）。

### 块 5 — `homeModules` 追加 4 模块项（§8.8 / D）

> `DEFAULT_SETTINGS.homeModules` 与 `DEFAULT_HOME_MODULES` 两个数组里都有 `{ id: 'mirror', enabled: true, order: 8, cols: 1, rows: 2 },` 这一行（后者用于「恢复默认布局」深拷贝）。**两处都要做同样的追加**。

```main.js
<<<<<<< SEARCH
        { id: 'mirror', enabled: true, order: 8, cols: 1, rows: 2 },
=======
        { id: 'mirror', enabled: true, order: 8, cols: 1, rows: 2 },
        { id: 'daily-quote', enabled: false, order: 9, cols: 1, rows: 1 },
        { id: 'recent', enabled: false, order: 10, cols: 1, rows: 2 },
        { id: 'quick-links', enabled: false, order: 11, cols: 1, rows: 1 },
        { id: 'goals', enabled: false, order: 12, cols: 1, rows: 2 },
>>>>>>> REPLACE
```
- **原因**：让首页「＋ 添加卡片」弹窗出现这 4 个可选项，默认关闭。
- **依赖**：块 6 注册表、块 7 render 方法。

### 块 6 — `this.homeModules` 渲染注册表追加 4 项（§8.8 / D）

```main.js
<<<<<<< SEARCH
            // md 映射（多实例）：settings.mirrors 每项 = 一张卡，由 renderEnabledModules 展开
            { id: 'mirror', title: t('home.modules.mirror'), cardCls: 'ad-card ad-b-mirror', live: false, render: () => { } },
=======
            // md 映射（多实例）：settings.mirrors 每项 = 一张卡，由 renderEnabledModules 展开
            { id: 'mirror', title: t('home.modules.mirror'), cardCls: 'ad-card ad-b-mirror', live: false, render: () => { } },
            // 主页2 风格扩展卡片
            { id: 'daily-quote', title: t('home.modules.dailyQuote'), cardCls: 'ad-card ad-b-quote', live: false, render: (b) => this.renderDailyQuote(b) },
            { id: 'recent', title: t('home.modules.recent'), cardCls: 'ad-card ad-b-recent', live: false, render: (b) => this.renderRecentFiles(b) },
            { id: 'quick-links', title: t('home.modules.quickLinks'), cardCls: 'ad-card ad-b-quicklinks', live: false, render: (b) => this.renderQuickLinks(b) },
            { id: 'goals', title: t('home.modules.goals'), cardCls: 'ad-card ad-b-goals', live: false, render: (b) => this.renderGoals(b) },
>>>>>>> REPLACE
```
- **原因**：把 4 个模块挂到渲染调度；结构与内置模块完全一致，自动获得排列/缩放/增删能力。
- **依赖**：块 1/2 的 i18n key、块 7 的 render 方法。

### 块 7 — 新增 4 个 render 方法（§8.8 / D，插在 `pomoWorkMs() {` 前）

```main.js
<<<<<<< SEARCH
    pomoWorkMs() {
=======
    renderDailyQuote(board) {
        const card = this.getOrCreateCard(board, 'ad-card ad-b-quote');
        this.cardHead(card, '\u{1F4AC}', t('home.modules.dailyQuote'), '');
        const quotes = this.plugin.settings.dailyQuotes?.length
            ? this.plugin.settings.dailyQuotes
            : DEFAULT_DAILY_QUOTES.map((q) => ({ ...q }));
        const seed = fmtDate(new Date()).replace(/-/g, '');
        let hash = 0;
        for (let i = 0; i < seed.length; i++)
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        const idx = Math.abs(hash) % quotes.length;
        const q = quotes[idx];
        const body = card.createDiv({ cls: 'ad-quote' });
        body.createDiv({ cls: 'ad-quote__text', text: q?.text ?? '' });
        if (q?.author)
            body.createDiv({ cls: 'ad-quote__author', text: '—— ' + q.author });
    }
    renderRecentFiles(board) {
        const card = this.getOrCreateCard(board, 'ad-card ad-b-recent');
        this.cardHead(card, '\u{1F4DD}', t('home.modules.recent'), '');
        const files = this.app.vault.getMarkdownFiles()
            .filter((f) => !f.path.startsWith('.'))
            .sort((a, b) => (b.stat?.mtime ?? 0) - (a.stat?.mtime ?? 0))
            .slice(0, 6);
        const body = card.createDiv({ cls: 'ad-recent' });
        if (files.length === 0) {
            body.createDiv({ cls: 'ad-empty--line', text: 'No recent notes' });
            return;
        }
        const list = body.createEl('ul', { cls: 'ad-recent__list' });
        for (const f of files) {
            const li = list.createEl('li', { cls: 'ad-recent__item' });
            const link = li.createEl('a', { cls: 'ad-recent__link', text: f.basename });
            link.title = f.path;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.app.workspace.getLeaf(false).openFile(f);
            });
        }
    }
    renderQuickLinks(board) {
        const card = this.getOrCreateCard(board, 'ad-card ad-b-quicklinks');
        this.cardHead(card, '\u26A1', t('home.modules.quickLinks'), '');
        const links = this.plugin.settings.quickLinks?.length
            ? this.plugin.settings.quickLinks.map((l) => ({ ...l }))
            : DEFAULT_QUICK_LINKS.map((l) => ({ ...l }));
        const body = card.createDiv({ cls: 'ad-quicklinks' });
        if (links.length === 0) {
            body.createDiv({ cls: 'ad-empty--line', text: 'No links configured' });
            return;
        }
        const grid = body.createDiv({ cls: 'ad-quicklinks__grid' });
        for (const link of links) {
            const btn = grid.createEl('button', { cls: 'ad-quicklinks__btn' });
            btn.createSpan({ cls: 'ad-quicklinks__icon', text: link.icon || '\u25A6' });
            btn.createSpan({ cls: 'ad-quicklinks__name', text: link.name || link.path });
            btn.style.setProperty('--ql-color', link.color || 'var(--ad-accent)');
            btn.addEventListener('click', () => {
                if (!link.path) return;
                if (link.path.includes(':')) this.app.commands.executeCommandById(link.path);
                else {
                    const target = this.app.vault.getAbstractFileByPath(link.path);
                    if (target) this.app.workspace.getLeaf(false).openFile(target);
                }
            });
        }
    }
    renderGoals(board) {
        const card = this.getOrCreateCard(board, 'ad-card ad-b-goals');
        this.cardHead(card, '\u{1F3AF}', t('home.modules.goals'), '');
        let goals = (this.plugin.settings.goals ?? []).map((g) => ({ ...g }));
        if (goals.length === 0) goals = DEFAULT_GOALS.map((g) => ({ ...g }));
        const body = card.createDiv({ cls: 'ad-goals' });
        const saveAndRender = async () => {
            this.plugin.settings.goals = goals.map((g) => ({ ...g }));
            await this.plugin.saveSettings();
            renderList();
        };
        const renderList = () => {
            body.empty();
            for (const g of goals) {
                const pct = g.target > 0 ? Math.min(100, Math.round(g.current / g.target * 100)) : 0;
                const row = body.createDiv({ cls: 'ad-goal' });
                const top = row.createDiv({ cls: 'ad-goal__top' });
                top.createSpan({ cls: 'ad-goal__icon', text: g.icon || '\u25A6' });
                top.createSpan({ cls: 'ad-goal__name', text: g.name });
                top.createSpan({ cls: 'ad-goal__pct', text: pct + '%' });
                const barWrap = row.createDiv({ cls: 'ad-goal__bar' });
                const fill = barWrap.createDiv({ cls: 'ad-goal__fill' });
                fill.style.width = pct + '%';
                fill.style.background = g.color || 'var(--ad-accent)';
                const meta = row.createDiv({ cls: 'ad-goal__meta' });
                meta.createSpan({ text: g.current + (g.unit || '') + ' / ' + g.target + (g.unit || '') });
                const btns = meta.createDiv({ cls: 'ad-goal__btns' });
                const dec = btns.createEl('button', { text: '-' });
                const inc = btns.createEl('button', { text: '+' });
                dec.addEventListener('click', () => { g.current = Math.max(0, (g.current || 0) - 1); void saveAndRender(); });
                inc.addEventListener('click', () => { g.current = Math.min(g.target || 0, (g.current || 0) + 1); void saveAndRender(); });
            }
        };
        renderList();
    }
    pomoWorkMs() {
>>>>>>> REPLACE
```
- **原因**：4 个卡片的实际渲染逻辑。
- **依赖**：`getOrCreateCard` / `cardHead`（内置模块方法）、`t`（i18n）、`fmtDate`（内置工具）、`this.plugin.settings` / `saveSettings`、`DEFAULT_DAILY_QUOTES/QUICK_LINKS/GOALS`（块 3）。
- **注意**：`\u{1F4AC}` 等为 Unicode 转义，须原样写入（与源码一致）。`renderRecentFiles`/`renderGoals` 依赖 `this.app.vault`、`this.app.workspace` 等插件运行期对象。

### 块 8 — `showDashboard()` 增 `removeClass('ck-board')`（§8.7 / C）

```main.js
<<<<<<< SEARCH
        this.boardEl.removeClass('po-board');
        this.boardEl.removeClass('op-board');
        this.boardEl.addClass('ad-board');
=======
        this.boardEl.removeClass('po-board');
        this.boardEl.removeClass('op-board');
        this.boardEl.removeClass('ck-board');
        this.boardEl.addClass('ad-board');
>>>>>>> REPLACE
```
- **原因（C）**：切回首页时若残留 `ck-board` 类，其 `display:flex`（styles.css）会覆盖首页网格 `display:grid`，把全部卡片压成竖条。

### 块 9 — `ProjectBoard.show()` 增 `removeClass('ck-board')`（§8.7 / C）

```main.js
<<<<<<< SEARCH
        this.boardEl.removeClass('ad-board');
        this.boardEl.removeClass('op-board');
        this.boardEl.addClass('po-board');
=======
        this.boardEl.removeClass('ad-board');
        this.boardEl.removeClass('op-board');
        this.boardEl.removeClass('ck-board');
        this.boardEl.addClass('po-board');
>>>>>>> REPLACE
```
- **原因（C）**：同块 8，切到「全部项目」页时清理 `ck-board`。

### 块 10 — `OpportunityBoard.show()` 增 `removeClass('ck-board')`（§8.7 / C）

```main.js
<<<<<<< SEARCH
        this.host.boardEl.removeClass('ad-board');
        this.host.boardEl.removeClass('po-board');
        this.host.boardEl.addClass('op-board');
=======
        this.host.boardEl.removeClass('ad-board');
        this.host.boardEl.removeClass('po-board');
        this.host.boardEl.removeClass('ck-board');
        this.host.boardEl.addClass('op-board');
>>>>>>> REPLACE
```
- **原因（C）**：同块 8，切到「灵感看板」页时清理 `ck-board`。

### 块 11 — `ChecklistBoard.show()` 增 `removeClass('ck-board')`（§8.7 / C）

```main.js
<<<<<<< SEARCH
        board.removeClass('ad-board');
        board.removeClass('po-board');
        board.removeClass('op-board');
        board.addClass('ck-board');
=======
        board.removeClass('ad-board');
        board.removeClass('po-board');
        board.removeClass('op-board');
        board.removeClass('ck-board');
        board.addClass('ck-board');
>>>>>>> REPLACE
```
- **原因（C）**：同块 8，进入「人生打卡清单」整页时先清理再重新加 `ck-board`（保证该页用 flex 布局、其他页不被污染）。

### 块 12 — `styles.css` 新增 4 卡片样式（§8.8 / D）

```styles.css
<<<<<<< SEARCH
.ck-empty { font-family: var(--ad-font); font-size: 13px; color: var(--ad-text-dim); padding: 20px; }
=======
.ck-empty { font-family: var(--ad-font); font-size: 13px; color: var(--ad-text-dim); padding: 20px; }

/* ===================== 主页2 风格扩展卡片 ===================== */
.ad-b-quote .ad-card__head,
.ad-b-recent .ad-card__head,
.ad-b-quicklinks .ad-card__head,
.ad-b-goals .ad-card__head { padding: 10px 12px; }

/* 每日一言 */
.ad-quote { display: flex; flex-direction: column; justify-content: center; padding: 12px; height: calc(100% - 38px); box-sizing: border-box; }
.ad-quote__text { font-family: var(--ad-font); font-size: 14px; line-height: 1.6; color: var(--ad-text); }
.ad-quote__author { font-family: var(--ad-font); font-size: 11px; color: var(--ad-text-mute); margin-top: 10px; text-align: right; }

/* 最近编辑 */
.ad-recent { padding: 6px 10px 10px; }
.ad-recent__list { list-style: none; margin: 0; padding: 0; }
.ad-recent__item { padding: 5px 0; border-bottom: 1px solid var(--ad-hair); }
.ad-recent__item:last-child { border-bottom: none; }
.ad-recent__link { font-family: var(--ad-font); font-size: 12px; color: var(--ad-accent); cursor: pointer; }
.ad-recent__link:hover { text-decoration: underline; }

/* 快捷链接 */
.ad-quicklinks { padding: 10px 12px; }
.ad-quicklinks__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.ad-quicklinks__btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 6px; border: 1px solid var(--ad-line); border-radius: var(--ad-r2); background: var(--ad-s2); color: var(--ad-text); cursor: pointer; transition: all .15s; }
.ad-quicklinks__btn:hover { border-color: var(--ql-color, var(--ad-accent)); background: var(--ad-h2); }
.ad-quicklinks__icon { font-size: 15px; }
.ad-quicklinks__name { font-family: var(--ad-font); font-size: 12px; }

/* 目标进度 */
.ad-goals { padding: 8px 12px 12px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
.ad-goal { display: flex; flex-direction: column; gap: 5px; }
.ad-goal__top { display: flex; align-items: center; gap: 6px; font-family: var(--ad-font); font-size: 12px; color: var(--ad-text); }
.ad-goal__icon { font-size: 14px; }
.ad-goal__name { flex: 1; }
.ad-goal__pct { color: var(--ad-accent); font-weight: 600; }
.ad-goal__bar { height: 5px; background: var(--ad-s3); border-radius: 3px; overflow: hidden; }
.ad-goal__fill { height: 100%; border-radius: 3px; transition: width .3s; }
.ad-goal__meta { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--ad-text-mute); }
.ad-goal__btns { display: flex; gap: 4px; }
.ad-goal__btns button { width: 18px; height: 18px; line-height: 16px; padding: 0; border: 1px solid var(--ad-line); border-radius: 4px; background: var(--ad-s2); color: var(--ad-text); cursor: pointer; font-size: 12px; }
.ad-goal__btns button:hover { border-color: var(--ad-accent); }

.ad-empty--line { font-family: var(--ad-font); font-size: 12px; color: var(--ad-text-dim); text-align: center; padding: 14px 0; }
>>>>>>> REPLACE
```
- **原因**：4 卡片的样式；`--ql-color` 由 quick-links 按钮内联 `style.setProperty` 设置。
- **依赖**：块 6/7 的 `cardCls`（`ad-b-quote` 等）与内部 DOM class（`ad-quote*`、`ad-recent*`、`ad-quicklinks*`、`ad-goal*`）。

---

### 块 13 — 专注时间卡片（新增 renderFocusTime，读取 focus-time 插件数据）（§8.8 补充）

> 需求：把主页1 的「Focus Time 专注时间」模块（dataviewjs，读取 `.obsidian/plugins/focus-time/data.json` + 每日 json）做成 Xove 原生首页卡片。因插件无法执行 dataviewjs，改为在 `DashboardView` 内读取同一数据源原生渲染。

```main.js
<<<<<<< SEARCH
            dailyQuote: '每日一言', recent: '最近编辑',
            quickLinks: '快捷链接', goals: '目标进度',
=======
            dailyQuote: '每日一言', recent: '最近编辑',
            quickLinks: '快捷链接', goals: '目标进度',
            focusTime: '专注时间',
>>>>>>> REPLACE
```
- **原因**：卡片标题 `t('home.modules.focusTime')` 需要该 key。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
            dailyQuote: 'Daily quote', recent: 'Recent edits',
            quickLinks: 'Quick links', goals: 'Goal progress',
=======
            dailyQuote: 'Daily quote', recent: 'Recent edits',
            quickLinks: 'Quick links', goals: 'Goal progress',
            focusTime: 'Focus time',
>>>>>>> REPLACE
```
- **原因**：同上（英文）。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
            { id: 'goals', title: t('home.modules.goals'), cardCls: 'ad-card ad-b-goals', live: false, render: (b) => this.renderGoals(b) },
        ];
=======
            { id: 'goals', title: t('home.modules.goals'), cardCls: 'ad-card ad-b-goals', live: false, render: (b) => this.renderGoals(b) },
            { id: 'focus-time', title: t('home.modules.focusTime'), cardCls: 'ad-card ad-b-focustime', live: false, render: (b) => void this.renderFocusTime(b) },
        ];
>>>>>>> REPLACE
```
- **原因**：把专注时间挂到渲染注册表；`renderFocusTime` 为 async，用 `void` 包裹丢弃 Promise（与 `renderProgress` 风格一致）。
- **依赖**：块 13f 的 `renderFocusTime` 方法、块 13a/13b 的 i18n key。

```main.js
<<<<<<< SEARCH
        { id: 'goals', enabled: false, order: 12, cols: 1, rows: 2 },
    ],
    /* md 映射卡片：把任意 md 文件 / 标题区块用 Obsidian 原生引擎渲染成一张首页卡片。
=======
        { id: 'goals', enabled: false, order: 12, cols: 1, rows: 2 },
        { id: 'focus-time', enabled: false, order: 13, cols: 1, rows: 2 },
    ],
    /* md 映射卡片：把任意 md 文件 / 标题区块用 Obsidian 原生引擎渲染成一张首页卡片。
>>>>>>> REPLACE
```
- **原因**：`DEFAULT_SETTINGS.homeModules` 新增默认关闭项（与 `DEFAULT_HOME_MODULES` 同步）。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
        { id: 'goals', enabled: false, order: 12, cols: 1, rows: 2 },
];
/* ---- helpers ---- */
=======
        { id: 'goals', enabled: false, order: 12, cols: 1, rows: 2 },
        { id: 'focus-time', enabled: false, order: 13, cols: 1, rows: 2 },
];
/* ---- helpers ---- */
>>>>>>> REPLACE
```
- **原因**：`DEFAULT_HOME_MODULES`（「恢复默认布局」深拷贝源）同步追加 focus-time 项。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
    pomoWorkMs() {
=======
    async renderFocusTime(board) {
        const card = this.getOrCreateCard(board, 'ad-card ad-b-focustime');
        this.cardHead(card, '\u23F1\uFE0F', t('home.modules.focusTime'), '');
        const body = card.createDiv({ cls: 'ad-focustime' });
        const adapter = this.app.vault.adapter;
        const idToPath = {};
        let readData = {};
        try {
            const raw = await adapter.read('.obsidian/plugins/focus-time/data.json');
            readData = JSON.parse(raw).readData || {};
        } catch (e) { /* focus-time 未安装则无数据 */ }
        for (const [p, info] of Object.entries(readData)) {
            if (info && info.fileId) idToPath[info.fileId] = p;
        }
        const totalDur = Object.values(readData).reduce((s, d) => s + (d.duration || 0), 0);
        const now = new Date();
        const readDay = async (yy, mm, dd) => {
            try {
                const raw = await adapter.read(`.obsidian/plugins/focus-time/data/${yy}-${mm}-${dd}.json`);
                return JSON.parse(raw).dailyReadData || {};
            } catch (e) { return {}; }
        };
        const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
        const todayData = await readDay(y, m, d);
        const todayDur = Object.values(todayData).reduce((s, info) => s + (info.duration || 0), 0);
        const dow = now.getDay();
        const daysFromMon = dow === 0 ? 6 : dow - 1;
        let weekDur = 0;
        for (let i = 0; i <= daysFromMon; i++) {
            const dt = new Date(now); dt.setDate(now.getDate() - i);
            const dd = await readDay(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
            weekDur += Object.values(dd).reduce((s, info) => s + (info.duration || 0), 0);
        }
        const fmt = (ms) => (ms / 60000).toFixed(0) + ' 分';
        const sumEl = body.createDiv({ cls: 'ad-ft__sum' });
        sumEl.createSpan({ cls: 'ad-ft__today', text: '今日 ' + fmt(todayDur) });
        sumEl.createSpan({ cls: 'ad-ft__week', text: '本周 ' + fmt(weekDur) });
        sumEl.createSpan({ cls: 'ad-ft__total', text: '累计 ' + fmt(totalDur) });
        const ranking = {};
        for (const [fid, info] of Object.entries(todayData)) {
            if (fid === 'undefined') continue;
            const p = idToPath[fid] || fid;
            ranking[p] = (ranking[p] || 0) + (info.duration || 0);
        }
        const entries = Object.entries(ranking).sort((a, b) => b[1] - a[1]).slice(0, 3);
        if (entries.length) {
            const list = body.createDiv({ cls: 'ad-ft__list' });
            for (const [p, dur] of entries) {
                const li = list.createEl('div', { cls: 'ad-ft__item' });
                li.createSpan({ cls: 'ad-ft__name', text: p.split('/').pop() });
                li.createSpan({ cls: 'ad-ft__dur', text: fmt(dur) });
            }
        } else {
            body.createDiv({ cls: 'ad-empty--line', text: '暂无专注记录' });
        }
    }
    pomoWorkMs() {
>>>>>>> REPLACE
```
- **原因**：专注时间卡片核心逻辑——读取 focus-time 插件累计/今日/本周专注时长并展示 Top3 文件排行。
- **依赖**：`getOrCreateCard`/`cardHead`（内置）、`t`（i18n）、`this.app.vault.adapter.read`、`focus-time` 插件数据文件（缺失时容错显示「暂无专注记录」）、块 13g 样式。
- **强风险**：依赖 `focus-time` 插件数据格式（`data.json` 的 `readData[path].fileId/duration` 与每日 `data/YYYY-MM-DD.json` 的 `dailyReadData[fileId].duration`）；若 focus-time 插件改版或数据路径变化需同步调整。

```styles.css
<<<<<<< SEARCH
.ad-empty--line { font-family: var(--ad-font); font-size: 12px; color: var(--ad-text-dim); text-align: center; padding: 14px 0; }
=======
.ad-empty--line { font-family: var(--ad-font); font-size: 12px; color: var(--ad-text-dim); text-align: center; padding: 14px 0; }

/* ===================== 专注时间（读取 focus-time 插件数据） ===================== */
.ad-focustime { padding: 8px 12px 12px; display: flex; flex-direction: column; gap: 8px; }
.ad-ft__sum { display: flex; justify-content: space-between; font-family: var(--ad-font); font-size: 12px; color: var(--ad-text); }
.ad-ft__today { color: var(--ad-accent); font-weight: 600; }
.ad-ft__week { color: var(--ad-text); }
.ad-ft__total { color: var(--ad-text-mute); }
.ad-ft__list { display: flex; flex-direction: column; gap: 4px; }
.ad-ft__item { display: flex; justify-content: space-between; font-size: 11px; color: var(--ad-text-mute); }
.ad-ft__name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 8px; }
.ad-ft__dur { color: var(--ad-text); flex: 0 0 auto; }
>>>>>>> REPLACE
```
- **原因**：专注时间卡片样式。
- **依赖**：块 13c 的 `cardCls`（`ad-b-focustime`）与内部 DOM class（`ad-focustime*`、`ad-ft*`）。

### 块 14 — 心情日记 / 喝水记录 / 灵感闪念（3 张卡片）（§8.8 补充）

> 需求：把主页1 的「心情日记」「喝水记录」，以及 Thino 闪念（灵感）做成 Xove 原生首页卡片。三者与主页1 **共用同一份数据文件**，避免数据割裂（Xove 侧写回，主页1 立即可见，反之亦然）。

**数据源（关键，决定能否正确读写）**：

| 卡片 | 数据文件 | 格式 |
|---|---|---|
| 心情日记 | `04 TaskNotes/心情/YYYY-MM-DD.md` | frontmatter `mood: <key>`（happy/good/meh/sad/cry/angry/tired/calm/driven/love）+ 正文 `😊 今天心情：开心` |
| 喝水记录 | `04 TaskNotes/健康数据/YYYY-MM-DD.md` | frontmatter `waterCount: <n>`（目标默认 8 杯） |
| 灵感闪念 | `dailyMemoPath()`，即 `quickCapture.storagePath/YYYY-MM-DD.md` | 复用 §10 的 `parseMemos` 解析 `- HH:mm 内容` |

> ⚠️ **重打顺序**：必须先打**块 13（专注时间）**，再打本块 14——本块所有锚点都依赖「focus-time 行已存在」。

```main.js
<<<<<<< SEARCH
            dailyQuote: '每日一言', recent: '最近编辑',
            quickLinks: '快捷链接', goals: '目标进度',
            focusTime: '专注时间',
=======
            dailyQuote: '每日一言', recent: '最近编辑',
            quickLinks: '快捷链接', goals: '目标进度',
            focusTime: '专注时间',
            mood: '心情日记', water: '喝水记录', inspiration: '灵感闪念',
>>>>>>> REPLACE
```
- **原因**：3 张卡片的标题 key。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
        captureBtn: '捕捉',
=======
        captureBtn: '捕捉',
        moodEmpty: '今天还没记录心情',
        waterAdd: '喝一杯',
        waterReset: '重置',
        inspirationNeedDaily: '需开启「追加到日记」模式',
>>>>>>> REPLACE
```
- **原因**：卡片内文案（zh）。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
            dailyQuote: 'Daily quote', recent: 'Recent edits',
            quickLinks: 'Quick links', goals: 'Goal progress',
            focusTime: 'Focus time',
=======
            dailyQuote: 'Daily quote', recent: 'Recent edits',
            quickLinks: 'Quick links', goals: 'Goal progress',
            focusTime: 'Focus time',
            mood: 'Mood diary', water: 'Water', inspiration: 'Ideas',
>>>>>>> REPLACE
```
- **原因**：卡片标题（en）。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
        captureBtn: 'Capture',
=======
        captureBtn: 'Capture',
        moodEmpty: 'No mood recorded today',
        waterAdd: 'Drink',
        waterReset: 'Reset',
        inspirationNeedDaily: 'Enable "append to daily" mode',
>>>>>>> REPLACE
```
- **原因**：卡片内文案（en）。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
    goals: DEFAULT_GOALS.map((g) => ({ ...g })),
=======
    goals: DEFAULT_GOALS.map((g) => ({ ...g })),
    moodDir: '04 TaskNotes/心情',
    waterGoal: 8,
    healthDataDir: '04 TaskNotes/健康数据',
>>>>>>> REPLACE
```
- **原因**：3 张卡片的数据目录与喝水目标，可在 `data.json` 里改（设置面板 UI 未做）。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
        { id: 'focus-time', enabled: false, order: 13, cols: 1, rows: 2 },
    ],
    /* md 映射卡片：把任意 md 文件 / 标题区块用 Obsidian 原生引擎渲染成一张首页卡片。
=======
        { id: 'focus-time', enabled: false, order: 13, cols: 1, rows: 2 },
        { id: 'mood', enabled: false, order: 14, cols: 1, rows: 1 },
        { id: 'water', enabled: false, order: 15, cols: 1, rows: 1 },
        { id: 'inspiration', enabled: false, order: 16, cols: 1, rows: 2 },
    ],
    /* md 映射卡片：把任意 md 文件 / 标题区块用 Obsidian 原生引擎渲染成一张首页卡片。
>>>>>>> REPLACE
```
- **原因**：`DEFAULT_SETTINGS.homeModules` 追加 3 个默认关闭项（与 `DEFAULT_HOME_MODULES` 同步）。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
        { id: 'focus-time', enabled: false, order: 13, cols: 1, rows: 2 },
];
/* ---- helpers ---- */
=======
        { id: 'focus-time', enabled: false, order: 13, cols: 1, rows: 2 },
        { id: 'mood', enabled: false, order: 14, cols: 1, rows: 1 },
        { id: 'water', enabled: false, order: 15, cols: 1, rows: 1 },
        { id: 'inspiration', enabled: false, order: 16, cols: 1, rows: 2 },
];
/* ---- helpers ---- */
>>>>>>> REPLACE
```
- **原因**：`DEFAULT_HOME_MODULES`（「恢复默认布局」深拷贝源）同步追加。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
            { id: 'focus-time', title: t('home.modules.focusTime'), cardCls: 'ad-card ad-b-focustime', live: false, render: (b) => void this.renderFocusTime(b) },
        ];
=======
            { id: 'focus-time', title: t('home.modules.focusTime'), cardCls: 'ad-card ad-b-focustime', live: false, render: (b) => void this.renderFocusTime(b) },
            { id: 'mood', title: t('home.modules.mood'), cardCls: 'ad-card ad-b-mood', live: false, render: (b) => void this.renderMoodDiary(b) },
            { id: 'water', title: t('home.modules.water'), cardCls: 'ad-card ad-b-water', live: false, render: (b) => void this.renderWaterTracker(b) },
            { id: 'inspiration', title: t('home.modules.inspiration'), cardCls: 'ad-card ad-b-inspiration', live: false, render: (b) => void this.renderInspiration(b) },
        ];
>>>>>>> REPLACE
```
- **原因**：把 3 张卡片挂到渲染调度（均为 async，用 `void` 丢弃 Promise）。
- **依赖**：下方 3 个 render 方法、i18n key。

```main.js
<<<<<<< SEARCH
    pomoWorkMs() {
=======
    async renderMoodDiary(board) {
        const card = this.getOrCreateCard(board, 'ad-card ad-b-mood');
        this.cardHead(card, '\u{1F60A}', t('home.modules.mood'), '');
        const body = card.createDiv({ cls: 'ad-mood' });
        const s = this.plugin.settings;
        const dir = (s.moodDir || '').trim() || '04 TaskNotes/心情';
        const emojis = { '😊': '开心', '🙂': '不错', '😐': '一般', '😔': '低落', '😢': '难过', '😡': '生气', '😴': '疲惫', '✨': '平静', '💪': '奋斗', '❤️': '爱' };
        const keys = { '😊': 'happy', '🙂': 'good', '😐': 'meh', '😔': 'sad', '😢': 'cry', '😡': 'angry', '😴': 'tired', '✨': 'calm', '💪': 'driven', '❤️': 'love' };
        const colors = { '😊': '#34d399', '🙂': '#60a5fa', '😐': '#9ca3af', '😔': '#818cf8', '😢': '#f87171', '😡': '#fb923c', '😴': '#a78bfa', '✨': '#fbbf24', '💪': '#f472b6', '❤️': '#f43f5e' };
        const keyToEmoji = Object.fromEntries(Object.entries(keys).map(([k, v]) => [v, k]));
        const todayStr = fmtDate(new Date());
        const path = `${dir}/${todayStr}.md`;
        const readMood = async () => {
            const f = this.app.vault.getAbstractFileByPath(path);
            if (!(f instanceof obsidian.TFile))
                return '';
            const c = await this.app.vault.cachedRead(f);
            const m = /^mood:\s*(\S+)/m.exec(c);
            return m ? (keyToEmoji[m[1]] || '') : '';
        };
        const saveMood = async (emoji) => {
            const content = `---\nmood: ${keys[emoji]}\ndate: ${todayStr}\n---\n\n${emoji} 今天心情：${emojis[emoji]}\n`;
            const f = this.app.vault.getAbstractFileByPath(path);
            if (f instanceof obsidian.TFile)
                await this.app.vault.modify(f, content);
            else {
                await this.ensureFolder(dir);
                await this.app.vault.create(path, content);
            }
            await render();
        };
        const render = async () => {
            body.empty();
            const cur = await readMood();
            if (cur) {
                const now = body.createDiv({ cls: 'ad-mood__now' });
                now.createSpan({ cls: 'ad-mood__big', text: cur });
                now.createSpan({ cls: 'ad-mood__label', text: emojis[cur] || '' });
            }
            else {
                body.createDiv({ cls: 'ad-mood__hint', text: t('home.moodEmpty') });
            }
            const grid = body.createDiv({ cls: 'ad-mood__grid' });
            for (const e of Object.keys(emojis)) {
                const b = grid.createEl('button', { cls: 'ad-mood__btn', text: e });
                b.title = emojis[e];
                b.style.setProperty('--mo-color', colors[e]);
                if (e === cur)
                    b.addClass('is-active');
                b.addEventListener('click', () => void saveMood(e));
            }
        };
        await render();
    }
    async renderWaterTracker(board) {
        const s = this.plugin.settings;
        const goal = Math.max(1, s.waterGoal ?? 8);
        const card = this.getOrCreateCard(board, 'ad-card ad-b-water');
        this.cardHead(card, '\u{1F4A7}', t('home.modules.water'), `0/${goal}`);
        const body = card.createDiv({ cls: 'ad-water' });
        const dir = (s.healthDataDir || '').trim() || '04 TaskNotes/健康数据';
        const todayStr = fmtDate(new Date());
        const path = `${dir}/${todayStr}.md`;
        const readCount = async () => {
            const f = this.app.vault.getAbstractFileByPath(path);
            if (!(f instanceof obsidian.TFile))
                return 0;
            const c = await this.app.vault.cachedRead(f);
            const m = /^waterCount:\s*(\d+)/m.exec(c);
            return m ? parseInt(m[1], 10) : 0;
        };
        const writeCount = async (n) => {
            const f = this.app.vault.getAbstractFileByPath(path);
            if (f instanceof obsidian.TFile) {
                const c = await this.app.vault.cachedRead(f);
                const nc = /^waterCount:/m.test(c)
                    ? c.replace(/^waterCount:.*$/m, `waterCount: ${n}`)
                    : c.replace(/^---\n/, `---\nwaterCount: ${n}\n`);
                await this.app.vault.modify(f, nc);
            }
            else {
                await this.ensureFolder(dir);
                await this.app.vault.create(path, `---\ndate: ${todayStr}\nwaterCount: ${n}\n---\n\n# 📅 ${todayStr} 健康记录\n`);
            }
            await render();
        };
        const render = async () => {
            const cnt = await readCount();
            const pct = Math.min(100, Math.round(cnt / goal * 100));
            body.empty();
            const top = body.createDiv({ cls: 'ad-water__top' });
            top.createSpan({ cls: 'ad-water__num', text: `${cnt}/${goal}` });
            top.createSpan({ cls: 'ad-water__unit', text: '杯' });
            const bar = body.createDiv({ cls: 'ad-water__bar' });
            const fill = bar.createDiv({ cls: 'ad-water__fill' });
            fill.style.width = pct + '%';
            const btns = body.createDiv({ cls: 'ad-water__btns' });
            const add = btns.createEl('button', { cls: 'ad-water__add', text: '➕ ' + t('home.waterAdd') });
            const reset = btns.createEl('button', { cls: 'ad-water__reset', text: '🔄 ' + t('home.waterReset') });
            add.addEventListener('click', () => void writeCount(cnt + 1));
            reset.addEventListener('click', () => void writeCount(0));
        };
        await render();
    }
    async renderInspiration(board) {
        const card = this.getOrCreateCard(board, 'ad-card ad-b-inspiration');
        this.cardHead(card, '\u{1F4A1}', t('home.modules.inspiration'), '');
        const body = card.createDiv({ cls: 'ad-inspiration' });
        const s = this.plugin.settings;
        if (s.quickCapture?.writeMode === 'file') {
            body.createDiv({ cls: 'ad-empty--line', text: t('home.inspirationNeedDaily') });
            return;
        }
        const path = this.dailyMemoPath();
        const file = this.app.vault.getAbstractFileByPath(path);
        const memos = file instanceof obsidian.TFile
            ? this.parseMemos(await this.app.vault.cachedRead(file)) : [];
        if (!memos.length) {
            body.createDiv({ cls: 'ad-empty--line', text: t('home.memoListEmpty') });
            return;
        }
        const list = body.createDiv({ cls: 'ad-insp__list' });
        for (const m of [...memos].reverse().slice(0, 8)) {
            const item = list.createDiv({ cls: 'ad-insp__item' });
            item.createSpan({ cls: 'ad-insp__time', text: m.time });
            item.createSpan({ cls: 'ad-insp__text', text: m.text });
            item.addEventListener('click', () => void this.app.workspace.openLinkText(path, '', true));
        }
    }
    pomoWorkMs() {
>>>>>>> REPLACE
```
- **原因**：3 张卡片的核心逻辑——心情 10 选 1 写入 md；喝水计数读写 frontmatter；灵感读取当日日记 memo（Thino 互通）。
- **依赖**：`getOrCreateCard`/`cardHead`/`fmtDate`/`t`（内置）、`this.ensureFolder`（内置，thino 补丁也用）、`this.app.vault.cachedRead/modify/create`、`this.app.workspace.openLinkText`；灵感卡片额外依赖 **§10 的 `dailyMemoPath` / `parseMemos`**（必须先打 Thino 补丁）。
- **强风险**：
  - 数据格式与主页1 **强耦合**：主页1 若改存储格式（如 mood 改存 JSON），此处需同步改。
  - 喝水写回用正则替换 frontmatter 的 `waterCount`；若健康文件无 frontmatter 则新建（与主页1 写法等价，但多端同时编辑仍有覆盖风险，同主页1）。
  - 心情卡片写入会**覆盖**当日文件全部内容（与主页1 `saveMood` 行为一致），若当日心情文件里有额外笔记会被覆盖——与主页1 风险相同。

```styles.css
<<<<<<< SEARCH
.ad-ft__dur { color: var(--ad-text); flex: 0 0 auto; }
=======
.ad-ft__dur { color: var(--ad-text); flex: 0 0 auto; }

/* ===================== 心情日记 ===================== */
.ad-mood { padding: 8px 12px 12px; display: flex; flex-direction: column; gap: 8px; }
.ad-mood__now { display: flex; align-items: center; gap: 8px; }
.ad-mood__big { font-size: 26px; line-height: 1; }
.ad-mood__label { font-family: var(--ad-font); font-size: 13px; color: var(--ad-text); font-weight: 600; }
.ad-mood__hint { font-family: var(--ad-font); font-size: 12px; color: var(--ad-text-dim); }
.ad-mood__grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
.ad-mood__btn { padding: 4px 0; font-size: 16px; line-height: 1.2; background: transparent; border: 1px solid transparent; border-radius: 6px; cursor: pointer; transition: all .15s; }
.ad-mood__btn:hover { background: var(--ad-s3); border-color: var(--mo-color, var(--ad-line)); }
.ad-mood__btn.is-active { border-color: var(--mo-color, var(--ad-accent)); background: var(--ad-s3); }

/* ===================== 喝水记录 ===================== */
.ad-water { padding: 8px 12px 12px; display: flex; flex-direction: column; gap: 8px; }
.ad-water__top { display: flex; align-items: baseline; gap: 4px; }
.ad-water__num { font-family: var(--ad-font); font-size: 20px; font-weight: 700; color: var(--ad-accent); }
.ad-water__unit { font-family: var(--ad-font); font-size: 11px; color: var(--ad-text-mute); }
.ad-water__bar { height: 6px; background: var(--ad-s3); border-radius: 3px; overflow: hidden; }
.ad-water__fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--ad-accent), var(--ad-accent)); transition: width .3s; }
.ad-water__btns { display: flex; gap: 8px; }
.ad-water__btns button { flex: 1; padding: 5px 8px; border: 1px solid var(--ad-line); border-radius: 8px; background: var(--ad-s2); color: var(--ad-text); font-family: var(--ad-font); font-size: 12px; cursor: pointer; }
.ad-water__btns button:hover { border-color: var(--ad-accent); }

/* ===================== 灵感闪念（Thino 互通） ===================== */
.ad-inspiration { padding: 6px 10px 10px; }
.ad-insp__list { display: flex; flex-direction: column; gap: 2px; max-height: 150px; overflow-y: auto; }
.ad-insp__item { display: flex; align-items: baseline; gap: 8px; padding: 3px 6px; border-radius: 6px; cursor: pointer; }
.ad-insp__item:hover { background: var(--ad-s3); }
.ad-insp__time { flex: 0 0 auto; font-family: var(--ad-font); font-size: 10px; color: var(--ad-accent); opacity: .85; }
.ad-insp__text { flex: 1; min-width: 0; font-size: 12px; color: var(--ad-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
>>>>>>> REPLACE
```
- **原因**：3 张卡片样式。
- **依赖**：注册表的 `cardCls`（`ad-b-mood` / `ad-b-water` / `ad-b-inspiration`）与内部 DOM class。

### 块 15 — 模块专属配色系统（17 模块主题色 + 四档强度设置）

> 需求：首页每个模块有独立颜色，且提供设置项切换整体强度（关闭 / 克制 / 标准·混搭 / 鲜明）。
>
> **机制**：在 `.dashboard-plugin` 上定义 `--mod` 默认值（继承），每个模块用自身 `.ad-b-*` 类覆盖 `--mod`，再由「档位规则」统一消费。正文文字一律保持中性，只给**图标 / 顶部线条 / 强调数字 / 进度条**上色——这是不显花的关键。
>
> **混搭定义**：`standard` 档下，8 个「重点模块」（快速捕捉 / 待办 / 本周待办 / 目标进度 / 倒计时 / 专注时间 / 心情日记 / 喝水记录）额外加**左侧竖条 + 头部淡色底**；其余 9 个模块只上图标与顶线。`vivid` 档则所有模块都强调。
>
> **数据自带色优先**：goals（目标色）、mood（心情色）、quick-links（链接色）保留各自数据色，模块色只作用于卡片框架，避免打架。
>
> ⚠️ 重打顺序：必须**先打块 13 → 块 14 → 本块 15**（锚点依赖前两块）。

```main.js
<<<<<<< SEARCH
    healthDataDir: '04 TaskNotes/健康数据',
=======
    healthDataDir: '04 TaskNotes/健康数据',
    cardStyle: 'standard',
>>>>>>> REPLACE
```
- **原因**：配色档位设置项，取值 `off` / `subtle` / `standard` / `vivid`。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
        theme: '主题', themeDesc: '跟随 Obsidian 外观，或手动指定深色/浅色。手动选择会同时切换 Obsidian 整体外观，仪表盘自动跟随',
=======
        theme: '主题', themeDesc: '跟随 Obsidian 外观，或手动指定深色/浅色。手动选择会同时切换 Obsidian 整体外观，仪表盘自动跟随',
        cardStyle: '卡片配色', cardStyleDesc: '为首页每个模块分配专属主题色，切换后立即生效，无需重载',
        cardStyleOff: '关闭（统一蓝）', cardStyleSubtle: '克制（仅图标着色）', cardStyleStandard: '标准（混搭：重点模块额外强调）', cardStyleVivid: '鲜明（全部模块强调）',
>>>>>>> REPLACE
```
- **原因**：设置面板文案（zh）。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
        theme: 'Theme', themeDesc: 'Follow Obsidian appearance, or set dark/light manually. Manual choice also switches Obsidian's overall appearance; the dashboard follows automatically',
=======
        theme: 'Theme', themeDesc: 'Follow Obsidian appearance, or set dark/light manually. Manual choice also switches Obsidian's overall appearance; the dashboard follows automatically',
        cardStyle: 'Card colors', cardStyleDesc: 'Give each home module its own accent color; applies immediately, no reload needed',
        cardStyleOff: 'Off (uniform blue)', cardStyleSubtle: 'Subtle (icons only)', cardStyleStandard: 'Standard (mixed)', cardStyleVivid: 'Vivid (all emphasized)',
>>>>>>> REPLACE
```
- **原因**：设置面板文案（en）。注意源码中 `Obsidian's` 含转义单引号，务必原样匹配。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
        new obsidian.Setting(containerEl)
            .setName(t('settings.pluginTitle'))
            .setDesc(t('settings.pluginTitleDesc'))
=======
        new obsidian.Setting(containerEl)
            .setName(t('settings.cardStyle'))
            .setDesc(t('settings.cardStyleDesc'))
            .addDropdown((dd) => dd
            .addOption('off', t('settings.cardStyleOff'))
            .addOption('subtle', t('settings.cardStyleSubtle'))
            .addOption('standard', t('settings.cardStyleStandard'))
            .addOption('vivid', t('settings.cardStyleVivid'))
            .setValue(this.plugin.settings.cardStyle || 'standard')
            .onChange(async (v) => {
            this.plugin.settings.cardStyle = v;
            await this.plugin.saveSettings();
            this.plugin.refreshCardStyle();
        }));
        new obsidian.Setting(containerEl)
            .setName(t('settings.pluginTitle'))
            .setDesc(t('settings.pluginTitleDesc'))
>>>>>>> REPLACE
```
- **原因**：设置面板新增「卡片配色」下拉，切换后 `refreshCardStyle()` 即时生效。
- **依赖**：下方 `applyCardStyle` / `refreshCardStyle` 方法、i18n key。

```main.js
<<<<<<< SEARCH
    async showDashboard() {
=======
    /** 把「卡片配色」档位（off / subtle / standard / vivid）挂到首页容器，由 CSS 消费 */
    applyCardStyle() {
        if (!this.boardEl)
            return;
        for (const s of ['off', 'subtle', 'standard', 'vivid'])
            this.boardEl.removeClass(`ad-cs-${s}`);
        this.boardEl.addClass(`ad-cs-${this.plugin.settings.cardStyle || 'standard'}`);
    }
    async showDashboard() {
>>>>>>> REPLACE
```
- **原因**：`DashboardView` 新增方法，把档位写成容器 class（`ad-cs-*`）供 CSS 消费。
- **依赖**：`this.boardEl`（内置）。

```main.js
<<<<<<< SEARCH
        this.boardEl.addClass('ad-board');
        this.currentPage = 'home';
=======
        this.boardEl.addClass('ad-board');
        this.applyCardStyle();
        this.currentPage = 'home';
>>>>>>> REPLACE
```
- **原因**：每次进入首页时套用当前档位。
- **依赖**：上方 `applyCardStyle`。

```main.js
<<<<<<< SEARCH
    refreshDashboardTitle() {
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
            const view = leaf.view;
            if (view instanceof DashboardView)
                view.refreshTitle();
        }
    }
=======
    refreshDashboardTitle() {
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
            const view = leaf.view;
            if (view instanceof DashboardView)
                view.refreshTitle();
        }
    }
    /** Push the current card-style setting into any open dashboard view. */
    refreshCardStyle() {
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
            const view = leaf.view;
            if (view instanceof DashboardView)
                view.applyCardStyle();
        }
    }
>>>>>>> REPLACE
```
- **原因**：plugin 层方法，让设置切换无需重载即可刷新所有已打开的首页。
- **依赖**：`DashboardView.applyCardStyle`。

```main.js
<<<<<<< SEARCH
    normalizeSettings() {
        let changed = false;
=======
    normalizeSettings() {
        let changed = false;
        // 0) 卡片配色档位：旧 data.json 缺失或非法值时补默认 standard
        const validCardStyles = ['off', 'subtle', 'standard', 'vivid'];
        if (!validCardStyles.includes(this.settings.cardStyle)) {
            this.settings.cardStyle = 'standard';
            changed = true;
        }
>>>>>>> REPLACE
```
- **原因**：旧 `data.json` 缺该字段时补默认（浅合并会丢新字段）。
- **依赖**：无。

```styles.css
<<<<<<< SEARCH
.ad-insp__text { flex: 1; min-width: 0; font-size: 12px; color: var(--ad-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
=======
.ad-insp__text { flex: 1; min-width: 0; font-size: 12px; color: var(--ad-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ===================== 模块专属配色（cardStyle: off / subtle / standard / vivid） ===================== */
.dashboard-plugin { --mod: var(--ad-accent); }

.ad-b-capture      { --mod: #F97316; }
.ad-b-todo         { --mod: #3B82F6; }
.ad-b-progress     { --mod: #10B981; }
.ad-b-weekly       { --mod: #6366F1; }
.ad-b-project      { --mod: #7C3AED; }
.ad-b-heatmap      { --mod: #06B6D4; }
.ad-b-countdown    { --mod: #EF4444; }
.ad-b-pomodoro     { --mod: #FB7185; }
.ad-b-mirror       { --mod: #94A3B8; }
.ad-b-quote        { --mod: #EAB308; }
.ad-b-recent       { --mod: #818CF8; }
.ad-b-quicklinks   { --mod: #D946EF; }
.ad-b-goals        { --mod: #84CC16; }
.ad-b-focustime    { --mod: #14B8A6; }
.ad-b-mood         { --mod: #F472B6; }
.ad-b-water        { --mod: #0EA5E9; }
.ad-b-inspiration  { --mod: #A78BFA; }

.ad-cs-off .ad-card { --mod: var(--ad-accent); }

.ad-cs-subtle .ad-card .ad-marker { color: var(--mod); opacity: .85; }
.ad-cs-subtle .ad-b-water .ad-water__fill { background: var(--mod); }
.ad-cs-subtle .ad-b-focustime .ad-ft__today { color: var(--mod); }

.ad-cs-standard .ad-card .ad-marker { color: var(--mod); opacity: .9; }
.ad-cs-standard .ad-card::before {
  background: linear-gradient(90deg, transparent, var(--mod), transparent);
  opacity: .5;
}
.ad-cs-standard .ad-card:hover { border-color: var(--mod); }
.ad-cs-standard .ad-card__hint { color: var(--mod); opacity: .7; }

/* 混搭：standard 档下「重点模块」额外加左侧竖条 + 头部淡色底 */
.ad-cs-standard .ad-b-capture,
.ad-cs-standard .ad-b-todo,
.ad-cs-standard .ad-b-weekly,
.ad-cs-standard .ad-b-goals,
.ad-cs-standard .ad-b-countdown,
.ad-cs-standard .ad-b-focustime,
.ad-cs-standard .ad-b-mood,
.ad-cs-standard .ad-b-water { border-left: 3px solid var(--mod); }
.ad-cs-standard .ad-b-capture .ad-card__head,
.ad-cs-standard .ad-b-todo .ad-card__head,
.ad-cs-standard .ad-b-weekly .ad-card__head,
.ad-cs-standard .ad-b-goals .ad-card__head,
.ad-cs-standard .ad-b-countdown .ad-card__head,
.ad-cs-standard .ad-b-focustime .ad-card__head,
.ad-cs-standard .ad-b-mood .ad-card__head,
.ad-cs-standard .ad-b-water .ad-card__head {
  background: color-mix(in srgb, var(--mod) 9%, transparent);
  margin: -14px -14px 0; padding: 12px 14px 10px;
  border-radius: var(--ad-r3) var(--ad-r3) 0 0;
}

/* vivid：所有模块都强调 */
.ad-cs-vivid .ad-card { border-left: 3px solid var(--mod); }
.ad-cs-vivid .ad-card .ad-marker { color: var(--mod); }
.ad-cs-vivid .ad-card::before {
  background: linear-gradient(90deg, transparent, var(--mod), transparent);
  opacity: .9;
}
.ad-cs-vivid .ad-card:hover { border-color: var(--mod); }
.ad-cs-vivid .ad-card__hint { color: var(--mod); opacity: .8; }
.ad-cs-vivid .ad-card .ad-card__head {
  background: color-mix(in srgb, var(--mod) 12%, transparent);
  margin: -14px -14px 0; padding: 12px 14px 10px;
  border-radius: var(--ad-r3) var(--ad-r3) 0 0;
}

/* 卡片内强调元素跟随模块色（数据自带色的模块除外） */
.ad-cs-standard .ad-b-water .ad-water__num,
.ad-cs-vivid .ad-b-water .ad-water__num { color: var(--mod); }
.ad-cs-standard .ad-b-water .ad-water__fill,
.ad-cs-vivid .ad-b-water .ad-water__fill { background: var(--mod); }
.ad-cs-standard .ad-b-focustime .ad-ft__today,
.ad-cs-vivid .ad-b-focustime .ad-ft__today { color: var(--mod); }
.ad-cs-standard .ad-b-inspiration .ad-insp__time,
.ad-cs-vivid .ad-b-inspiration .ad-insp__time { color: var(--mod); }
.ad-cs-standard .ad-b-recent .ad-recent__link,
.ad-cs-vivid .ad-b-recent .ad-recent__link { color: var(--mod); }
>>>>>>> REPLACE
```
- **原因**：配色系统全部样式（17 模块色 + 四档规则 + 混搭）。
- **依赖**：各模块 `cardCls`（`ad-b-*`）；`--ad-r3`、`--ad-text` 等内置变量；卡片 `.ad-card` 的 padding 为 `14px`（头部负 margin 基于该值，若未来插件改 padding 需同步改 `margin: -14px -14px 0`）。
- **注意**：`color-mix()` 需要较新 Chromium（Obsidian 桌面版支持）；若失效可改为预定义的 `--mod-soft` rgba 变量。

### 块 16 — 心情 / 喝水改造：统一 md 文件 + 保存按钮（覆盖块 14 的两个 render 方法）

> **变更原因**（用户要求，2026-09-01）：
> 1. 同一天的记录要落在**同一个 md 文件**里（心情 + 喝水不再分两个目录）；
> 2. 心情 / 喝水都要有**「保存」按钮**——选完 emoji / 调完杯数后需点保存才写入，避免误触覆盖。
>
> **新数据源**：统一到 `04 TaskNotes/健康数据/YYYY-MM-DD.md`（该文件本就是"一天一份、多指标"的日记录文件，`健康追踪.md` 也写它，已有 `waterCount` / `mood` / `sleepDuration` / `exercises` 字段）。
>
> ⚠️ **关键机制：字段级 upsert，绝不整文件覆盖**。两个卡片写同一个文件，若整文件重写会互相抹掉对方数据（也会抹掉睡眠/运动）。因此新增两个工具方法做「只改自己字段 + 只改自己摘要行」。
>
> ⚠️ **必须同步改主页1**（见 §11），否则主页1 的心情模块读的是旧目录 `04 TaskNotes/心情`，互通会断裂。
>
> 重打顺序：块 13 → 块 14 → 块 15 → 本块 16（本块替换块 14 中的 `renderMoodDiary` / `renderWaterTracker`）。

```main.js
<<<<<<< SEARCH
        inspirationNeedDaily: '需开启「追加到日记」模式',
=======
        inspirationNeedDaily: '需开启「追加到日记」模式',
        save: '保存', unsaved: '未保存',
>>>>>>> REPLACE
```
- **原因**：保存按钮与「未保存」标记文案（zh）。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
        captureBtn: 'Capture',
        capturedToast: '✨ Captured!',
=======
        captureBtn: 'Capture',
        moodEmpty: 'No mood recorded today',
        waterAdd: 'Drink',
        waterReset: 'Reset',
        inspirationNeedDaily: 'Enable "append to daily" mode',
        save: 'Save',
        unsaved: 'Unsaved',
        capturedToast: '✨ Captured!',
>>>>>>> REPLACE
```
- **原因**：en 字典补齐（块 14 时漏加到 en，英文模式会缺 key），并加保存/未保存文案。
- **依赖**：无。

```main.js
<<<<<<< SEARCH
    async renderMoodDiary(board) {
        const card = this.getOrCreateCard(board, 'ad-card ad-b-mood');
        this.cardHead(card, '\u{1F60A}', t('home.modules.mood'), '');
        const body = card.createDiv({ cls: 'ad-mood' });
        const s = this.plugin.settings;
        const dir = (s.moodDir || '').trim() || '04 TaskNotes/心情';
        const emojis = { '😊': '开心', '🙂': '不错', '😐': '一般', '😔': '低落', '😢': '难过', '😡': '生气', '😴': '疲惫', '✨': '平静', '💪': '奋斗', '❤️': '爱' };
        const keys = { '😊': 'happy', '🙂': 'good', '😐': 'meh', '😔': 'sad', '😢': 'cry', '😡': 'angry', '😴': 'tired', '✨': 'calm', '💪': 'driven', '❤️': 'love' };
        const colors = { '😊': '#34d399', '🙂': '#60a5fa', '😐': '#9ca3af', '😔': '#818cf8', '😢': '#f87171', '😡': '#fb923c', '😴': '#a78bfa', '✨': '#fbbf24', '💪': '#f472b6', '❤️': '#f43f5e' };
        const keyToEmoji = Object.fromEntries(Object.entries(keys).map(([k, v]) => [v, k]));
        const todayStr = fmtDate(new Date());
        const path = `${dir}/${todayStr}.md`;
        const readMood = async () => {
            const f = this.app.vault.getAbstractFileByPath(path);
            if (!(f instanceof obsidian.TFile))
                return '';
            const c = await this.app.vault.cachedRead(f);
            const m = /^mood:\s*(\S+)/m.exec(c);
            return m ? (keyToEmoji[m[1]] || '') : '';
        };
        const saveMood = async (emoji) => {
            const content = `---\nmood: ${keys[emoji]}\ndate: ${todayStr}\n---\n\n${emoji} 今天心情：${emojis[emoji]}\n`;
            const f = this.app.vault.getAbstractFileByPath(path);
            if (f instanceof obsidian.TFile)
                await this.app.vault.modify(f, content);
            else {
                await this.ensureFolder(dir);
                await this.app.vault.create(path, content);
            }
            await render();
        };
        const render = async () => {
            body.empty();
            const cur = await readMood();
            if (cur) {
                const now = body.createDiv({ cls: 'ad-mood__now' });
                now.createSpan({ cls: 'ad-mood__big', text: cur });
                now.createSpan({ cls: 'ad-mood__label', text: emojis[cur] || '' });
            }
            else {
                body.createDiv({ cls: 'ad-mood__hint', text: t('home.moodEmpty') });
            }
            const grid = body.createDiv({ cls: 'ad-mood__grid' });
            for (const e of Object.keys(emojis)) {
                const b = grid.createEl('button', { cls: 'ad-mood__btn', text: e });
                b.title = emojis[e];
                b.style.setProperty('--mo-color', colors[e]);
                if (e === cur)
                    b.addClass('is-active');
                b.addEventListener('click', () => void saveMood(e));
            }
        };
        await render();
    }
=======
    /** frontmatter 字段级 upsert：只改指定 key，保留其他字段与正文（防止覆盖同文件里的其他数据） */
    upsertFrontmatter(content, key, value) {
        const fm = /^---\n([\s\S]*?)\n---/.exec(content || '');
        if (fm) {
            if (new RegExp(`^${key}:`, 'm').test(fm[1])) {
                const next = fm[1].replace(new RegExp(`^${key}:.*$`, 'm'), `${key}: ${value}`);
                return content.replace(fm[0], `---\n${next}\n---`);
            }
            return content.replace(fm[0], `---\n${fm[1]}\n${key}: ${value}\n---`);
        }
        return `---\n${key}: ${value}\n---\n\n${content || ''}`;
    }
    /** 正文行级 upsert：按前缀替换该行，无则追加到末尾 */
    upsertBodyLine(content, prefix, line) {
        const lines = (content || '').split('\n');
        const i = lines.findIndex((l) => l.startsWith(prefix));
        if (i >= 0)
            lines[i] = line;
        else
            lines.push('', line);
        return lines.join('\n');
    }
    async renderMoodDiary(board) {
        const card = this.getOrCreateCard(board, 'ad-card ad-b-mood');
        this.cardHead(card, '\u{1F60A}', t('home.modules.mood'), '');
        const body = card.createDiv({ cls: 'ad-mood' });
        const s = this.plugin.settings;
        const dir = (s.healthDataDir || '').trim() || '04 TaskNotes/健康数据';
        const legacyDir = (s.moodDir || '').trim() || '04 TaskNotes/心情';
        const emojis = { '😊': '开心', '🙂': '不错', '😐': '一般', '😔': '低落', '😢': '难过', '😡': '生气', '😴': '疲惫', '✨': '平静', '💪': '奋斗', '❤️': '爱' };
        const keys = { '😊': 'happy', '🙂': 'good', '😐': 'meh', '😔': 'sad', '😢': 'cry', '😡': 'angry', '😴': 'tired', '✨': 'calm', '💪': 'driven', '❤️': 'love' };
        const colors = { '😊': '#34d399', '🙂': '#60a5fa', '😐': '#9ca3af', '😔': '#818cf8', '😢': '#f87171', '😡': '#fb923c', '😴': '#a78bfa', '✨': '#fbbf24', '💪': '#f472b6', '❤️': '#f43f5e' };
        const keyToEmoji = Object.fromEntries(Object.entries(keys).map(([k, v]) => [v, k]));
        const todayStr = fmtDate(new Date());
        const path = `${dir}/${todayStr}.md`;
        const legacyPath = `${legacyDir}/${todayStr}.md`;
        const readMood = async () => {
            // 优先读统一健康文件；回退旧心情目录（兼容历史数据与主页1 旧写法）
            for (const p of [path, legacyPath]) {
                const f = this.app.vault.getAbstractFileByPath(p);
                if (f instanceof obsidian.TFile) {
                    const c = await this.app.vault.cachedRead(f);
                    const m = /^mood:\s*(\S+)/m.exec(c);
                    if (m)
                        return keyToEmoji[m[1]] || '';
                }
            }
            return '';
        };
        let saved = await readMood();
        let pending = saved;
        const commit = async () => {
            const f = this.app.vault.getAbstractFileByPath(path);
            let content = '';
            if (f instanceof obsidian.TFile)
                content = await this.app.vault.cachedRead(f);
            else
                await this.ensureFolder(dir);
            content = this.upsertFrontmatter(content, 'date', todayStr);
            content = this.upsertFrontmatter(content, 'mood', keys[pending]);
            content = this.upsertBodyLine(content, '- 今日心情：', `- 今日心情：${pending} ${emojis[pending]}`);
            if (f instanceof obsidian.TFile)
                await this.app.vault.modify(f, content);
            else
                await this.app.vault.create(path, content);
            saved = pending;
            render();
        };
        const render = () => {
            body.empty();
            if (pending) {
                const now = body.createDiv({ cls: 'ad-mood__now' });
                now.createSpan({ cls: 'ad-mood__big', text: pending });
                now.createSpan({ cls: 'ad-mood__label', text: emojis[pending] || '' });
            }
            else {
                body.createDiv({ cls: 'ad-mood__hint', text: t('home.moodEmpty') });
            }
            const grid = body.createDiv({ cls: 'ad-mood__grid' });
            for (const e of Object.keys(emojis)) {
                const b = grid.createEl('button', { cls: 'ad-mood__btn', text: e });
                b.title = emojis[e];
                b.style.setProperty('--mo-color', colors[e]);
                if (e === pending)
                    b.addClass('is-active');
                b.addEventListener('click', () => { pending = e; render(); });
            }
            const foot = body.createDiv({ cls: 'ad-modfoot' });
            const dirty = pending !== saved;
            if (dirty)
                foot.createSpan({ cls: 'ad-unsaved', text: '● ' + t('home.unsaved') });
            const saveBtn = foot.createEl('button', { cls: 'ad-save-btn', text: t('home.save') });
            saveBtn.disabled = !dirty || !pending;
            if (dirty && pending)
                saveBtn.addEventListener('click', () => void commit());
        };
        render();
    }
>>>>>>> REPLACE
```
- **原因**：心情改为写入统一健康数据文件、字段级更新、点 emoji 只暂存在界面（显示「● 未保存」），点保存才落盘。
- **依赖**：`upsertFrontmatter` / `upsertBodyLine`（本块新增）、`this.ensureFolder`、`fmtDate`、`t('home.save')` / `t('home.unsaved')`。
- **摘要行格式**：`- 今日心情：😊 开心`——**沿用 `健康追踪.md` 既有正文格式**（避免两套格式互相覆盖）。

```main.js
<<<<<<< SEARCH
        const s = this.plugin.settings;
        const goal = Math.max(1, s.waterGoal ?? 8);
        const card = this.getOrCreateCard(board, 'ad-card ad-b-water');
        this.cardHead(card, '\u{1F4A7}', t('home.modules.water'), `0/${goal}`);
        const body = card.createDiv({ cls: 'ad-water' });
        const dir = (s.healthDataDir || '').trim() || '04 TaskNotes/健康数据';
        const todayStr = fmtDate(new Date());
        const path = `${dir}/${todayStr}.md`;
        const readCount = async () => {
            const f = this.app.vault.getAbstractFileByPath(path);
            if (!(f instanceof obsidian.TFile))
                return 0;
            const c = await this.app.vault.cachedRead(f);
            const m = /^waterCount:\s*(\d+)/m.exec(c);
            return m ? parseInt(m[1], 10) : 0;
        };
        const writeCount = async (n) => {
            const f = this.app.vault.getAbstractFileByPath(path);
            if (f instanceof obsidian.TFile) {
                const c = await this.app.vault.cachedRead(f);
                const nc = /^waterCount:/m.test(c)
                    ? c.replace(/^waterCount:.*$/m, `waterCount: ${n}`)
                    : c.replace(/^---\n/, `---\nwaterCount: ${n}\n`);
                await this.app.vault.modify(f, nc);
            }
            else {
                await this.ensureFolder(dir);
                await this.app.vault.create(path, `---\ndate: ${todayStr}\nwaterCount: ${n}\n---\n\n# 📅 ${todayStr} 健康记录\n`);
            }
            await render();
        };
        const render = async () => {
            const cnt = await readCount();
            const pct = Math.min(100, Math.round(cnt / goal * 100));
            body.empty();
            const top = body.createDiv({ cls: 'ad-water__top' });
            top.createSpan({ cls: 'ad-water__num', text: `${cnt}/${goal}` });
            top.createSpan({ cls: 'ad-water__unit', text: '杯' });
            const bar = body.createDiv({ cls: 'ad-water__bar' });
            const fill = bar.createDiv({ cls: 'ad-water__fill' });
            fill.style.width = pct + '%';
            const btns = body.createDiv({ cls: 'ad-water__btns' });
            const add = btns.createEl('button', { cls: 'ad-water__add', text: '➕ ' + t('home.waterAdd') });
            const reset = btns.createEl('button', { cls: 'ad-water__reset', text: '🔄 ' + t('home.waterReset') });
            add.addEventListener('click', () => void writeCount(cnt + 1));
            reset.addEventListener('click', () => void writeCount(0));
        };
        await render();
    }
=======
        const s = this.plugin.settings;
        const goal = Math.max(1, s.waterGoal ?? 8);
        const card = this.getOrCreateCard(board, 'ad-card ad-b-water');
        this.cardHead(card, '\u{1F4A7}', t('home.modules.water'), '');
        const body = card.createDiv({ cls: 'ad-water' });
        const dir = (s.healthDataDir || '').trim() || '04 TaskNotes/健康数据';
        const todayStr = fmtDate(new Date());
        const path = `${dir}/${todayStr}.md`;
        const readCount = async () => {
            const f = this.app.vault.getAbstractFileByPath(path);
            if (!(f instanceof obsidian.TFile))
                return 0;
            const c = await this.app.vault.cachedRead(f);
            const m = /^waterCount:\s*(\d+)/m.exec(c);
            return m ? parseInt(m[1], 10) : 0;
        };
        let saved = await readCount();
        let pending = saved;
        const commit = async () => {
            const f = this.app.vault.getAbstractFileByPath(path);
            let content = '';
            if (f instanceof obsidian.TFile)
                content = await this.app.vault.cachedRead(f);
            else
                await this.ensureFolder(dir);
            content = this.upsertFrontmatter(content, 'date', todayStr);
            content = this.upsertFrontmatter(content, 'waterCount', String(pending));
            content = this.upsertBodyLine(content, '- 喝水杯数：', `- 喝水杯数：${pending}`);
            if (f instanceof obsidian.TFile)
                await this.app.vault.modify(f, content);
            else
                await this.app.vault.create(path, content);
            saved = pending;
            render();
        };
        const render = () => {
            const pct = Math.min(100, Math.round(pending / goal * 100));
            body.empty();
            const top = body.createDiv({ cls: 'ad-water__top' });
            top.createSpan({ cls: 'ad-water__num', text: `${pending}/${goal}` });
            top.createSpan({ cls: 'ad-water__unit', text: '杯' });
            const bar = body.createDiv({ cls: 'ad-water__bar' });
            const fill = bar.createDiv({ cls: 'ad-water__fill' });
            fill.style.width = pct + '%';
            const row = body.createDiv({ cls: 'ad-water__btns' });
            const add = row.createEl('button', { cls: 'ad-water__add', text: '➕ ' + t('home.waterAdd') });
            const reset = row.createEl('button', { cls: 'ad-water__reset', text: '🔄 ' + t('home.waterReset') });
            add.addEventListener('click', () => { pending += 1; render(); });
            reset.addEventListener('click', () => { pending = 0; render(); });
            const foot = body.createDiv({ cls: 'ad-modfoot' });
            const dirty = pending !== saved;
            if (dirty)
                foot.createSpan({ cls: 'ad-unsaved', text: '● ' + t('home.unsaved') });
            const saveBtn = foot.createEl('button', { cls: 'ad-save-btn', text: t('home.save') });
            saveBtn.disabled = !dirty;
            if (dirty)
                saveBtn.addEventListener('click', () => void commit());
        };
        render();
    }
>>>>>>> REPLACE
```
- **原因**：喝水 ➕/🔄 只改本地 `pending`（显示「● 未保存」），点保存才字段级写入 `waterCount` + 摘要行。
- **依赖**：`upsertFrontmatter` / `upsertBodyLine`（本块新增）、`t('home.save')` / `t('home.unsaved')`。

```styles.css
<<<<<<< SEARCH
.ad-cs-subtle .ad-b-water .ad-water__fill { background: var(--mod); }
.ad-cs-subtle .ad-b-focustime .ad-ft__today { color: var(--mod); }
=======
.ad-cs-subtle .ad-b-water .ad-water__fill { background: var(--mod); }
.ad-cs-subtle .ad-b-focustime .ad-ft__today { color: var(--mod); }

/* ===================== 保存按钮 / 未保存标记（心情 · 喝水等可写模块） ===================== */
.ad-modfoot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 2px; }
.ad-unsaved { font-family: var(--ad-font); font-size: 11px; color: var(--ad-warn); }
.ad-save-btn {
  flex: 0 0 auto; padding: 4px 14px; border: 1px solid var(--mod, var(--ad-accent));
  border-radius: var(--ad-r1); background: var(--mod, var(--ad-accent)); color: var(--ad-on-accent);
  font-family: var(--ad-font); font-size: 12px; cursor: pointer; transition: filter .12s;
}
.ad-save-btn:hover:not(:disabled) { filter: brightness(1.06); }
.ad-save-btn:disabled { opacity: .35; cursor: default; filter: grayscale(1); }
>>>>>>> REPLACE
```
- **原因**：保存按钮与「未保存」标记样式（按钮沿用模块主题色）。
- **依赖**：`--mod`（块 15 配色系统）；未打块 15 时按钮回落 `--ad-accent` 蓝色。

### 块 17 — 打卡清单重命名 + 导入整页 + 大纲自动归类（v0.3.1 追加功能）

> 本次三项需求：
> 1. **打卡清单重命名**：原本分组标题与任务文本都是静态文本，**完全没有重命名功能**（点击无反应）。现补上：点分组标题 / 点任务文本 → 变输入框 → 回车保存，写回 md 源文件。
> 2. **导入整页**：新增第四个独立整页「导入」，与「灵感收集」「人生打卡清单」在顶部导航并列，把任意 md 一键建成首页笔记映射卡片（mirror）。
> 3. **大纲自动归类**：新增设置项 `checklistOutlineFile`（分类大纲 md 路径）+ `checklistAutoGroup`（开关）。开启后任务按「文本是否包含分类名」归入大纲分类，匹配不到的进「未分类」。
>
> ⚠️ **重打顺序**：块 13 → 14 → 15 → 16 → 本块 17。
> ⚠️ **关键坑**：新增整页必须同步清理新 class（见块 17f），否则会重演 §8.7「首页被压扁」的 bug。

#### 17a — parseGroups 记录标题行号（供重命名定位）

```main.js
<<<<<<< SEARCH
        const groups = [];
        let cur = { heading: '', tasks: [] };
        lines.forEach((line, i) => {
            const h = line.match(/^#\s+(.*)$/);
            if (h) {
                if (cur.heading !== '' || cur.tasks.length)
                    groups.push(cur);
                cur = { heading: h[1].trim(), tasks: [] };
                return;
            }
=======
        const groups = [];
        let cur = { heading: '', headingLineNo: -1, tasks: [] };
        lines.forEach((line, i) => {
            const h = line.match(/^#\s+(.*)$/);
            if (h) {
                if (cur.heading !== '' || cur.tasks.length)
                    groups.push(cur);
                cur = { heading: h[1].trim(), headingLineNo: i, tasks: [] };
                return;
            }
>>>>>>> REPLACE
```
- **原因**：重命名分组需要知道 `# 标题` 在第几行。
- **依赖**：无。

#### 17b — 新增 renameGroup / renameTask / inlineRename（插在 `deleteTask` 之后）

```main.js
<<<<<<< SEARCH
    async deleteTask(lineNo) {
        const p = this.path();
        const file = this.host.app.vault.getAbstractFileByPath(p);
        if (!(file instanceof obsidian.TFile))
            return;
        const lines = (await this.host.app.vault.read(file)).split(/\r?\n/);
        if (lineNo < 0 || lineNo >= lines.length)
            return;
        lines.splice(lineNo, 1);
        await this.host.app.vault.modify(file, lines.join('\n'));
    }
=======
    async deleteTask(lineNo) {
        const p = this.path();
        const file = this.host.app.vault.getAbstractFileByPath(p);
        if (!(file instanceof obsidian.TFile))
            return;
        const lines = (await this.host.app.vault.read(file)).split(/\r?\n/);
        if (lineNo < 0 || lineNo >= lines.length)
            return;
        lines.splice(lineNo, 1);
        await this.host.app.vault.modify(file, lines.join('\n'));
    }
    /** 重命名分组（# 一级标题）：只改标题行，不影响其下任务 */
    async renameGroup(lineNo, newHeading) {
        const p = this.path();
        const file = this.host.app.vault.getAbstractFileByPath(p);
        if (!(file instanceof obsidian.TFile))
            return;
        const lines = (await this.host.app.vault.read(file)).split(/\r?\n/);
        if (lineNo < 0 || lineNo >= lines.length)
            return;
        if (!/^#\s+/.test(lines[lineNo]))
            return;
        lines[lineNo] = '# ' + newHeading;
        await this.host.app.vault.modify(file, lines.join('\n'));
    }
    /** 重命名任务：保留勾选状态与行尾 ✅日期，只替换正文 */
    async renameTask(lineNo, newText) {
        const p = this.path();
        const file = this.host.app.vault.getAbstractFileByPath(p);
        if (!(file instanceof obsidian.TFile))
            return;
        const lines = (await this.host.app.vault.read(file)).split(/\r?\n/);
        if (lineNo < 0 || lineNo >= lines.length)
            return;
        const m = /^(\s*[-*]\s+\[)( |x|X)(\]\s+)(.*)$/.exec(lines[lineNo]);
        if (!m)
            return;
        // 保留行尾的 ✅ 日期（若有），只替换任务正文
        const dm = /^(.*?)(?:\s+(✅\s*\S+))?\s*$/.exec(m[4]);
        const datePart = dm && dm[2] ? ' ' + dm[2].trim() : '';
        lines[lineNo] = `- [${m[2]}] ${newText}${datePart}`;
        await this.host.app.vault.modify(file, lines.join('\n'));
    }
    /** 内联重命名：把元素临时换成 input，回车保存 / Esc 取消 / 失焦保存 */
    inlineRename(el, current, onSave) {
        if (!el || el.querySelector('input'))
            return;
        el.empty();
        const input = el.createEl('input', { cls: 'ck-rename-input' });
        input.value = current;
        input.focus();
        input.select();
        let finished = false;
        const finish = async (save) => {
            if (finished)
                return;
            finished = true;
            const v = input.value.trim();
            input.remove();
            if (save && v && v !== current) {
                el.textContent = v;
                await onSave(v);
            }
            else {
                el.textContent = current;
            }
        };
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                void finish(true);
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                void finish(false);
            }
        });
        input.addEventListener('blur', () => void finish(true));
    }
>>>>>>> REPLACE
```
- **原因**：重命名核心逻辑。`renameTask` 用正则保留 `[x]` 勾选态与行尾 `✅ 日期`，只替换正文。
- **依赖**：`this.path()`、`this.host.app.vault`、块 17a 的 `headingLineNo`。

#### 17c — renderMain 让标题与任务可点击重命名（并处理大纲只读分组）

```main.js
<<<<<<< SEARCH
        for (const g of groups) {
            const sec = main.createDiv({ cls: 'ck-group' });
            if (g.heading)
                sec.createEl('h3', { cls: 'ck-group__title', text: g.heading });
            const ul = sec.createEl('ul', { cls: 'ck-tasks' });
            for (const task of g.tasks) {
                const li = ul.createEl('li', { cls: 'ck-task' + (task.done ? ' is-done' : '') });
                const cb = li.createEl('input', { type: 'checkbox', cls: 'ck-task__cb' });
                cb.checked = task.done;
                cb.addEventListener('change', () => void this.toggleTask(task.lineNo, cb.checked).then(() => this.scheduleRefresh()));
                li.createSpan({ cls: 'ck-task__text', text: task.text });
                const del = li.createEl('button', { cls: 'ck-task__del', text: '✕' });
                del.addEventListener('click', () => void this.deleteTask(task.lineNo).then(() => this.scheduleRefresh()));
            }
        }
=======
        for (const g of groups) {
            const sec = main.createDiv({ cls: 'ck-group' });
            if (g.heading) {
                const h3 = sec.createEl('h3', { cls: 'ck-group__title', text: g.heading });
                // 大纲归类产生的分组不是清单文件里的真实标题，不支持原地重命名
                if (g.outlineOnly) {
                    h3.title = '该分组来自「分类大纲」，需在对照文件里改名';
                    h3.addClass('is-readonly');
                }
                else {
                    h3.title = '点击重命名分组';
                    h3.addEventListener('click', () => this.inlineRename(h3, g.heading, async (v) => {
                        await this.renameGroup(g.headingLineNo, v);
                        this.scheduleRefresh();
                    }));
                }
            }
            const ul = sec.createEl('ul', { cls: 'ck-tasks' });
            for (const task of g.tasks) {
                const li = ul.createEl('li', { cls: 'ck-task' + (task.done ? ' is-done' : '') });
                const cb = li.createEl('input', { type: 'checkbox', cls: 'ck-task__cb' });
                cb.checked = task.done;
                cb.addEventListener('change', () => void this.toggleTask(task.lineNo, cb.checked).then(() => this.scheduleRefresh()));
                const textSpan = li.createSpan({ cls: 'ck-task__text', text: task.text });
                textSpan.title = '点击重命名任务';
                textSpan.addEventListener('click', () => this.inlineRename(textSpan, task.text, async (v) => {
                    await this.renameTask(task.lineNo, v);
                    this.scheduleRefresh();
                }));
                const del = li.createEl('button', { cls: 'ck-task__del', text: '✕' });
                del.addEventListener('click', () => void this.deleteTask(task.lineNo).then(() => this.scheduleRefresh()));
            }
        }
>>>>>>> REPLACE
```
- **原因**：挂上重命名交互；大纲分组标为只读（它没有对应的源码行，改了会写到错误位置）。
- **依赖**：块 17b 的方法、块 17e 的 `outlineOnly` 标记。

#### 17d — 大纲自动归类：loadGroups 分流 + loadOutline + groupByOutline

```main.js
<<<<<<< SEARCH
    async loadGroups() {
        const p = this.path();
        if (!p)
            return [];
        const file = this.host.app.vault.getAbstractFileByPath(p);
        if (!(file instanceof obsidian.TFile))
            return [];
        const content = await this.host.app.vault.read(file);
        return this.parseGroups(content);
    }
=======
    async loadGroups() {
        const p = this.path();
        if (!p)
            return [];
        const file = this.host.app.vault.getAbstractFileByPath(p);
        if (!(file instanceof obsidian.TFile))
            return [];
        const content = await this.host.app.vault.read(file);
        const groups = this.parseGroups(content);
        // 开启「按大纲自动归类」且填了大纲文件时，改用大纲标题做分组
        if (this.host.plugin.settings.checklistAutoGroup) {
            const outline = await this.loadOutline();
            if (outline.length)
                return this.groupByOutline(groups, outline);
        }
        return groups;
    }
    /** 读取「分类大纲 md」里的标题作为分类名（支持 # 与 ##） */
    async loadOutline() {
        const raw = (this.host.plugin.settings.checklistOutlineFile || '').trim();
        if (!raw)
            return [];
        const p = raw.toLowerCase().endsWith('.md') ? raw : raw + '.md';
        const file = this.host.app.vault.getAbstractFileByPath(p);
        if (!(file instanceof obsidian.TFile))
            return [];
        const content = await this.host.app.vault.read(file);
        const out = [];
        for (const line of content.split(/\r?\n/)) {
            const h = line.match(/^(#{1,2})\s+(.*)$/);
            if (h) {
                const name = h[2].trim();
                if (name && !out.includes(name))
                    out.push(name);
            }
        }
        return out;
    }
    /** 把全部任务按大纲分类重新分组：任务文本包含分类名即归入（首个命中优先），否则进「未分类」 */
    groupByOutline(groups, outline) {
        const all = [];
        for (const g of groups)
            all.push(...g.tasks);
        const buckets = outline.map((name) => ({ heading: name, headingLineNo: -1, tasks: [], outlineOnly: true }));
        const rest = { heading: '未分类', headingLineNo: -1, tasks: [], outlineOnly: true };
        for (const task of all) {
            const hit = outline.find((name) => task.text.includes(name));
            const bucket = hit ? buckets[outline.indexOf(hit)] : rest;
            bucket.tasks.push(task);
        }
        const result = buckets.filter((b) => b.tasks.length);
        if (rest.tasks.length)
            result.push(rest);
        return result;
    }
>>>>>>> REPLACE
```
- **原因**：实现"按大纲 md 标题自动归类"。未填路径或关闭开关时，行为与原来完全一致（按清单自身 `#` 分组）。
- **依赖**：设置项 `checklistOutlineFile` / `checklistAutoGroup`（块 17e）。
- **匹配规则**：任务文本 `includes(分类名)` 即命中，首个命中优先；未命中进「未分类」。若要改成标签匹配或模糊匹配，改 `groupByOutline` 里的 `hit` 判断即可。

#### 17e — 新增设置项与 i18n

```main.js
<<<<<<< SEARCH
    checklistAppendDate: false,
=======
    checklistAppendDate: false,
    checklistOutlineFile: '',
    checklistAutoGroup: false,
    importEnabled: true,
    importTitle: '导入',
>>>>>>> REPLACE
```

```main.js
<<<<<<< SEARCH
            home: '主页', allProjects: '全部项目', board: '看板', checklist: '打卡',
=======
            home: '主页', allProjects: '全部项目', board: '看板', checklist: '打卡', import: '导入',
>>>>>>> REPLACE
```
（en 对应：`home: 'Home', allProjects: 'All projects', board: 'Board', checklist: 'Checklist',` → 加 `import: 'Import',`）

```main.js
<<<<<<< SEARCH
        checklistAppendDate: '勾选时追加日期', checklistAppendDateDesc: '勾选完成任务时，在行尾追加 ✅ 当天日期（如 ✅ 2026-09-01）',
=======
        checklistAppendDate: '勾选时追加日期', checklistAppendDateDesc: '勾选完成任务时，在行尾追加 ✅ 当天日期（如 ✅ 2026-09-01）',
        checklistOutline: '分类大纲文件', checklistOutlineDesc: '填一个 md 路径（里面用标题写分类名）。开启下方开关后，任务按其文本是否包含分类名自动归类；不填或关闭则按清单自身的 # 标题分组',
        checklistOutlinePlaceholder: '例如 01 主页/分类大纲.md',
        checklistAutoGroup: '按大纲自动归类', checklistAutoGroupDesc: '开启后，任务按「分类大纲文件」里的标题自动归类显示；匹配不到的进入「未分类」',
        secImport: '导入模块',
        importEnable: '启用导入', importEnableDesc: '关闭后，顶部导航的导入入口与对应页面都会被隐藏',
        importName: '页面名称', importNameDesc: '顶栏与页面标题显示的名称，可自定义',
        importNamePlaceholder: '导入',
>>>>>>> REPLACE
```
（en 段同理，在 `checklistAppendDate: 'Append date on check', ...` 之后加对应英文字条）

```main.js
<<<<<<< SEARCH
        save: '保存', unsaved: '未保存',
=======
        save: '保存', unsaved: '未保存',
        importSub: '把任意 md 快速建成首页的「笔记映射」卡片，不用去设置里手填路径',
        importPickPlaceholder: '— 从库中选择一个 md —',
        importPathPlaceholder: '或直接粘贴文件路径（如 01 主页/主页2.md）',
        importTitlePlaceholder: '卡片标题（留空则使用文件名）',
        importBtn: '导入为首页卡片',
        importExisting: '已有的映射卡片',
        importEmpty: '还没有映射卡片',
        importNeedFile: '请先选择或填写 md 路径',
        importNoFile: '找不到该文件',
        importExists: '该 md 已经导入过了',
        importDone: '已导入，去首页「＋ 添加卡片」里启用即可',
>>>>>>> REPLACE
```
（en 段同理，在 `save: 'Save',\n        unsaved: 'Unsaved',` 之后加）

```main.js
<<<<<<< SEARCH
        if (typeof this.settings.checklistAppendDate !== 'boolean')
            { this.settings.checklistAppendDate = false; changed = true; }
=======
        if (typeof this.settings.checklistAppendDate !== 'boolean')
            { this.settings.checklistAppendDate = false; changed = true; }
        if (typeof this.settings.checklistOutlineFile !== 'string')
            { this.settings.checklistOutlineFile = ''; changed = true; }
        if (typeof this.settings.checklistAutoGroup !== 'boolean')
            { this.settings.checklistAutoGroup = false; changed = true; }
        if (typeof this.settings.importEnabled !== 'boolean')
            { this.settings.importEnabled = true; changed = true; }
        if (typeof this.settings.importTitle !== 'string' || !this.settings.importTitle)
            { this.settings.importTitle = '导入'; changed = true; }
>>>>>>> REPLACE
```
- **原因**：旧 `data.json` 缺字段时补默认。
- **依赖**：无。

#### 17f — ImportBoard 类 + 导航入口 + class 清理（**关键**）

新增 `ImportBoard` 类（插在 `class OpportunityBoard {` 之前）：
```js
/** 导入页（第四页）：把任意 md 一键建成首页「笔记映射」卡片。 */
class ImportBoard {
    constructor(host) { this.host = host; }
    title() { return this.host.plugin.settings.importTitle || t('settings.importNamePlaceholder'); }
    async show() {
        if (!this.host.boardEl) return;
        this.host.exitEditMode();
        const board = this.host.boardEl;
        board.empty();
        board.removeClass('ad-board');
        board.removeClass('po-board');
        board.removeClass('op-board');
        board.removeClass('ck-board');
        board.addClass('im-board');
        this.host.currentPage = 'import';
        const container = board.createDiv({ cls: 'im-container' });
        this.render(container);
    }
    render(root) {
        root.empty();
        const head = root.createDiv({ cls: 'im-head' });
        head.createEl('h2', { cls: 'im-title', text: this.title() });
        head.createDiv({ cls: 'im-sub', text: t('home.importSub') });
        const form = root.createDiv({ cls: 'im-form' });
        const sel = form.createEl('select', { cls: 'im-select' });
        sel.createEl('option', { value: '', text: t('home.importPickPlaceholder') });
        const files = this.host.app.vault.getMarkdownFiles().sort((a, b) => a.path.localeCompare(b.path));
        for (const f of files) sel.createEl('option', { value: f.path, text: f.path });
        const pathInput = form.createEl('input', { cls: 'im-input', attr: { placeholder: t('home.importPathPlaceholder') } });
        sel.addEventListener('change', () => { if (sel.value) pathInput.value = sel.value; });
        const titleInput = form.createEl('input', { cls: 'im-input', attr: { placeholder: t('home.importTitlePlaceholder') } });
        const iconInput = form.createEl('input', { cls: 'im-input im-input--icon', attr: { placeholder: '\u{1F4C4}' } });
        iconInput.value = '\u{1F4C4}';
        const btnRow = form.createDiv({ cls: 'im-btns' });
        const btn = btnRow.createEl('button', { cls: 'im-btn im-btn--primary', text: t('home.importBtn') });
        btn.addEventListener('click', () => void this.doImport(pathInput.value.trim(), titleInput.value.trim(), iconInput.value.trim()));
        const list = root.createDiv({ cls: 'im-list' });
        list.createEl('h3', { cls: 'im-list__title', text: t('home.importExisting') });
        const mirrors = Array.isArray(this.host.plugin.settings.mirrors) ? this.host.plugin.settings.mirrors : [];
        if (!mirrors.length) { list.createDiv({ cls: 'im-empty', text: t('home.importEmpty') }); return; }
        for (const m of mirrors) {
            const row = list.createDiv({ cls: 'im-item' });
            row.createSpan({ cls: 'im-item__icon', text: m.icon || '\u{1F4C4}' });
            row.createSpan({ cls: 'im-item__name', text: m.title || m.filePath });
            row.createSpan({ cls: 'im-item__path', text: m.filePath });
            const rm = row.createEl('button', { cls: 'im-item__del', text: '\u2715' });
            rm.addEventListener('click', () => void this.removeMirror(m.id));
        }
    }
    async doImport(filePath, title, icon) {
        if (!filePath) { this.host.showToast(t('home.importNeedFile'), 'error'); return; }
        const p = filePath.toLowerCase().endsWith('.md') ? filePath : filePath + '.md';
        const file = this.host.app.vault.getAbstractFileByPath(p);
        if (!(file instanceof obsidian.TFile)) { this.host.showToast(t('home.importNoFile'), 'error'); return; }
        const s = this.host.plugin.settings;
        if (!Array.isArray(s.mirrors)) s.mirrors = [];
        if (s.mirrors.some((m) => m.filePath === p && m.scope !== 'heading')) { this.host.showToast(t('home.importExists')); return; }
        s.mirrors.push({ id: 'm' + Date.now(), filePath: p, scope: 'file', heading: '', title: title || file.basename, icon: icon || '\u{1F4C4}', enabled: true, auto: false, sourceId: '' });
        await this.host.plugin.saveSettings();
        this.host.showToast(t('home.importDone'));
        await this.show();
    }
    async removeMirror(id) {
        const s = this.host.plugin.settings;
        s.mirrors = (s.mirrors || []).filter((m) => m.id !== id);
        await this.host.plugin.saveSettings();
        await this.show();
    }
}
```

导航入口（在 checklist 入口之后）：
```main.js
<<<<<<< SEARCH
        if (this.plugin.settings.checklistEnabled) {
            navItems.push({ glyph: '☑', label: this.plugin.settings.checklistTitle || t('home.nav.checklist'), action: 'checklist', svg: undefined });
        }
=======
        if (this.plugin.settings.checklistEnabled) {
            navItems.push({ glyph: '☑', label: this.plugin.settings.checklistTitle || t('home.nav.checklist'), action: 'checklist', svg: undefined });
        }
        if (this.plugin.settings.importEnabled) {
            navItems.push({ glyph: '\u21E9', label: this.plugin.settings.importTitle || t('home.nav.import'), action: 'import', svg: undefined });
        }
>>>>>>> REPLACE
```

动作绑定 + 实例化：
```main.js
<<<<<<< SEARCH
                    if (it.action === 'checklist')
                        void this.checklistBoard.show();
=======
                    if (it.action === 'checklist')
                        void this.checklistBoard.show();
                    if (it.action === 'import')
                        void this.importBoard.show();
>>>>>>> REPLACE
```
```main.js
<<<<<<< SEARCH
        this.checklistBoard = new ChecklistBoard(this);
=======
        this.checklistBoard = new ChecklistBoard(this);
        this.importBoard = new ImportBoard(this);
>>>>>>> REPLACE
```

**class 清理（4 处，缺一就会重演 §8.7 的首页压扁/样式残留）**：
```main.js
/* ChecklistBoard.show */
<<<<<<< SEARCH
        board.removeClass('ck-board');
        board.addClass('ck-board');
=======
        board.removeClass('ck-board');
        board.removeClass('im-board');
        board.addClass('ck-board');
>>>>>>> REPLACE
```
```main.js
/* OpportunityBoard.show */
<<<<<<< SEARCH
        this.host.boardEl.removeClass('ck-board');
        this.host.boardEl.addClass('op-board');
=======
        this.host.boardEl.removeClass('ck-board');
        this.host.boardEl.removeClass('im-board');
        this.host.boardEl.addClass('op-board');
>>>>>>> REPLACE
```
```main.js
/* ProjectBoard.show */
<<<<<<< SEARCH
        this.boardEl.removeClass('ck-board');
        this.currentPage = 'project';
=======
        this.boardEl.removeClass('ck-board');
        this.boardEl.removeClass('im-board');
        this.currentPage = 'project';
>>>>>>> REPLACE
```
```main.js
/* showDashboard —— 注意它后面紧跟 applyCardStyle（块 15 加的），务必一起匹配 */
<<<<<<< SEARCH
        this.boardEl.removeClass('ck-board');
        this.boardEl.addClass('ad-board');
        this.applyCardStyle();
=======
        this.boardEl.removeClass('ck-board');
        this.boardEl.removeClass('im-board');
        this.boardEl.addClass('ad-board');
        this.applyCardStyle();
>>>>>>> REPLACE
```
- **校验**：`grep -c "removeClass('im-board')" main.js` 应输出 **4**，`grep -c "addClass('im-board')"` 应输出 **1**。

#### 17g — styles.css（重命名输入框 + 导入页 + 只读分组标题）

```styles.css
<<<<<<< SEARCH
.ck-empty { font-family: var(--ad-font); font-size: 13px; color: var(--ad-text-dim); padding: 20px; }
=======
.ck-empty { font-family: var(--ad-font); font-size: 13px; color: var(--ad-text-dim); padding: 20px; }

/* 重命名（分组标题 / 任务文本）：点击即变输入框 */
.ck-group__title { cursor: text; border-radius: 4px; }
.ck-group__title:hover { color: var(--ad-accent); }
.ck-task__text { cursor: text; border-radius: 4px; }
.ck-task__text:hover { color: var(--ad-accent); }
.ck-rename-input { width: 100%; min-width: 120px; padding: 2px 6px; border: 1px solid var(--ad-accent); border-radius: 4px; background: var(--ad-s3); color: var(--ad-text); font-family: var(--ad-font); font-size: inherit; outline: none; }
>>>>>>> REPLACE
```
```styles.css
<<<<<<< SEARCH
.ck-group__title { cursor: text; border-radius: 4px; }
.ck-group__title:hover { color: var(--ad-accent); }
=======
.ck-group__title { cursor: text; border-radius: 4px; }
.ck-group__title:hover { color: var(--ad-accent); }
.ck-group__title.is-readonly { cursor: default; color: var(--ad-text-mute); }
.ck-group__title.is-readonly:hover { color: var(--ad-text-mute); }
>>>>>>> REPLACE
```
导入页样式（追加在 `/* ===================== 主页2 风格扩展卡片 ===================== */` 之前）：
```css
/* ===================== 导入页（独立整页，与灵感收集 / 打卡清单并列） ===================== */
.im-board { padding: 22px; overflow-y: auto; }
.im-container { max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
.im-title { margin: 0; font-family: var(--ad-font); font-size: 20px; font-weight: 700; color: var(--ad-text); }
.im-sub { font-family: var(--ad-font); font-size: 12px; color: var(--ad-text-mute); margin-top: 6px; }
.im-form { display: flex; flex-direction: column; gap: 10px; padding: 16px; background: var(--ad-s1); border: 1px solid var(--ad-line); border-radius: var(--ad-r3); }
.im-select, .im-input { width: 100%; padding: 8px 10px; background: var(--ad-s3); color: var(--ad-text); border: 1px solid var(--ad-line); border-radius: var(--ad-r2); font-family: var(--ad-font); font-size: 13px; outline: none; }
.im-select:focus, .im-input:focus { border-color: var(--ad-accent); }
.im-input--icon { width: 64px; text-align: center; }
.im-btns { display: flex; gap: 10px; margin-top: 4px; }
.im-btn { padding: 8px 18px; border: 1px solid var(--ad-accent); border-radius: var(--ad-r2); background: var(--ad-accent); color: var(--ad-on-accent); font-family: var(--ad-font); font-size: 13px; cursor: pointer; transition: filter .12s; }
.im-btn:hover { filter: brightness(1.06); }
.im-list { display: flex; flex-direction: column; gap: 8px; }
.im-list__title { margin: 0 0 4px; font-family: var(--ad-font); font-size: 14px; font-weight: 600; color: var(--ad-text); }
.im-empty { font-family: var(--ad-font); font-size: 12px; color: var(--ad-text-dim); padding: 10px 0; }
.im-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--ad-s1); border: 1px solid var(--ad-line); border-radius: var(--ad-r2); }
.im-item__icon { font-size: 15px; flex: 0 0 auto; }
.im-item__name { font-family: var(--ad-font); font-size: 13px; color: var(--ad-text); flex: 0 0 auto; }
.im-item__path { font-family: var(--ad-font); font-size: 11px; color: var(--ad-text-mute); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.im-item__del { border: none; background: transparent; color: var(--ad-text-dim); cursor: pointer; opacity: 0; font-size: 12px; padding: 0 4px; }
.im-item:hover .im-item__del { opacity: 1; }
.im-item__del:hover { color: var(--ad-danger); }
```

### 块 18 — 热力图四模式（日/周/季/年）+ 灵感卡片（显示更多 + 刷新）

> 需求：
> 1. 首页「笔记统计」不只有年热力图，要能切换 **日 / 周 / 季度 / 年** 四种模式。
> 2. 「灵感闪念」卡片不只显示几条，要能显示更多，并加**刷新按钮**。
>
> **重要前提**：`getVaultNoteCounts()` 只按 `file.stat.ctime` 统计到**天级**，没有小时级数据。所以「日」模式只能显示当天总量（1 个格子），无法做 24 小时分布。四种模式复用同一套「7 行 × N 周列」网格，只改变**日期区间**。
>
> 重打顺序：块 13 → 14 → 15 → 16 → 17 → 本块 18。

#### 18a — 新增 calcRangeStats / startOfWeek（插在 `function calcHeatmapStats` 之前）

```main.js
<<<<<<< SEARCH
function calcHeatmapStats(data, year, today) {
=======
/**
 * 按任意日期区间统计热力图指标（供「日 / 周 / 季 / 年」四种模式共用）。
 * total  = 区间内笔记总数；active = 区间内有产出的天数；streak 仍从今天/昨天往回数（全局连续天数）。
 */
function calcRangeStats(data, startStr, endStr, today) {
    let total = 0;
    let active = 0;
    for (const [date, count] of data) {
        if (date < startStr || date > endStr)
            continue;
        total += count;
        if (count > 0)
            active++;
    }
    let streak = 0;
    const d = new Date(today);
    const todayStr = fmtDate(today);
    // 今天还没写时从昨天起算，避免刚过零点就把连续天数清零
    if ((data.get(todayStr) ?? 0) === 0)
        d.setDate(d.getDate() - 1);
    while ((data.get(fmtDate(d)) ?? 0) > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
    }
    return { total, active, streak };
}
/** 求某日期所在周的周一（周一为一周之始，与热力图星期列一致） */
function startOfWeek(date) {
    const d = new Date(date);
    const dow = d.getDay();
    d.setDate(d.getDate() - ((dow + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return d;
}
function calcHeatmapStats(data, year, today) {
>>>>>>> REPLACE
```
- **原因**：原 `calcHeatmapStats` 写死按年统计（`prefix = ${year}-`），无法支持其它粒度；新增按区间统计的版本。
- **依赖**：`fmtDate`（内置）。

#### 18b — renderHeatmap：模式切换按钮 + 按模式计算区间

```main.js
<<<<<<< SEARCH
        const year = today.getFullYear();
        const stats = calcHeatmapStats(noteCounts, year, today);
        // Title header (dashboard header style)
        const head = card.createDiv({ cls: 'ad-card__head' });
        const h3 = head.createEl('h3', { cls: 'ad-card__title' });
        h3.createSpan({ cls: 'ad-marker', text: '\u25A5' });
        h3.appendText(t('home.modules.heatmap'));
        // 统计数字 + 活跃度指标（顶部右上角，与标题同行右对齐）
        const nsHead = head.createDiv({ cls: 'ad-ns__head' });
=======
        const year = today.getFullYear();
        // ---- 模式：日 / 周 / 季 / 年（默认年） ----
        const validModes = ['day', 'week', 'quarter', 'year'];
        let mode = this.plugin.settings.heatmapMode;
        if (!validModes.includes(mode))
            mode = 'year';
        const q = Math.floor(today.getMonth() / 3);
        let rangeStart, rangeEnd, rangeLabel;
        if (mode === 'day') {
            rangeStart = new Date(today);
            rangeEnd = new Date(today);
            rangeLabel = t('home.heatRangeToday');
        }
        else if (mode === 'week') {
            rangeStart = startOfWeek(today);
            rangeEnd = new Date(rangeStart);
            rangeEnd.setDate(rangeEnd.getDate() + 6);
            rangeLabel = t('home.heatRangeWeek');
        }
        else if (mode === 'quarter') {
            rangeStart = new Date(year, q * 3, 1);
            rangeEnd = new Date(year, q * 3 + 3, 0);
            rangeLabel = t('home.heatRangeQuarter');
        }
        else {
            rangeStart = new Date(year, 0, 1);
            rangeEnd = new Date(year, 11, 31);
            rangeLabel = t('home.heatmapAllYear', { year });
        }
        rangeStart.setHours(0, 0, 0, 0);
        rangeEnd.setHours(0, 0, 0, 0);
        const stats = mode === 'year'
            ? calcHeatmapStats(noteCounts, year, today)
            : calcRangeStats(noteCounts, fmtDate(rangeStart), fmtDate(rangeEnd), today);
        // Title header (dashboard header style)
        const head = card.createDiv({ cls: 'ad-card__head' });
        const h3 = head.createEl('h3', { cls: 'ad-card__title' });
        h3.createSpan({ cls: 'ad-marker', text: '\u25A5' });
        h3.appendText(t('home.modules.heatmap'));
        // 模式切换：日 / 周 / 季 / 年
        const modeBar = head.createDiv({ cls: 'ad-ns__modes' });
        const modeDefs = [
            ['day', t('home.heatModeDay')],
            ['week', t('home.heatModeWeek')],
            ['quarter', t('home.heatModeQuarter')],
            ['year', t('home.heatModeYear')],
        ];
        for (const [m, label] of modeDefs) {
            const b = modeBar.createEl('button', { cls: 'ad-ns__mode' + (m === mode ? ' is-active' : ''), text: label });
            b.title = label;
            b.addEventListener('click', async () => {
                this.plugin.settings.heatmapMode = m;
                await this.plugin.saveSettings();
                this.renderHeatmap(board);
            });
        }
        // 统计数字 + 活跃度指标（顶部右上角，与标题同行右对齐）
        const nsHead = head.createDiv({ cls: 'ad-ns__head' });
>>>>>>> REPLACE
```
- **原因**：按模式算区间 + 加切换按钮；切换后**持久化到 settings** 并立即重渲染。
- **依赖**：`calcRangeStats` / `startOfWeek`（18a）、i18n key（18e）、`this.plugin.saveSettings`。

#### 18c — 网格边界改按区间（并对外对齐到整周）

```main.js
<<<<<<< SEARCH
        // --- Year boundaries (Jan 1 -> Dec 31) ---
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        const yearStartTime = yearStart.getTime();
        const yearEndTime = yearEnd.getTime();
        const startDow = yearStart.getDay();
        const startMonday = new Date(year, 0, 1 - ((startDow + 6) % 7));
        const endDow = yearEnd.getDay();
        const endSunday = new Date(year, 11, 31 + ((7 - endDow) % 7 || 7));
        const totalDays = Math.round((endSunday.getTime() - startMonday.getTime()) / 86400000) + 1;
        const totalWeeks = Math.ceil(totalDays / 7);
=======
        // --- 区间边界（按模式），并向外对齐到整周 ---
        const rangeStartTime = rangeStart.getTime();
        const rangeEndTime = rangeEnd.getTime();
        const startMonday = startOfWeek(rangeStart);
        const endSunday = startOfWeek(rangeEnd);
        endSunday.setDate(endSunday.getDate() + 6);
        const totalDays = Math.round((endSunday.getTime() - startMonday.getTime()) / 86400000) + 1;
        const totalWeeks = Math.ceil(totalDays / 7);
>>>>>>> REPLACE
```
```main.js
<<<<<<< SEARCH
                if (cellTime < yearStartTime || cellTime > yearEndTime) {
=======
                if (cellTime < rangeStartTime || cellTime > rangeEndTime) {
>>>>>>> REPLACE
```
```main.js
<<<<<<< SEARCH
        foot.createSpan({ cls: 'ad-ns__window', text: t('home.heatmapAllYear', { year }) });
=======
        foot.createSpan({ cls: 'ad-ns__window', text: rangeLabel });
>>>>>>> REPLACE
```
- **原因**：把写死的「年内」判断换成模式区间；页脚显示当前模式的范围文字。
- ⚠️ **必须三处一起改**，否则 `yearStartTime` 未定义会直接报错（可用 `grep -c "yearStartTime\|yearEndTime" main.js` 校验，应为 **0**）。
- **布局说明**：`layoutHeatmap` 会自动按卡片宽度决定「显示最近 N 周」，所以季度/年模式在窄卡上仍会裁剪，属原有行为。

#### 18d — 灵感卡片：条数上限 + 刷新按钮

```main.js
<<<<<<< SEARCH
    async renderInspiration(board) {
        const card = this.getOrCreateCard(board, 'ad-card ad-b-inspiration');
        this.cardHead(card, '\u{1F4A1}', t('home.modules.inspiration'), '');
        const body = card.createDiv({ cls: 'ad-inspiration' });
        const s = this.plugin.settings;
        if (s.quickCapture?.writeMode === 'file') {
            body.createDiv({ cls: 'ad-empty--line', text: t('home.inspirationNeedDaily') });
            return;
        }
        const path = this.dailyMemoPath();
        const file = this.app.vault.getAbstractFileByPath(path);
        const memos = file instanceof obsidian.TFile
            ? this.parseMemos(await this.app.vault.cachedRead(file)) : [];
        if (!memos.length) {
            body.createDiv({ cls: 'ad-empty--line', text: t('home.memoListEmpty') });
            return;
        }
        const list = body.createDiv({ cls: 'ad-insp__list' });
        for (const m of [...memos].reverse().slice(0, 8)) {
            const item = list.createDiv({ cls: 'ad-insp__item' });
            item.createSpan({ cls: 'ad-insp__time', text: m.time });
            item.createSpan({ cls: 'ad-insp__text', text: m.text });
            item.addEventListener('click', () => void this.app.workspace.openLinkText(path, '', true));
        }
    }
=======
    async renderInspiration(board) {
        const card = this.getOrCreateCard(board, 'ad-card ad-b-inspiration');
        const limit = Math.max(1, this.plugin.settings.inspirationLimit ?? 20);
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'ad-insp__refresh';
        refreshBtn.textContent = '\u21BB';
        refreshBtn.title = t('home.refresh');
        this.cardHead(card, '\u{1F4A1}', t('home.modules.inspiration'), '', refreshBtn);
        const body = card.createDiv({ cls: 'ad-inspiration' });
        const paint = async (force) => {
            body.empty();
            const s = this.plugin.settings;
            if (s.quickCapture?.writeMode === 'file') {
                body.createDiv({ cls: 'ad-empty--line', text: t('home.inspirationNeedDaily') });
                return;
            }
            const path = this.dailyMemoPath();
            const file = this.app.vault.getAbstractFileByPath(path);
            if (!(file instanceof obsidian.TFile)) {
                body.createDiv({ cls: 'ad-empty--line', text: t('home.memoListEmpty') });
                return;
            }
            // 点刷新时用非缓存读取，确保拿到日记最新内容
            const raw = force ? await this.app.vault.read(file) : await this.app.vault.cachedRead(file);
            const memos = this.parseMemos(raw);
            if (!memos.length) {
                body.createDiv({ cls: 'ad-empty--line', text: t('home.memoListEmpty') });
                return;
            }
            const list = body.createDiv({ cls: 'ad-insp__list' });
            for (const m of [...memos].reverse().slice(0, limit)) {
                const item = list.createDiv({ cls: 'ad-insp__item' });
                item.createSpan({ cls: 'ad-insp__time', text: m.time });
                item.createSpan({ cls: 'ad-insp__text', text: m.text });
                item.addEventListener('click', () => void this.app.workspace.openLinkText(path, '', true));
            }
        };
        refreshBtn.addEventListener('click', () => void paint(true));
        await paint(false);
    }
>>>>>>> REPLACE
```
- **原因**：原来写死 `slice(0, 8)` 且无刷新。现改为设置项控制条数（默认 20），并用 `force` 区分刷新（非缓存读）与常规渲染（缓存读）。
- **注意**：`paint` 必须先定义、再给 `refreshBtn` 挂监听（避免 TDZ）；`cardHead` 要在 `body` 之前调用，否则标题会跑到内容下面。
- **依赖**：`dailyMemoPath` / `parseMemos`（§10 Thino 补丁）、`t('home.refresh')`、设置项 `inspirationLimit`。

#### 18e — 设置项与 i18n

```main.js
<<<<<<< SEARCH
    importTitle: '导入',
=======
    importTitle: '导入',
    inspirationLimit: 20,
    heatmapMode: 'year',
>>>>>>> REPLACE
```
```main.js
<<<<<<< SEARCH
        save: '保存', unsaved: '未保存',
=======
        save: '保存', unsaved: '未保存', refresh: '刷新',
        heatModeDay: '日', heatModeWeek: '周', heatModeQuarter: '季', heatModeYear: '年',
        heatRangeToday: '今日', heatRangeWeek: '本周', heatRangeQuarter: '本季度',
>>>>>>> REPLACE
```
（en 段：在 `save: 'Save',\n        unsaved: 'Unsaved',` 之后加 `refresh: 'Refresh',` 与 `heatModeDay: 'D', heatModeWeek: 'W', heatModeQuarter: 'Q', heatModeYear: 'Y',` / `heatRangeToday: 'Today', heatRangeWeek: 'This week', heatRangeQuarter: 'This quarter',`）
```main.js
<<<<<<< SEARCH
        if (typeof this.settings.importTitle !== 'string' || !this.settings.importTitle)
            { this.settings.importTitle = '导入'; changed = true; }
=======
        if (typeof this.settings.importTitle !== 'string' || !this.settings.importTitle)
            { this.settings.importTitle = '导入'; changed = true; }
        if (typeof this.settings.inspirationLimit !== 'number' || this.settings.inspirationLimit < 1)
            { this.settings.inspirationLimit = 20; changed = true; }
        if (!['day', 'week', 'quarter', 'year'].includes(this.settings.heatmapMode))
            { this.settings.heatmapMode = 'year'; changed = true; }
>>>>>>> REPLACE
```
- **原因**：默认值与旧 `data.json` 补齐。
- **说明**：`inspirationLimit` 与 `heatmapMode` **未做设置面板 UI**，直接改 `data.json` 即可（`heatmapMode` 点卡片上的按钮就会自动写入）。

#### 18f — styles.css

```styles.css
<<<<<<< SEARCH
.ad-inspiration { padding: 6px 10px 10px; }
.ad-insp__list { display: flex; flex-direction: column; gap: 2px; max-height: 150px; overflow-y: auto; }
=======
.ad-inspiration { padding: 6px 10px 10px; display: flex; flex-direction: column; flex: 1; min-height: 0; }
.ad-insp__list { display: flex; flex-direction: column; gap: 2px; flex: 1; min-height: 0; overflow-y: auto; }
.ad-insp__refresh { border: 1px solid var(--ad-line); border-radius: 4px; background: transparent; color: var(--ad-text-mute); font-size: 12px; line-height: 1; padding: 2px 6px; cursor: pointer; flex: 0 0 auto; transition: color .12s, border-color .12s; }
.ad-insp__refresh:hover { color: var(--ad-accent); border-color: var(--ad-accent); }

/* 热力图模式切换（日 / 周 / 季 / 年） */
.ad-ns__modes { display: flex; gap: 3px; margin-right: auto; margin-left: 10px; }
.ad-ns__mode {
  min-width: 20px; padding: 2px 6px; border: 1px solid var(--ad-line); border-radius: 4px;
  background: transparent; color: var(--ad-text-mute);
  font-family: var(--ad-font); font-size: 11px; line-height: 1.2; cursor: pointer;
  transition: color .12s, border-color .12s, background .12s;
}
.ad-ns__mode:hover { color: var(--ad-text); border-color: var(--ad-accent); }
.ad-ns__mode.is-active { color: var(--ad-on-accent); background: var(--ad-accent); border-color: var(--ad-accent); }
>>>>>>> REPLACE
```
- **原因**：把灵感列表从固定 `max-height:150px` 改为**填充卡片高度**（配合新增条数才看得到更多），并加刷新按钮与模式切换按钮样式。
- **依赖**：`--ad-line` / `--ad-accent` / `--ad-on-accent` 等内置变量。

### 块 19 — 「日」模式 = 最近 365 天每天亮格（与周/季/年统一走网格）

> 反馈：块 18 加了 4 模式，「日」最初只显示 1 个格子太空；先试过 24h 柱状图（专用视图），但用户明确要的是
> **「按天统计 = 365 天每天一个亮格、颜色深浅 = 当天笔记数」，不是按时间比例亮的柱状图**。
> 故废弃 24h 方案，把「日」改为**最近 365 天（滚动年）的 GitHub 风格网格**，与周/季/年共用同一套 7 行 × N 周列渲染（只改日期区间）。
>
> 重打顺序：块 13 → 14 → 15 → 16 → 17 → 18 → 本块 19。

#### 19a — renderHeatmap「日」模式区间改为滚动 365 天（替换块 18 的 `if (mode === 'day')` 单日分支）

```main.js
<<<<<<< SEARCH
        if (mode === 'day') {
            rangeStart = new Date(today);
            rangeEnd = new Date(today);
            rangeLabel = t('home.heatRangeToday');
        }
=======
        if (mode === 'day') {
            // 最近 365 天（滚动年）：每天一个亮格，颜色深浅 = 当天笔记数
            rangeStart = new Date(today);
            rangeStart.setDate(rangeStart.getDate() - 364);
            rangeEnd = new Date(today);
            rangeLabel = t('home.heatRangeDay');
        }
>>>>>>> REPLACE
```
- **原因**：把单日（1 格）改成滚动 365 天，正好满足「365 天每天亮格」的需求。后面 18c 会把这个区间对齐到整周（`startMonday`/`endSunday`），复用现有周列网格与 `layoutHeatmap`。
- **依赖**：无（区间变量后续由 18c 处理）。
- ⚠️ **不要再给日模式加 `return` / 专用渲染**——否则会回到 24h 柱状图（已废弃，见块 19c 说明）。

#### 19b — i18n（zh/en 各加 `heatRangeDay`，并清理块 18 误留的 24h 文案键）

```main.js
<<<<<<< SEARCH
        heatRangeToday: '今日', heatRangeWeek: '本周', heatRangeQuarter: '本季度',
        heatmapNow: '当前',
        dayEmpty: '今天还没写笔记',
=======
        heatRangeDay: '近365天', heatRangeWeek: '本周', heatRangeQuarter: '本季度',
>>>>>>> REPLACE
```
（en 段：把
```
        heatRangeToday: 'Today', heatRangeWeek: 'This week', heatRangeQuarter: 'This quarter',
        heatmapNow: 'Now',
        dayEmpty: 'No notes today yet',
```
改为
```
        heatRangeDay: 'Last 365d', heatRangeWeek: 'This week', heatRangeQuarter: 'This quarter',
```
）
- **原因**：`heatRangeToday`/`heatmapNow`/`dayEmpty` 是 24h 方案遗留、已无引用，删除避免死键；新增 `heatRangeDay` 作为「日」模式页脚范围文字。

#### 19c — 已废弃：24h 柱状图（`renderHeatmapDay` / `getVaultHourlyCounts` / `.ad-ns__day` 样式）已全部删除

> 下列代码在「日」模式第一版（24h 柱状图）里新增，本次已**整体删除**，请勿还原：
> - `DashboardView.getVaultHourlyCounts(todayKey)`（按小时聚合）
> - `DashboardView.renderHeatmapDay(...)`（24 根柱 + 今日笔记列表专用视图）
> - `renderHeatmap` 里 `if (mode === 'day') { this.renderHeatmapDay(...); return; }` 提前 return
> - i18n `heatmapNow` / `dayEmpty`
> - styles.css `.ad-ns__day` / `.ad-day__*` 全部样式
>
> 校验：`grep -c "renderHeatmapDay\|getVaultHourlyCounts\|ad-ns__day\|heatmapNow\|dayEmpty\|heatRangeToday" main.js` 应为 **0**；
> 网格路径 `grep -c "startMonday = startOfWeek(rangeStart)" main.js` 应为 **≥1**。

### 块 20 — 首页新增「Git 提交热力图」模块（读 `git log`，复用 7×N 周网格，独立 `adGit*` 状态）

> 1. 在 Xove Dashboard 首页新增独立卡片「Git 提交」，统计**当前 vault 仓库**（mutiply3）的每日 commit 数，画成与笔记统计同款的 GitHub 风格 7 行 × N 周网格（最近 365 天滚动年）。
> 2. 数据源用 `require('child_process').execFileSync('git', ['log', ...])` 读取 `git log --pretty=format:%ad --date=short` 按日期聚合。桌面端 Obsidian 插件可 `require('child_process')`（obsidian-git 同款）；已包 try/catch，非 git 仓库/无 git 时卡片显示提示而非崩溃。
> 3. 复用 `calcRangeStats` / `fmtDate` / `startOfWeek` / `tArr('home.heatDow')` / `l1..l4` 等级样式 / `--hm-cgap·rgap`，不重复造轮子。
> 4. ⚠️ 关键点：`layoutHeatmap` 共享 `this.adHm*` 状态与单一 `ResizeObserver`，两个卡片会**冲突**，故复制成独立的 `layoutGitHeatmap`（用 `this.adGit*` 状态 + 独立 observer）。**切勿直接调用 `this.layoutHeatmap`**。

#### 20a — i18n（zh）：modules + home 文案

```main.js
<<<<<<< SEARCH
            heatmap: '笔记统计', countdown: '倒计时', pomodoro: '番茄钟',
            mirror: '笔记映射',
=======
            heatmap: '笔记统计', countdown: '倒计时', pomodoro: '番茄钟',
            mirror: '笔记映射', githeat: 'Git 提交',
>>>>>>> REPLACE
```

（紧随 `cellNotes: '{m}-{d} · {n} 篇笔记',` 之后追加：）
```main.js
<<<<<<< SEARCH
        cellNotes: '{m}-{d} · {n} 篇笔记',
=======
        cellNotes: '{m}-{d} · {n} 篇笔记',
        cellCommits: '{m}-{d} · {n} 次提交',
        gitNotRepo: '当前仓库不是 git 仓库（无法显示提交热力图）',
        gitError: '无法读取 git 提交：请确认 git 已安装且在 PATH 中',
        gitRefresh: '刷新',
        gitRefreshTitle: '重新读取 git log',
        gitRange: '近 365 天',
>>>>>>> REPLACE
```

#### 20b — i18n（en）：同上

```main.js
<<<<<<< SEARCH
            heatmap: 'Note stats', countdown: 'Countdown', pomodoro: 'Pomodoro',
            mirror: 'Note mirror',
=======
            heatmap: 'Note stats', countdown: 'Countdown', pomodoro: 'Pomodoro',
            mirror: 'Note mirror', githeat: 'Git commits',
>>>>>>> REPLACE
```

（紧随 `cellNotes: '{m}-{d} · {n} notes',` 之后追加：）
```main.js
<<<<<<< SEARCH
        cellNotes: '{m}-{d} · {n} notes',
=======
        cellNotes: '{m}-{d} · {n} notes',
        cellCommits: '{m}-{d} · {n} commits',
        gitNotRepo: 'Current vault is not a git repo (cannot show commit heatmap)',
        gitError: 'Cannot read git log: ensure git is installed and in PATH',
        gitRefresh: 'Refresh',
        gitRefreshTitle: 'Re-read git log',
        gitRange: 'Last 365 days',
>>>>>>> REPLACE
```

#### 20c — MIN_COLS / MIN_RATIO 注册 githeat

```main.js
<<<<<<< SEARCH
    'projects': 2, // 项目情况：最低宽度 2 格
    'heatmap': 2, // 笔记统计：最低宽度 2 格（2×1 走窄版间距 + 自适应窗口）
};
=======
    'projects': 2, // 项目情况：最低宽度 2 格
    'heatmap': 2, // 笔记统计：最低宽度 2 格（2×1 走窄版间距 + 自适应窗口）
    'githeat': 2, // Git 提交热力图：最低宽度 2 格
};
>>>>>>> REPLACE
```

```main.js
<<<<<<< SEARCH
    'projects': 2, // 项目情况：最低 2:1
    'heatmap': 3, // 笔记统计：最低 3:1
};
=======
    'projects': 2, // 项目情况：最低 2:1
    'heatmap': 3, // 笔记统计：最低 3:1
    'githeat': 3, // Git 提交热力图：最低 3:1
};
>>>>>>> REPLACE
```

#### 20d — 渲染注册表 + DEFAULT_SETTINGS.homeModules + DEFAULT_HOME_MODULES

```main.js
<<<<<<< SEARCH
            { id: 'inspiration', title: t('home.modules.inspiration'), cardCls: 'ad-card ad-b-inspiration', live: false, render: (b) => void this.renderInspiration(b) },
        ];
=======
            { id: 'inspiration', title: t('home.modules.inspiration'), cardCls: 'ad-card ad-b-inspiration', live: false, render: (b) => void this.renderInspiration(b) },
            { id: 'githeat', title: t('home.modules.githeat'), cardCls: 'ad-card ad-b-githeat', live: false, render: (b) => this.renderGitHeatmap(b) },
        ];
>>>>>>> REPLACE
```

（DEFAULT_SETTINGS.homeModules 末尾，`/* md 映射卡片` 注释前：）
```main.js
<<<<<<< SEARCH
        { id: 'inspiration', enabled: false, order: 16, cols: 1, rows: 2 },
    ],
    /* md 映射卡片
=======
        { id: 'inspiration', enabled: false, order: 16, cols: 1, rows: 2 },
        { id: 'githeat', enabled: false, order: 17, cols: 3, rows: 1 },
    ],
    /* md 映射卡片
>>>>>>> REPLACE
```

（DEFAULT_HOME_MODULES 末尾，`/* ---- helpers ---- */` 注释前：）
```main.js
<<<<<<< SEARCH
        { id: 'inspiration', enabled: false, order: 16, cols: 1, rows: 2 },
    ];
    /* ---- helpers ---- */
=======
        { id: 'inspiration', enabled: false, order: 16, cols: 1, rows: 2 },
        { id: 'githeat', enabled: false, order: 17, cols: 3, rows: 1 },
    ];
    /* ---- helpers ---- */
>>>>>>> REPLACE
```

#### 20e — 新增 `getVaultGitCounts()`（插在 `getVaultNoteCounts` 之后、`scheduleHeatmapRefresh` 之前）

```main.js
<<<<<<< SEARCH
        return counts;
    }
    scheduleHeatmapRefresh() {
=======
        return counts;
    }
    /* ---- Vault git commit counts by date (reads `git log` of the vault repo) ---- */
    getVaultGitCounts() {
        const counts = new Map();
        this.adGitError = null;
        try {
            const cp = (typeof require !== 'undefined') ? require('child_process') : null;
            if (!cp) {
                this.adGitError = 'exec-error';
                return counts;
            }
            const base = this.app.vault.adapter.basePath;
            let root = base;
            try {
                root = cp.execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: base, encoding: 'utf8', timeout: 5000 }).trim();
            }
            catch (e) {
                this.adGitError = 'not-repo';
                return counts;
            }
            const out = cp.execFileSync('git', ['log', '--pretty=format:%ad', '--date=short'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 20000 });
            const re = /(\d{4}-\d{2}-\d{2})/g;
            let m;
            while ((m = re.exec(out)) !== null) {
                const d = m[1];
                counts.set(d, (counts.get(d) ?? 0) + 1);
            }
        }
        catch (e) {
            console.error('[Xove] git heatmap failed:', e);
            this.adGitError = 'exec-error';
        }
        return counts;
    }
    scheduleHeatmapRefresh() {
>>>>>>> REPLACE
```

#### 20f — 新增 `renderGitHeatmap` + 独立 `layoutGitHeatmap`（整体插入到 `layoutHeatmap` 方法的结束 `}` 与 `/* ---- Pomodoro（番茄钟：单实例卡片） ---- */` 之间）

```main.js
    /* ---- Git commit heatmap (reads `git log` of the vault repo) ---- */
    renderGitHeatmap(board) {
        const card = this.getOrCreateCard(board, 'ad-card ad-b-githeat');
        this.gitHeatCard = card;
        card.setAttribute('data-mod', 'githeat');
        const hm = this.plugin.settings.homeModules?.find((x) => x.id === 'githeat');
        this.applyCardSpan(card, hm?.cols, hm?.rows);
        this.adGitError = null;
        const gitCounts = this.getVaultGitCounts();
        if (this.adGitError) {
            const head = card.createDiv({ cls: 'ad-card__head' });
            const h3 = head.createEl('h3', { cls: 'ad-card__title' });
            h3.createSpan({ cls: 'ad-marker', text: '\u{1F33F}' });
            h3.appendText(t('home.modules.githeat'));
            const tip = card.createDiv({ cls: 'ad-git__tip' });
            tip.setText(this.adGitError === 'not-repo' ? t('home.gitNotRepo') : t('home.gitError'));
            return;
        }
        const today = new Date();
        const todayTime = today.getTime();
        const todayKey = fmtDate(today);
        const rangeStart = new Date(today);
        rangeStart.setDate(rangeStart.getDate() - 364);
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = new Date(today);
        rangeEnd.setHours(0, 0, 0, 0);
        const stats = calcRangeStats(gitCounts, fmtDate(rangeStart), fmtDate(rangeEnd), today);
        const head = card.createDiv({ cls: 'ad-card__head' });
        const h3 = head.createEl('h3', { cls: 'ad-card__title' });
        h3.createSpan({ cls: 'ad-marker', text: '\u{1F33F}' });
        h3.appendText(t('home.modules.githeat'));
        const refreshBtn = head.createEl('button', { cls: 'ad-ns__mode', text: t('home.gitRefresh') });
        refreshBtn.title = t('home.gitRefreshTitle');
        refreshBtn.addEventListener('click', () => this.renderGitHeatmap(board));
        const nsHead = head.createDiv({ cls: 'ad-ns__head' });
        nsHead.createDiv({ cls: 'ad-ns__big', text: String(stats.total) });
        const small = nsHead.createDiv({ cls: 'ad-ns__small' });
        small.createDiv({ cls: 'ad-ns__active', text: t('home.daysActive', { n: stats.active }) });
        const streak = small.createDiv({ cls: 'ad-ns__streak' });
        streak.appendText(t('home.streakPrefix'));
        streak.createEl('strong', { text: String(stats.streak) });
        streak.appendText(t('home.daysSuffix'));
        const rangeStartTime = rangeStart.getTime();
        const rangeEndTime = rangeEnd.getTime();
        const startMonday = startOfWeek(rangeStart);
        const endSunday = startOfWeek(rangeEnd);
        endSunday.setDate(endSunday.getDate() + 6);
        const totalDays = Math.round((endSunday.getTime() - startMonday.getTime()) / 86400000) + 1;
        const totalWeeks = Math.ceil(totalDays / 7);
        const heat = card.createDiv({ cls: 'ad-ns__heat' });
        heat.createDiv({ cls: 'ad-ns__months' });
        const startMs = startMonday.getTime();
        const weekMonths = [];
        for (let w = 0; w < totalWeeks; w++) {
            const thu = new Date(startMs + (w * 7 + 3) * 86400000);
            weekMonths.push(thu.getMonth());
        }
        this.adGitWeekMonths = weekMonths;
        this.adGitYear = today.getFullYear();
        this.adGitKey = '';
        const grid = heat.createDiv({ cls: 'ad-ns__grid' });
        const dow = grid.createDiv({ cls: 'ad-ns__dow' });
        tArr('home.heatDow').forEach((lab) => dow.createSpan({ text: lab }));
        const cells = grid.createDiv({ cls: 'ad-ns__cells' });
        for (let w = 0; w < totalWeeks; w++) {
            for (let r = 0; r < 7; r++) {
                const cellDate = new Date(startMs + (w * 7 + r) * 86400000);
                const cellTime = cellDate.getTime();
                const cell = cells.createDiv({ cls: 'ad-ns__cell' });
                if (cellTime < rangeStartTime || cellTime > rangeEndTime) {
                    cell.addClass('ad-ns__cell--empty');
                    continue;
                }
                const dateStr = fmtDate(cellDate);
                const count = gitCounts.get(dateStr) ?? 0;
                const isFuture = cellTime > todayTime;
                if (!isFuture && count > 0) {
                    if (count === 1)
                        cell.addClass('l1');
                    else if (count <= 3)
                        cell.addClass('l2');
                    else if (count <= 6)
                        cell.addClass('l3');
                    else
                        cell.addClass('l4');
                }
                if (isFuture)
                    cell.addClass('is-future');
                if (dateStr === todayKey)
                    cell.addClass('is-today');
                const mm = String(cellDate.getMonth() + 1).padStart(2, '0');
                const dd = String(cellDate.getDate()).padStart(2, '0');
                cell.title = isFuture ? t('home.cellFuture', { m: mm, d: dd }) : t('home.cellCommits', { m: mm, d: dd, n: count });
            }
        }
        const foot = card.createDiv({ cls: 'ad-ns__foot' });
        foot.createSpan({ cls: 'ad-ns__window', text: t('home.gitRange') });
        const legend = foot.createSpan({ cls: 'ad-ns__legend' });
        legend.createSpan({ cls: 'ad-ns__lbl', text: t('home.legendFew') });
        ['', 'l1', 'l2', 'l3', 'l4'].forEach((lv) => {
            legend.createSpan({ cls: 'ad-ns__sw' + (lv ? ' ' + lv : '') });
        });
        legend.createSpan({ cls: 'ad-ns__lbl', text: t('home.legendMany') });
        this.layoutGitHeatmap(card);
        if (this.adGitObsTarget !== heat) {
            this.adGitObs?.disconnect();
            this.adGitObs = new ResizeObserver(() => {
                if (this.gitHeatCard)
                    this.layoutGitHeatmap(this.gitHeatCard);
            });
            this.adGitObs.observe(heat);
            this.adGitObsTarget = heat;
        }
    }
    /* ---- Git commit heatmap layout (独立 adGit* 状态，避免与笔记热力图冲突) ---- */
    layoutGitHeatmap(card) {
        const heat = card.querySelector('.ad-ns__heat');
        const cells = card.querySelector('.ad-ns__cells');
        const dow = card.querySelector('.ad-ns__dow');
        const monthsRow = card.querySelector('.ad-ns__months');
        if (!heat || !cells || !dow || !monthsRow)
            return;
        const total = this.adGitWeekMonths.length;
        if (total === 0)
            return;
        const availW = Math.max(HM_CELL * HM_MIN_WEEKS, heat.clientWidth - HM_DOW_W);
        let weeks = Math.floor((availW + HM_GAP_MIN) / (HM_CELL + HM_GAP_MIN));
        weeks = Math.max(HM_MIN_WEEKS, Math.min(total, weeks));
        let cgap = weeks > 1 ? (availW - weeks * HM_CELL) / (weeks - 1) : HM_GAP_MIN;
        cgap = Math.max(HM_GAP_MIN, Math.min(HM_GAP_MAX, Math.round(cgap * 10) / 10));
        const availH = heat.clientHeight - monthsRow.offsetHeight - 10;
        let rgap = (availH - 7 * HM_CELL) / 6;
        rgap = Math.max(HM_GAP_MIN, Math.min(HM_GAP_MAX, Math.round(rgap * 10) / 10));
        const key = `${weeks}|${cgap}|${rgap}`;
        if (key === this.adGitKey)
            return;
        this.adGitKey = key;
        cells.style.setProperty('--hm-cgap', cgap + 'px');
        cells.style.setProperty('--hm-rgap', rgap + 'px');
        dow.style.setProperty('--hm-rgap', rgap + 'px');
        const gridEl = cells.parentElement;
        const gridGap = gridEl ? (parseFloat(getComputedStyle(gridEl).columnGap) || 4) : 4;
        monthsRow.style.paddingLeft = (dow.offsetWidth + gridGap) + 'px';
        const hiddenCells = (total - weeks) * 7;
        const kids = cells.children;
        for (let i = 0; i < kids.length; i++) {
            kids[i].style.display = i < hiddenCells ? 'none' : '';
        }
        const monthNames = tArr('status.months');
        const visible = this.adGitWeekMonths.slice(total - weeks);
        monthsRow.empty();
        const unit = HM_CELL + cgap;
        let curM = visible[0] ?? 0;
        let curS = 1;
        const flush = (m, span) => {
            const label = monthsRow.createSpan({ text: monthNames[m] ?? '' });
            label.style.minWidth = (span * unit) + 'px';
        };
        for (let w = 1; w < visible.length; w++) {
            const m = visible[w] ?? curM;
            if (m === curM) {
                curS++;
                continue;
            }
            flush(curM, curS);
            curM = m;
            curS = 1;
        }
        flush(curM, curS);
        const win = card.querySelector('.ad-ns__window');
        if (win)
            win.setText(weeks >= total ? t('home.heatmapAllYear', { year: this.adGitYear }) : t('home.heatmapRecent', { n: weeks }));
    }
```

#### 20g — styles.css 配色 + 提示

```css
<<<<<<< SEARCH
.ad-b-heatmap      { --mod: #06B6D4; }  /* 笔记统计 · 青 */
=======
.ad-b-heatmap      { --mod: #06B6D4; }  /* 笔记统计 · 青 */
.ad-b-githeat      { --mod: #10B981; }  /* Git 提交热力图 · 绿 */
.ad-git__tip       { padding: 12px; color: var(--text-muted); font-size: 12px; line-height: 1.6; }
>>>>>>> REPLACE
```

- **校验清单**：
  - `grep -c "renderGitHeatmap" main.js` 应为 **≥3**（定义 + 注册表 + 刷新按钮）
  - `grep -c "getVaultGitCounts" main.js` 应为 **≥2**
  - `grep -c "layoutGitHeatmap" main.js` 应为 **≥3**
  - `grep -c "ad-b-githeat" main.js` 应为 **≥1**
  - 卡片默认 `enabled: false`，需在首页「＋ 添加卡片」里手动启用（或把 `data.json` 里 `githeat.enabled` 改 `true`）
  - ⚠️ 强风险：与笔记热力图共用 `layoutHeatmap` 会串状态 → 必须用独立 `layoutGitHeatmap`；桌面端才有 `child_process`，移动端/无 git 显示提示不崩溃

### 9.2 重打后校验

1. 每块打完不要求即时验证；全部完成后执行：
   ```bash
   cd .obsidian/plugins/xove-dashboard && node --check main.js && echo SYNTAX_OK
   ```
2. 启动前再做一次顶层加载自检（stub 掉 `obsidian` + `require` 后 `new Function(src)()` 输出 `TOPLEVEL_OK`），确认无 TDZ（块 3 生效）。
3. 重载 Obsidian：首页「＋ 添加卡片」应出现 **每日一言 / 最近编辑 / 快捷链接 / 目标进度** 四项；打卡清单页布局正常（卡片不被压扁）。
4. 行号仅作 v0.3.1 参考；所有块都以「唯一锚点字符串」定位，插件更新后只要锚点字符串未变即可直接套用。若某锚点因插件大改而不存在，需回到对应小节（§8.7/8.8/8.9/§10）按方法名重定位。

---

## 10. Thino 闪念互通补丁（并入本文件）

> 原独立文件 `xove-thino-patch_2026-09-01.md` 已并入本文件并删除。
> 适用版本：Xove Dashboard **0.3.1** / Thino（obsidian-memos）**3.0.30**。
> 重打方式与本文件 §9 一致（以函数名/关键字定位，行号仅参考）。修改文件：`main.js`、`styles.css`（编译产物，更新即覆盖）。

### 10.1 背景与修改原因

Xove Dashboard 的「快速捕捉」原本用 `vault.create()` **新建独立文件**，且写入的是裸文本（无时间戳前缀）。而 Thino 的判定规则是：只有匹配 `- HH:mm 内容` 开头的列表项才算一条 memo，多行续行以 tab 缩进。两者格式不兼容，导致：

1. 当天日记已存在时，`vault.create()` 必然失败（即 `⚠️ Capture failed`）；
2. 即使写进去，Thino 也解析不出时间戳，**两边数据不互通**。

用户的「捕捉存储路径」已指向 `thino/2026`、`命名规则=YYYY-MM-DD`，方向与 Thino 的 Journal 完全一致，只差写入格式与读取逻辑。本补丁把 Xove 捕捉改造为**追加一行 `- HH:mm 内容` 到当日日记**，并新增读取逻辑，使两侧共用同一份数据。

> 注：用户口述中的 "discard 方案" 即指本补丁（命名为互通补丁）。

### 10.2 核心逻辑（4 项改动）

1. **快速捕捉 → 追加到当日日记（Thino 格式）**
   新增设置项 `writeMode`：`daily`（默认，追加到日记）/ `file`（保留原行为新建文件）。
   daily 模式下写入 `thino/2026/YYYY-MM-DD.md`，格式 `- HH:mm 内容`，多行 tab 续行。

2. **首页「今日闪念」列表（双向可见）**
   快速捕捉卡下方读取当日日记的全部 memo 并渲染；**Thino 录入的条目同样可见**，点击跳转日记。

3. **灵感看板「⟲ 从日记拾取」**
   看板右上角按钮，扫描日记文件夹，把正文含 `boardImportTag`（默认 `#灵感`）的 memo 导入看板第一个阶段（收集箱）。
   用 `<!-- memo: 路径#HH:mm -->` 指纹注释去重，重复点击不会重复导入。

4. **设置面板补充开关**
   捕捉写入模式、首页显示今日闪念、闪念拾取标签三个控件 + 中英文字典。

### 10.3 涉及的代码位置（main.js，按函数名定位）

| 函数 / 关键字 | 0.3.1 行号 | 文件 | 作用 |
|---|---|---|---|
| `DEFAULT_SETTINGS`（含 `quickCapture` 对象） | ~ 前段 | main.js | 新增 `quickCapture.writeMode`、`memoShowOnHome`、`boardImportTag` 默认值 |
| `normalizeSettings()` | 10547 | main.js | 浅合并会丢失嵌套默认值，此处补齐新字段 |
| `createCaptureNote()` | 7215 | main.js | 按 `writeMode` 分流 |
| `dailyMemoPath()` | 7246 | main.js | 计算当日日记路径（新增） |
| `buildMemoLine()` | 7257 | main.js | 文本 → `- HH:mm 内容`（新增） |
| `parseMemos()` | 7271 | main.js | 日记正文 → memo 数组（新增） |
| `appendMemoToDaily()` | 7303 | main.js | 追加 memo 到当日日记（新增） |
| `renderQuickCapture()` | 7115 | main.js | 加 memo 列表容器 + 提交后刷新 |
| `renderMemoList()` | 7154 | main.js | 渲染今日闪念列表（新增） |
| `op-import-btn`（看板 `renderPanels`/`renderTabs` 工具条） | 3351 | main.js | 新增「从日记拾取」按钮 |
| `importMemosFromDaily()` | 3778 | main.js | 拾取逻辑（新增，位于 `OpportunityBoard` 类内） |
| `memoFingerprintOf()` | 3761 | main.js | 从备注还原去重指纹（新增） |
| `memoTitleOf()` | 3768 | main.js | memo → 看板标题（新增） |
| `DashboardSettingTab.display()` | ~ 中段 | main.js | 设置面板新增 3 个控件 |
| i18n `const zh = {` / `const en = {` | 11 / 299 | main.js | 新增 19 个文案 key |
| `.ad-memo*` / `.op-import-btn` | — | styles.css | 新增样式 |

**快速定位命令**（插件更新后用这些确认锚点是否还在）：
```bash
cd .obsidian/plugins/xove-dashboard
grep -n "async createCaptureNote" main.js
grep -n "dailyMemoPath(" main.js
grep -n "parseMemos(" main.js
grep -n "renderMemoList(" main.js
grep -n "importMemosFromDaily" main.js
grep -n "op-import-btn" main.js
```

### 10.4 完整补丁

> 下列代码块为 0.3.1 中**已写入的最终源码**，直接复制到对应位置即可。若更新后上下文（前后代码）有变化，以"在何处插入"的描述为准微调。

#### 10.4.1 DEFAULT_SETTINGS：新增字段
定位 `quickCapture: {` 对象（`main.js` 中 `DEFAULT_SETTINGS` 内），在其 `templateFile: ''` 后增加 `writeMode`，并在 `quickCapture` 对象外（同层级）增加 `memoShowOnHome`、`boardImportTag`：
```js
    quickCapture: {
        storagePath: '00 inbox/速记',
        namingPattern: 'YYYY-MM-DD HH-mm 捕捉',
        templateFile: '',
        writeMode: 'daily',
    },
    memoShowOnHome: true,
    boardImportTag: '#灵感',
```

#### 10.4.2 normalizeSettings()：补齐默认值（防浅合并丢字段）
在 `normalizeSettings()` 的「3) 看板默认名随语言」之后、`if (changed)` 之前插入：
```js
        // 4) 闪念互通相关字段：旧 data.json 缺失时补默认值。
        //    ⚠️ loadSettings 用的是浅合并，loaded.quickCapture 会整体覆盖默认值，
        //       因此新增的嵌套字段必须在这里补齐，否则老用户读到 undefined。
        if (!this.settings.quickCapture || typeof this.settings.quickCapture !== 'object') {
            this.settings.quickCapture = { ...DEFAULT_SETTINGS.quickCapture };
            changed = true;
        }
        if (this.settings.quickCapture.writeMode !== 'daily' && this.settings.quickCapture.writeMode !== 'file') {
            this.settings.quickCapture.writeMode = 'daily';
            changed = true;
        }
        if (typeof this.settings.memoShowOnHome !== 'boolean') {
            this.settings.memoShowOnHome = true;
            changed = true;
        }
        if (typeof this.settings.boardImportTag !== 'string') {
            this.settings.boardImportTag = getLang() === 'en' ? '#idea' : '#灵感';
            changed = true;
        }
```

#### 10.4.3 createCaptureNote 改造 + 新增 4 个方法（位于 `DashboardView` 类内）
把原 `createCaptureNote` 改成按 `writeMode` 分流，并在其后（原 `/* ---- Create diary note ---- */` 注释之前）插入 4 个新方法：
```js
    async createCaptureNote(content) {
        const qc = this.plugin.settings.quickCapture;
        const now = new Date();
        // 「追加到日记」：按 Thino(memos) 的 - HH:mm 格式写入当日日记，两边数据天然互通
        if (qc.writeMode !== 'file')
            return this.appendMemoToDaily(content, now);
        // Ensure folder exists
        const folderPath = qc.storagePath;
        await this.ensureFolder(folderPath);
        // Generate filename
        const filename = this.applyNamingPattern(qc.namingPattern, now);
        const filepath = `${folderPath}/${filename}.md`;
        // Build content: template or plain
        let fileContent = content;
        if (qc.templateFile) {
            const tplPath = this.resolveTemplatePath(qc.templateFile);
            const tplFile = this.app.vault.getAbstractFileByPath(tplPath);
            if (tplFile instanceof obsidian.TFile) {
                const tpl = await this.app.vault.read(tplFile);
                fileContent = this.applyTemplate(tpl, content, filename, now);
            }
        }
        await this.app.vault.create(filepath, fileContent);
    }
    /* ============================================================
       闪念（memo）— 与 Thino / obsidian-memos 共用同一份日记数据
       格式约定：首行 `- HH:mm 内容`，续行以 tab 缩进。
       ============================================================ */
    dailyMemoPath(now = new Date()) {
        const qc = this.plugin.settings.quickCapture;
        const folder = (qc.storagePath || '').trim().replace(/\/+$/, '');
        // daily 模式必须「一天一个文件」：命名规则里若带时间占位符，
        // 每次捕捉都会算出不同文件名 → 退化成新建独立文件，与日记语义矛盾。
        const raw = (qc.namingPattern || 'YYYY-MM-DD').trim();
        const pattern = /HH|hh|mm|ss|SS/.test(raw) ? 'YYYY-MM-DD' : raw;
        const filename = this.applyNamingPattern(pattern, now) || 'YYYY-MM-DD';
        return folder ? `${folder}/${filename}.md` : `${filename}.md`;
    }
    buildMemoLine(content, d) {
        const pad = (n) => String(n).padStart(2, '0');
        const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        const lines = content.replace(/\r\n?/g, '\n').split('\n');
        const first = (lines.shift() ?? '').trim();
        const rest = lines.map((l) => l.trim()).filter((l) => l !== '');
        const head = (first ? `- ${time} ${first}` : `- ${time}`).replace(/[ \t]+$/, '');
        return [head, ...rest.map((l) => `\t${l}`)].join('\n');
    }
    parseMemos(text) {
        const out = [];
        let cur = null;
        const flush = () => {
            if (cur) out.push(cur);
            cur = null;
        };
        for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
            const m = /^\s*[-*+]\s+(\d{1,2}:\d{2})(?:\s+(.*))?$/.exec(raw);
            if (m) {
                flush();
                const head = (m[2] ?? '').trim();
                cur = { time: m[1], text: head, body: head ? [head] : [] };
                continue;
            }
            if (!cur) continue;
            const seg = raw.trim();
            if (seg === '' || !/^(\t| {2,})\S/.test(raw)) flush();
            else {
                cur.body.push(seg);
                cur.text = cur.text ? `${cur.text} ${seg}` : seg;
            }
        }
        flush();
        return out;
    }
    async appendMemoToDaily(content, now = new Date()) {
        const qc = this.plugin.settings.quickCapture;
        const folder = (qc.storagePath || '').trim().replace(/\/+$/, '');
        await this.ensureFolder(folder);
        const filepath = this.dailyMemoPath(now);
        const line = this.buildMemoLine(content, now);
        const existing = this.app.vault.getAbstractFileByPath(filepath);
        if (existing instanceof obsidian.TFile) {
            const cur = await this.app.vault.read(existing);
            if (cur.includes(line)) {
                this.showToast(t('home.memoListDup'));
                return false;
            }
            const sep = cur.endsWith('\n') ? '' : '\n';
            await this.app.vault.modify(existing, cur + sep + line + '\n');
            return true;
        }
        let init = '';
        if (qc.templateFile) {
            const tplPath = this.resolveTemplatePath(qc.templateFile);
            const tplFile = this.app.vault.getAbstractFileByPath(tplPath);
            if (tplFile instanceof obsidian.TFile) {
                const tpl = await this.app.vault.read(tplFile);
                const filename = filepath.replace(/^.*\//, '').replace(/\.md$/, '');
                init = this.applyTemplate(tpl, '', filename, now);
            }
        }
        const body = init ? `${init.replace(/\s+$/, '')}\n\n${line}\n` : `${line}\n`;
        await this.app.vault.create(filepath, body);
        return true;
    }
```

#### 10.4.4 renderQuickCapture + 新增 renderMemoList
在 `renderQuickCapture` 的 `const cta = ...` 之后（`cta` 与 `submit` 之间）插入 memo 容器与刷新闭包，并在 `cta.addEventListener(...)` 之后调用 `refreshMemos()`；在 `renderQuickCapture` 方法结束后新增 `renderMemoList`。完整替换后的 `renderQuickCapture` 如下（关键差异：新增 `memoBox` / `refreshMemos` / 提交后调用）：
```js
    renderQuickCapture(board) {
        const card = this.getOrCreateCard(board, 'ad-card ad-b-capture');
        this.cardHead(card, '\u25C6', t('home.modules.quickCapture'));
        const qc = card.createDiv({ cls: 'ad-qc' });
        const area = qc.createEl('textarea', {
            cls: 'ad-qc__area',
            attr: { rows: '3', placeholder: t('home.quickCapturePlaceholder') },
        });
        const row = qc.createDiv({ cls: 'ad-qc__row' });
        const cta = row.createEl('button', { cls: 'ad-qc__cta', text: t('home.captureBtn') });
        // 今日闪念：直接读当日日记（与 Thino 共用同一份数据），最新在最上
        const memoBox = card.createDiv({ cls: 'ad-memo' });
        const refreshMemos = () => void this.renderMemoList(memoBox);
        const submit = async () => {
            const content = area.value.trim();
            if (!content) { area.focus(); return; }
            cta.addClass('flash');
            try {
                await this.createCaptureNote(content);
                area.value = '';
                this.showToast(t('home.capturedToast'));
                refreshMemos();
            } catch (err) {
                console.error('[Dashboard] 快速捕捉失败', err);
                this.showToast(t('home.captureFailed'), 'error');
            } finally {
                window.setTimeout(() => cta.removeClass('flash'), 400);
            }
        };
        cta.addEventListener('click', () => void submit());
        refreshMemos();
    }
    async renderMemoList(box) {
        if (!box) return;
        const s = this.plugin.settings;
        if (!s.memoShowOnHome || s.quickCapture.writeMode === 'file') { box.empty(); return; }
        const path = this.dailyMemoPath();
        const file = this.app.vault.getAbstractFileByPath(path);
        const memos = file instanceof obsidian.TFile
            ? this.parseMemos(await this.app.vault.cachedRead(file)) : [];
        box.empty();
        const head = box.createDiv({ cls: 'ad-memo__head' });
        head.createSpan({ cls: 'ad-memo__title', text: t('home.memoListTitle') });
        head.createSpan({ cls: 'ad-memo__count', text: t('home.memoListCount', { n: String(memos.length) }) });
        const openBtn = head.createEl('button', { cls: 'ad-memo__open', text: t('home.memoListOpen') });
        openBtn.addEventListener('click', () => void this.app.workspace.openLinkText(path, '', true));
        const list = box.createDiv({ cls: 'ad-memo__list' });
        if (!memos.length) { list.createDiv({ cls: 'ad-memo__empty', text: t('home.memoListEmpty') }); return; }
        for (const m of [...memos].reverse()) {
            const item = list.createDiv({ cls: 'ad-memo__item' });
            item.createSpan({ cls: 'ad-memo__time', text: m.time });
            item.createSpan({ cls: 'ad-memo__text', text: m.text });
            item.addEventListener('click', () => void this.app.workspace.openLinkText(path, '', true));
        }
    }
```

#### 10.4.5 看板「从日记拾取」按钮 + 3 个方法（位于 `OpportunityBoard` 类内）
在 `renderPanels`/`renderTabs` 中 `newBtn`（op-new-btn）之后插入（仅 daily 模式显示）：
```js
        if (this.host.plugin.settings.quickCapture.writeMode !== 'file') {
            const importBtn = tabs.createEl('button', { cls: 'po-add-btn op-import-btn', text: t('modal.opImportFromDaily') });
            importBtn.addEventListener('click', (e) => { e.stopPropagation(); void this.importMemosFromDaily(); });
        }
```
在 `createItem()` 方法之后插入 3 个方法：
```js
    memoFingerprintOf(notes) {
        const m = /<!--\s*memo:\s*([^>\n]+?)\s*-->/.exec(notes || '');
        return m ? m[1].trim() : '';
    }
    memoTitleOf(memo) {
        const raw = (memo.text || '')
            .replace(/#[\w一-龥/-]+/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!raw) return memo.time;
        return raw.length > 40 ? `${raw.slice(0, 40)}…` : raw;
    }
    async importMemosFromDaily() {
        const s = this.host.plugin.settings;
        const folder = (s.quickCapture.storagePath || '').trim().replace(/\/+$/, '');
        if (!folder) { this.host.showToast(t('modal.opImportNoFolder'), 'error'); return; }
        const tag = (s.boardImportTag || '').trim();
        const stage = this.stageLabels()[0] ?? '收集箱';
        this.host.showToast(t('modal.opImportScanning'));
        const files = this.host.app.vault.getMarkdownFiles()
            .filter((f) => f.path.startsWith(`${folder}/`))
            .sort((a, b) => b.basename.localeCompare(a.basename));
        const existing = await this.loadItems();
        const known = new Set(existing.map((i) => this.memoFingerprintOf(i.notes)).filter(Boolean));
        const picked = [];
        for (const f of files) {
            const memos = this.host.parseMemos(await this.host.app.vault.cachedRead(f));
            for (const m of memos) {
                if (tag && !m.text.includes(tag)) continue;
                const fp = `${f.path}#${m.time}`;
                if (known.has(fp)) continue;
                known.add(fp);
                picked.push({ file: f, memo: m, fp });
            }
        }
        if (!picked.length) { this.host.showToast(t('modal.opImportNone', { tag: tag || '-' })); return; }
        for (const p of picked) {
            await createOpportunity(this.host.app, this.boardPath(), {
                title: this.memoTitleOf(p.memo),
                status: stage,
                tags: tag ? [tag.replace(/^#/, '')] : [],
                notes: `<!-- memo: ${p.fp} -->\n${p.memo.body.join('\n')}`,
                link: p.file.basename,
                starred: false,
            }, this.boardTitle(), this.stageLabels());
        }
        this.host.showToast(t('modal.opImportedToast', { n: String(picked.length), tag: tag || '-' }));
        void this.refreshBoard();
    }
```

#### 10.4.6 设置面板（DashboardSettingTab.display()）
- 在「快速捕捉」标题后、`captureStoragePath` 的 FolderDropdown 之前，加写入模式下拉：
```js
        new obsidian.Setting(containerEl)
            .setName(t('settings.captureWriteMode'))
            .setDesc(t('settings.captureWriteModeDesc'))
            .addDropdown((dd) => dd
            .addOption('daily', t('settings.captureModeDaily'))
            .addOption('file', t('settings.captureModeFile'))
            .setValue(this.plugin.settings.quickCapture.writeMode === 'file' ? 'file' : 'daily')
            .onChange(async (v) => { this.plugin.settings.quickCapture.writeMode = v; await this.plugin.saveSettings(); this.display(); }));
```
- 在「捕捉模板」设置之后、`// 新日记` 之前，加首页闪念开关：
```js
        new obsidian.Setting(containerEl)
            .setName(t('settings.memoShowOnHome'))
            .setDesc(t('settings.memoShowOnHomeDesc'))
            .addToggle((tg) => tg
            .setValue(this.plugin.settings.memoShowOnHome)
            .onChange(async (v) => { this.plugin.settings.memoShowOnHome = v; await this.plugin.saveSettings(); }));
```
- 在「看板数据文件」`addText` 设置之后，加拾取标签输入框：
```js
        new obsidian.Setting(boardOptions)
            .setName(t('settings.boardImportTag'))
            .setDesc(t('settings.boardImportTagDesc'))
            .addText((tc) => tc
            .setPlaceholder('#灵感')
            .setValue(this.plugin.settings.boardImportTag)
            .onChange(async (v) => { this.plugin.settings.boardImportTag = v.trim(); await this.plugin.saveSettings(); }));
```

#### 10.4.7 i18n 字典新增 key（zh 与 en 各 19 个）
在 `const zh = {` 与 `const en = {` 中按段插入：
- **home 段**：`memoListTitle`、`memoListEmpty`、`memoListOpen`、`memoListDup`、`memoListCount`
- **modal 段**：`opImportFromDaily`、`opImportScanning`、`opImportedToast`、`opImportNone`、`opImportNoFolder`
- **settings 段**：`captureWriteMode`、`captureWriteModeDesc`、`captureModeDaily`、`captureModeFile`、`captureDailyPathDesc`、`memoShowOnHome`、`memoShowOnHomeDesc`、`boardImportTag`、`boardImportTagDesc`

中英文值见 `main.js` 中 `zh`（约 174 / 239 / 268 行附近）与 `en`（约 480 / 545 / 593 行附近）的实际定义；新增项后务必保证 zh / en 两字典 key 集合一致（源码共 390 个 `t()` key）。

#### 10.4.8 styles.css 新增样式
在 `.ad-qc__cta.flash` 的 `@keyframes capture-flash` 之后、`/* ==== todo ==== */` 之前插入 `.ad-memo*` 样式；在 `.po-add-btn:hover` 之后插入 `.op-import-btn` 样式：
```css
/* today's memos (Thino-compatible) */
.ad-memo { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 6px; padding-top: 8px; border-top: 1px solid var(--ad-hair); overflow: hidden; }
.ad-memo__head { display: flex; align-items: baseline; gap: 7px; flex: 0 0 auto; }
.ad-memo__title { font-family: var(--ad-font); font-size: clamp(10px,3.6cqi,11px); letter-spacing: .08em; color: var(--ad-text-mute); }
.ad-memo__count { font-family: var(--ad-font); font-size: clamp(9px,3.2cqi,10px); color: var(--ad-text-dim); margin-right: auto; }
.ad-memo__open { flex: 0 0 auto; padding: 2px 6px; background: transparent; border: 1px solid transparent; border-radius: var(--ad-r1); font-family: var(--ad-font); font-size: clamp(9px,3.2cqi,10px); color: var(--ad-text-dim); cursor: pointer; transition: color .12s, border-color .12s; }
.ad-memo__open:hover { color: var(--ad-accent); border-color: var(--ad-line); }
.ad-memo__list { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
.ad-memo__empty { font-family: var(--ad-font); font-size: clamp(10px,3.6cqi,11px); color: var(--ad-text-dim); padding: 4px 2px; }
.ad-memo__item { display: flex; align-items: baseline; gap: 8px; padding: 3px 6px; border-radius: var(--ad-r1); cursor: pointer; transition: background .12s; }
.ad-memo__item:hover { background: var(--ad-s3); }
.ad-memo__time { flex: 0 0 auto; font-family: var(--ad-font); font-size: clamp(9px,3.4cqi,10px); color: var(--ad-accent); opacity: .85; font-variant-numeric: tabular-nums; }
.ad-memo__text { flex: 1; min-width: 0; font-size: clamp(10px,3.8cqi,12px); color: var(--ad-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.op-import-btn { color: var(--ad-accent-2); }
.op-import-btn:hover { border-color: var(--ad-accent-2); color: var(--ad-accent-2); background: rgba(167,139,250,0.12); }
```

### 10.5 插件更新后重新应用步骤

1. **备份**新文件：
   ```bash
   cd .obsidian/plugins/xove-dashboard
   cp main.js main.js.bak.$(date +%Y%m%d)
   cp styles.css styles.css.bak.$(date +%Y%m%d)
   ```
2. **确认版本与锚点**：先读 `manifest.json` 的 `version`，再按 §10.3 的定位命令确认各函数是否仍存在、上下文是否变化。
3. **按 §10.4.1 → §10.4.8 顺序重新打补丁**。注意：
   - 若新版已内置类似功能，先对比再决定是否仍需本补丁；
   - 若函数签名/变量名变化（如 `this.plugin.settings` 改名、`createOpportunity` 参数变化），需相应调整 §10.4 的调用；
   - 若只是行号变化，函数名锚点不变，直接套用即可。
4. **语法校验**：
   ```bash
   cp main.js /tmp/xove-check.mjs && node --check /tmp/xove-check.mjs && echo OK
   ```
5. **重载插件**：Obsidian → 设置 → 第三方插件 → 关闭再开启 Xove Dashboard（或重启 Obsidian）。首次加载会自动把新字段补进 `data.json`。

### 10.6 验证清单（更新后必做）

- [ ] `node --check` 通过，无语法错误
- [ ] 源码中 390 个 `t()` key 在 zh / en 字典均无缺失（可用脚本 grep 校验）
- [ ] 用真实 Thino 日记 `thino/2026/*.md` 验证 `parseMemos` 能正确解析（含多行续行、忽略无时间戳列表项）
- [ ] 写入一条捕捉后，当日日记出现 `- HH:mm 内容` 行，且 Thino 侧可见
- [ ] 首页今日闪念列表显示当日全部 memo（含 Thino 录入）
- [ ] 看板「从日记拾取」把带 `#灵感` 的 memo 导入收集箱，重复点击不重复导入

> 关键兼容性结论（0.3.1 已实跑通过）：用真实 `thino/2026/2026-06-23.md` 成功解析 9 条 Thino memo（含 13 行续长的长条目），无时间戳列表项不误判；写入→读回往返一致。

### 10.7 已知风险与注意事项

- **主仓库冲突**：修改的是编译产物 `main.js`，**Xove 每次更新都会覆盖**，必须重新打补丁（见 §10.5）。
- **格式耦合**：本补丁强依赖 Thino 的 `- HH:mm` 约定。若 Thino 改写入格式（如改用 YAML frontmatter 存储 memo），`parseMemos` 需同步改。
- **去重指纹**：`memoFingerprintOf` 正则排除 `>` 与换行（**不要加 `-`**，否则日期分隔符会匹配失败）。指纹形如 `thino/2026/2026-09-01.md#09:05`。
- **写入位置**：memo 始终追加到日记**末尾**，不插入中间，避免破坏 frontmatter 与 Thino 既有结构。
- **命名规则兜底**：daily 模式下若 `namingPattern` 含 `HH/mm` 等时间占位符，`dailyMemoPath` 自动降级为 `YYYY-MM-DD`，确保"一天一个文件"。
- **依赖现有方法**：`appendMemoToDaily` / `renderMemoList` 复用了类内 `ensureFolder`、`applyNamingPattern`、`resolveTemplatePath`、`applyTemplate`、`showToast`、`getOrCreateCard`、`cardHead`、`openLinkText`；`importMemosFromDaily` 复用 `createOpportunity`、`loadItems`、`stageLabels`、`boardPath`、`boardTitle`、`refreshBoard`。若更新删除/改名这些依赖，需同步调整。
- **`this.host`**：`OpportunityBoard` 的 `host` 为 `DashboardView` 实例（构造于 `new OpportunityBoard(this)`），`parseMemos` 通过 `this.host.parseMemos` 调用——更新后若 host 类型变化需确认。

---

## 11. 外部配套改动：`01 主页/主页1.md` 心情模块（与 §9 块 16 配套，必须同步）

> **为什么必须改**：§9 块 16 把心情写入统一到 `04 TaskNotes/健康数据/YYYY-MM-DD.md`，而主页1 的心情模块原本只读写 `04 TaskNotes/心情/`。**若不同步改主页1，主页1 将读不到 Xove 写入的心情（互通断裂）**。
>
> 改动前已备份：`01 主页/主页1.备份_2026-09-01.md`（回滚时整文件覆盖回去即可）。

### 11.1 改动清单

| # | 位置（主页1.md） | 改动 |
|---|---|---|
| 1 | 模块 2.5 顶部 | 新增 `const HEALTH_DIR = '04 TaskNotes/健康数据';`，原 `MOOD_DIR` 降级为历史回退 |
| 2 | 心情数据读取 | 改为**先读旧「心情」目录（历史），再读「健康数据」文件（新数据覆盖）** |
| 3 | `saveMood()` | 改为**字段级 upsert** 到健康数据文件（保留 `waterCount` 等），并写摘要行 `- 今日心情：😊 开心` |
| 4 | `deleteMood()` | 由「删除整个文件」改为**只移除 `mood` 字段与摘要行**（文件里还有喝水数据，绝不能删文件）；顺带清掉旧目录遗留文件 |
| 5 | 删除按钮绑定 | `addEventListener('click', deleteMood)` → `() => { deleteMood(); }`（原写法会把 MouseEvent 当容器传入，是既有 bug） |

### 11.2 可重打的 SEARCH/REPLACE

```主页1.md
<<<<<<< SEARCH
const MOOD_DIR = '04 TaskNotes/心情';
const moodEmojis = { '😊':'开心','🙂':'不错','😐':'一般','😔':'低落','😢':'难过','😡':'生气','😴':'疲惫','✨':'平静','💪':'奋斗','❤️':'爱' };
=======
const MOOD_DIR = '04 TaskNotes/心情';        // 旧目录：仅作为历史数据回退读取
const HEALTH_DIR = '04 TaskNotes/健康数据';  // 统一目录：与喝水等同一份日记录文件
const moodEmojis = { '😊':'开心','🙂':'不错','😐':'一般','😔':'低落','😢':'难过','😡':'生气','😴':'疲惫','✨':'平静','💪':'奋斗','❤️':'爱' };
>>>>>>> REPLACE
```

```主页1.md
<<<<<<< SEARCH
const moodFiles = app.vault.getFiles().filter(f => f.path.startsWith(MOOD_DIR) && f.extension === 'md');
const moodData = {};
await Promise.all(moodFiles.map(async f => {
  const content = await app.vault.read(f);
  const m = content.match(/^mood:\s*(\S+)/m);
  if (m) moodData[f.name.replace('.md','')] = m[1];
}));
=======
const moodData = {};
// 统一读取：先读旧「心情」目录（历史数据），再读「健康数据」文件（新数据优先覆盖）
const readMoodDir = async (dir) => {
  const files = app.vault.getFiles().filter(f => f.path.startsWith(dir) && f.extension === 'md');
  await Promise.all(files.map(async f => {
    const content = await app.vault.read(f);
    const m = content.match(/^mood:\s*(\S+)/m);
    if (m) moodData[f.name.replace('.md','')] = m[1];
  }));
};
await readMoodDir(MOOD_DIR);
await readMoodDir(HEALTH_DIR);
>>>>>>> REPLACE
```

```主页1.md
<<<<<<< SEARCH
function saveMood(emoji) {
  const fPath = `${MOOD_DIR}/${todayStr}.md`;
  const content = `---\nmood: ${moodKeys[emoji]}\ndate: ${todayStr}\n---\n\n${emoji} 今天心情：${moodEmojis[emoji]}\n`;
  (async () => {
    const existing = app.vault.getAbstractFileByPath(fPath);
    if (existing) await app.vault.modify(existing, content);
    else await app.vault.create(fPath, content);
    const leftEl = document.getElementById('mood-left');
    if (!leftEl) return;
    leftEl.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px;">
      <div style="font-size:48px;">${emoji}</div>
      <div style="font-size:14px;font-weight:600;color:${C.text};">${moodEmojis[emoji]}</div>
      <div style="font-size:11px;color:${C.sub};">今天已记录 · 可以修改</div>
      <button id="mood-again-btn" style="background:${C.card2};border:1px solid ${C.border};color:${C.sub};padding:4px 16px;border-radius:20px;font-size:12px;cursor:pointer;">🔄 修改</button>
    </div>`;
    document.getElementById('mood-again-btn')?.addEventListener('click', () => { deleteMood(leftEl); });
  })();
}
=======
// frontmatter 字段级 upsert：保留同文件里的 waterCount 等其他数据，不整文件覆盖
function upsertMoodField(content, key, value) {
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  if (fm) {
    const has = new RegExp('^' + key + ':', 'm').test(fm[1]);
    const nb = has ? fm[1].replace(new RegExp('^' + key + ':.*$', 'm'), key + ': ' + value) : fm[1] + '\n' + key + ': ' + value;
    return content.replace(fm[0], '---\n' + nb + '\n---');
  }
  return '---\n' + key + ': ' + value + '\n---\n\n' + content;
}
function upsertMoodLine(content, prefix, line) {
  const lines = content.split('\n');
  const i = lines.findIndex(l => l.startsWith(prefix));
  if (i >= 0) lines[i] = line; else lines.push('', line);
  return lines.join('\n');
}
async function saveMood(emoji) {
  const fPath = `${HEALTH_DIR}/${todayStr}.md`;
  let content = '';
  const existing = app.vault.getAbstractFileByPath(fPath);
  if (existing) content = await app.vault.read(existing);
  content = upsertMoodField(content, 'date', todayStr);
  content = upsertMoodField(content, 'mood', moodKeys[emoji]);
  content = upsertMoodLine(content, '- 今日心情：', `- 今日心情：${emoji} ${moodEmojis[emoji]}`);
  if (existing) await app.vault.modify(existing, content);
  else await app.vault.create(fPath, content);
  moodData[todayStr] = moodKeys[emoji];
  const leftEl = document.getElementById('mood-left');
  if (!leftEl) return;
  leftEl.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px;">
      <div style="font-size:48px;">${emoji}</div>
      <div style="font-size:14px;font-weight:600;color:${C.text};">${moodEmojis[emoji]}</div>
      <div style="font-size:11px;color:${C.sub};">今天已记录 · 可以修改</div>
      <button id="mood-again-btn" style="background:${C.card2};border:1px solid ${C.border};color:${C.sub};padding:4px 16px;border-radius:20px;font-size:12px;cursor:pointer;">🔄 修改</button>
    </div>`;
  document.getElementById('mood-again-btn')?.addEventListener('click', () => { deleteMood(leftEl); });
}
>>>>>>> REPLACE
```

```主页1.md
<<<<<<< SEARCH
function deleteMood(container) {
  const fPath = `${MOOD_DIR}/${todayStr}.md`;
  const existing = app.vault.getAbstractFileByPath(fPath);
  if (existing) app.vault.delete(existing).then(() => {
    const el = container || document.getElementById('mood-left');
    if (!el) return;
=======
async function deleteMood(container) {
  // 统一文件里还有喝水等数据，不能删整个文件 —— 只移除 mood 字段与摘要行
  const fPath = `${HEALTH_DIR}/${todayStr}.md`;
  const existing = app.vault.getAbstractFileByPath(fPath);
  if (existing) {
    let content = await app.vault.read(existing);
    content = content.replace(/^mood:.*\n/m, '');
    content = content.split('\n').filter(l => !l.startsWith('- 今日心情：')).join('\n');
    await app.vault.modify(existing, content);
  }
  const legacy = app.vault.getAbstractFileByPath(`${MOOD_DIR}/${todayStr}.md`);
  if (legacy) await app.vault.delete(legacy);
  delete moodData[todayStr];
  {
    const el = container || document.getElementById('mood-left');
    if (!el) return;
>>>>>>> REPLACE
```
> ⚠️ 改 deleteMood 开头后，**该函数结尾原 `});` 必须改成 `}`**（原本是 `.then(() => { ... })` 的闭合）。遗漏会直接语法报错。

```主页1.md
<<<<<<< SEARCH
  document.getElementById('mood-delete-btn')?.addEventListener('click', deleteMood);
=======
  document.getElementById('mood-delete-btn')?.addEventListener('click', () => { deleteMood(); });
>>>>>>> REPLACE
```

### 11.3 校验方式
主页1 是 dataviewjs，可提取代码块做语法检查：
```bash
cd /Users/guochenfa/Downloads/mutiply3 && node -e "
const fs=require('fs');
const md=fs.readFileSync('01 主页/主页1.md','utf8');
const re=/\`\`\`dataviewjs\n([\s\S]*?)\n\`\`\`/g;
let m,all='';
while((m=re.exec(md))!==null){all+=m[1]+'\n';}
fs.writeFileSync('/tmp/home1_check.mjs',all);
" && node --check /tmp/home1_check.mjs && echo HOME1_SYNTAX_OK
```
本次实跑结果：`blocks: 4`、`HOME1_SYNTAX_OK`。

### 11.4 数据兼容性
- **历史数据不丢**：旧 `04 TaskNotes/心情/*.md` 全部保留，读取时作为回退源（新数据优先）。
- **与 `健康追踪.md` 兼容**：它用 `readHealthFile` → 改字段 → `writeHealthFile` 重建，会保留 `mood`（因为 data 对象含 mood）；反之插件侧字段级更新也保留 `waterCount`。双向不冲突。
- **唯一已知取舍**：`健康追踪.md` 的 `writeHealthFile` 会**重建正文**，其模板里的 `- 今日心情：${data.mood}` 用的是英文 key（如 `happy`）而非「😊 开心」。因此若之后动了健康追踪面板，摘要行可能回退成 key 值；**frontmatter 数据不受影响**，下次用 Xove 卡片保存会再写成可读形式。

---

## 12. 目标进度自定义 + 写作字数自动统计 + 导航「新建」（追加补丁，2026-09-04）

> 本补丁独立于前面的 §3/§17，作用于 xove-dashboard 主插件 `main.js` / `styles.css` / `manifest.json`。
> **完整 unified diff 在 `02 WorkBuddy/backups/xove-dashboard-patch/`**（`xove-main.patch` / `xove-styles.patch` + `apply-patch.sh` + `*.orig` / `*.patched`），
> 本节只记录「改了什么、锚点在哪、关键代码」，便于升级后手动重打。

### 12.1 形态与体验

1. **目标进度可自定义**：每个目标右侧 `⚙ 编辑` / `✕ 删除`；卡片底部「+ 新增目标」→ 弹窗（名称 / 目标值 / 单位 / 图标 / 颜色 / 自动统计 / 统计范围）。
2. **写作字数自动统计**：目标「自动统计 = 字数统计」后，**打开首页即刷新真实字数**（中文按字、英文按词，剔除 frontmatter），不再需要手动点 `+1`。默认「写作字数」目标已是 `auto:'wordcount'`、`folder:''`（全库）。
3. **导航「导入」→「新建」**：首页导航第四项由 `导入` 改名为 `新建`，进入后分两块——「新建内容」（本次新增：灵感收集 / 人生打卡清单 / 普通笔记）与「映射已有笔记为首页卡片」（原导入能力，保留）。

### 12.2 修改原因

- 原目标进度只有 `±1` 手动按钮，写作字数无法真实统计（每点一次只 `+1` 字）。
- 原导入页只能把**已有** md 映射成卡片，不能**创建新内容**（灵感、打卡项、笔记）。
- 原逻辑在目标为空时会回退默认目标，导致「删光目标」无效 —— 本次改为仅在字段缺失时初始化。

### 12.3 main.js 改动锚点（方法名重定位，行号以 v0.3.1 patched 为准）

| 改动 | 方法 / 位置 | 作用 |
|---|---|---|
| 按钮文案默认 | `DEFAULT_SETTINGS.importTitle`（L939） | `'导入'` → `'新建'` |
| 文案迁移修复 | `normalizeSettings`（同 §17 的 importTitle 初始化处） | `undefined` → `'新建'`（不再回退默认「导入」） |
| 目标渲染增强 | `renderGoals(board)`（L11572） | 每个目标加 `⚙`/`✕`，底部「+ 新增目标」；自动统计目标隐藏 `±`；仅在配置缺失时回退默认目标 |
| 目标编辑弹窗 | 新增 `class GoalEditModal`（L4201，插在 `ImportBoard` 之后、`OpportunityBoard` 之前） | 新增/编辑目标模态框 |
| 字数统计 | 新增 `countWordsInFolder(folder)`（L11644）/ `refreshAutoGoals(goals, onUpdated)`（L11668） | 统计与刷新自动目标；结果按范围缓存 60s、排除 `node_modules` |
| 新建页 | `ImportBoard.render`（L4032 顶部新增「新建内容」区块）/ `doCreate(kind, name)`（L4126） | 「新建内容」三种类型 + 新建逻辑 |

### 12.4 关键代码块

**① `DEFAULT_SETTINGS.importTitle` 默认（L939）**
```js
importTitle: '新建',
```

**② `renderGoals` 关键增强（L11572 起，节选）**
```js
renderGoals(board) {
    const card = this.getOrCreateCard(board, 'ad-card ad-b-goals');
    this.cardHead(card, '🎯', t('home.modules.goals'), '');
    // 仅在配置缺失时回退默认值；用户主动清空后不再复活默认目标
    let goals = Array.isArray(this.plugin.settings.goals)
        ? this.plugin.settings.goals.map((g) => ({ ...g }))
        : DEFAULT_GOALS.map((g) => ({ ...g }));
    const body = card.createDiv({ cls: 'ad-goals' });
    const saveAndRender = async () => {
        this.plugin.settings.goals = goals.map((g) => ({ ...g }));
        await this.plugin.saveSettings();
        renderList();
    };
    const renderList = () => {
        body.empty();
        for (const g of goals) {
            /* ... 进度条/百分比渲染（同原逻辑） ... */
            const btns = meta.createDiv({ cls: 'ad-goal__btns' });
            // 自动统计类目标隐藏手动 ±，避免手动值与自动值互相覆盖
            if (g.auto !== 'wordcount') {
                const dec = btns.createEl('button', { text: '-' });
                const inc = btns.createEl('button', { text: '+' });
                dec.addEventListener('click', () => { g.current = Math.max(0, (g.current||0)-1); void saveAndRender(); });
                inc.addEventListener('click', () => { g.current = Math.min(g.target||0, (g.current||0)+1); void saveAndRender(); });
            }
            const editBtn = btns.createEl('button', { text: '⚙' });
            editBtn.addEventListener('click', () => {
                new GoalEditModal(this.plugin.app, this.plugin, g, (next) => {
                    const i = goals.findIndex((x) => x.id === g.id);
                    if (i >= 0) goals[i] = next;
                    void saveAndRender().then(() => this.refreshAutoGoals(goals, saveAndRender));
                }).open();
            });
            const delBtn = btns.createEl('button', { text: '✕' });
            delBtn.addEventListener('click', () => { goals = goals.filter((x) => x.id !== g.id); void saveAndRender(); });
        }
        const addRow = body.createDiv({ cls: 'ad-goal__add' });
        const addBtn = addRow.createEl('button', { cls: 'ad-goal__addbtn', text: '+ 新增目标' });
        addBtn.addEventListener('click', () => {
            new GoalEditModal(this.plugin.app, this.plugin, null, (next) => {
                goals.push(next);
                void saveAndRender().then(() => this.refreshAutoGoals(goals, saveAndRender));
            }).open();
        });
    };
    renderList();
    void this.refreshAutoGoals(goals, saveAndRender);
}
```

**③ 字数统计（`countWordsInFolder` + `refreshAutoGoals`，L11644 / L11668）**
```js
async countWordsInFolder(folder) {
    const prefix = (folder || '').trim().replace(/\/+$/, '');
    const files = this.app.vault.getMarkdownFiles().filter((f) => {
        if (f.path.includes('node_modules/')) return false;          // 排除依赖目录
        if (!prefix || prefix === '/') return true;
        return f.path === prefix || f.path.startsWith(prefix + '/');
    });
    let total = 0;
    for (const f of files) {
        try {
            const raw = await this.app.vault.cachedRead(f);
            const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');   // 剔除 frontmatter
            const cjk = (body.match(/[一-龥]/g) || []).length;
            const en  = (body.replace(/[一-龥]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
            total += cjk + en;
        } catch (e) {}
    }
    return total;
}
async refreshAutoGoals(goals, onUpdated) {
    const autoGoals = goals.filter((g) => g.auto === 'wordcount');
    if (!autoGoals.length) return;
    if (!this.wcCache) this.wcCache = new Map();
    const now = Date.now();
    let changed = false;
    for (const g of autoGoals) {
        const key = g.folder || '/';
        const hit = this.wcCache.get(key);
        let n;
        if (hit && now - hit.at < 60000) n = hit.n;          // 缓存 60s
        else { n = await this.countWordsInFolder(g.folder); this.wcCache.set(key, { at: now, n }); }
        if (n !== g.current) { g.current = n; changed = true; }
    }
    if (changed) {
        this.plugin.settings.goals = goals.map((g) => ({ ...g }));
        await this.plugin.saveSettings();
        if (onUpdated) onUpdated();
    }
}
```

**④ 目标编辑弹窗 `GoalEditModal`（L4201，插在 `ImportBoard` 之后、`OpportunityBoard` 之前）**
```js
class GoalEditModal extends obsidian.Modal {
    constructor(app, plugin, goal, onSave) {
        super(app);
        this.plugin = plugin;
        this.goal = goal
            ? { ...goal }
            : { id: '', name: '', target: 100, current: 0, unit: '', icon: '🎯', color: '#8b5cf6', auto: '', folder: '' };
        this.onSave = onSave;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        const g = this.goal;
        contentEl.createEl('h2', { text: g.id ? '编辑目标' : '新增目标' });
        const form = contentEl.createDiv({ cls: 'ad-gform' });
        // 行生成器：row('名称') → 内部加 input，input 事件写回 g.xxx
        // 字段：名称 / 目标值(number) / 单位 / 图标 / 颜色(color) / 自动统计(select: ''=手动, 'wordcount'=字数统计) / 统计范围(folder)
        // 保存：名称空则兜底 '未命名目标'；无 id 则生成 'g'+Date.now()；close() 后回调 onSave({...g})
    }
    onClose() { this.contentEl.empty(); }
}
```

**⑤ 导航「新建」页（`ImportBoard.render` 顶部新增区块 + `doCreate`，L4032 / L4126）**
```js
// ImportBoard.render 顶部：新建内容区块（在「映射已有笔记」之前）
const createBox = root.createDiv({ cls: 'im-create' });
createBox.createEl('h3', { cls: 'im-create__title', text: '新建内容' });
const cRow = createBox.createDiv({ cls: 'im-create__row' });
const kindSel = cRow.createEl('select', { cls: 'im-select' });
kindSel.createEl('option', { value: 'inspiration', text: '灵感收集' });
kindSel.createEl('option', { value: 'checklist',   text: '人生打卡清单' });
kindSel.createEl('option', { value: 'note',       text: '普通笔记' });
const nameInput = cRow.createEl('input', { cls: 'im-input', attr: { placeholder: '输入名称，如：每天写 500 字' } });
const createBtn = cRow.createEl('button', { cls: 'im-btn im-btn--primary', text: '新建' });
const runCreate = () => void this.doCreate(kindSel.value, nameInput.value.trim());
createBtn.addEventListener('click', runCreate);
nameInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') runCreate(); });
// （下方保留原「映射已有笔记为首页卡片」im-form / im-list）

async doCreate(kind, name) {
    if (!name) { this.host.showToast('请输入名称', 'error'); return; }
    const app = this.host.app; const s = this.host.plugin.settings;
    try {
        if (kind === 'inspiration') {
            const p = (s.opportunityFile || '看板.md').trim().toLowerCase().endsWith('.md')
                ? (s.opportunityFile || '看板.md').trim() : (s.opportunityFile || '看板.md').trim() + '.md';
            await createOpportunity(app, p, { title: name }, s.boardTitle || '灵感收集', (s.boardStages||[]).map((x)=>x.label));
            this.host.showToast('已新建灵感：' + name);
        } else if (kind === 'checklist') {
            const p = (s.checklistFile || '').trim();
            if (!p) { this.host.showToast('未配置人生打卡清单文件', 'error'); return; }
            const file = app.vault.getAbstractFileByPath(p);
            if (!(file instanceof obsidian.TFile)) { this.host.showToast('打卡清单文件不存在：' + p, 'error'); return; }
            const lines = (await app.vault.read(file)).split(/\r?\n/);
            let insertAt = lines.length;
            while (insertAt > 0 && lines[insertAt-1].trim() === '') insertAt--;
            lines.splice(insertAt, 0, '- [ ] ' + name);
            await app.vault.modify(file, lines.join('\n'));
            this.host.showToast('已新增打卡项：' + name);
        } else { // note
            const qc = s.quickCapture;
            const dir = (qc && qc.storagePath ? qc.storagePath : '').trim().replace(/\/+$/, '');
            const p = (dir ? dir + '/' : '') + name + '.md';
            if (app.vault.getAbstractFileByPath(p)) { this.host.showToast('文件已存在：' + p, 'error'); return; }
            const created = await app.vault.create(p, '# ' + name + '\n\n');
            if (!Array.isArray(s.mirrors)) s.mirrors = [];
            s.mirrors.push({ id: 'm'+Date.now(), filePath: created.path, scope: 'file', heading: '', title: name, icon: '📄', enabled: true, auto: false, sourceId: '' });
            await this.host.plugin.saveSettings();
            this.host.showToast('已新建笔记并加入首页：' + name);
        }
    } catch (e) {
        console.error('[Xove] create failed', e);
        this.host.showToast('新建失败：' + (e && e.message ? e.message : String(e)), 'error');
        return;
    }
    await this.show();
}
```

### 12.5 数据层（`settings.goals` 项结构）

```js
// 每个目标：
{ id: 'g1700000000000', name: '写作字数', target: 100000, current: 0,
  unit: '字', icon: '✍️', color: '#f59e0b',
  auto: '',          // '' = 手动(±按钮)；'wordcount' = 自动统计字数
  folder: '' }       // auto=wordcount 时生效；'' = 整个库，填文件夹则只统计该目录
```
- `DEFAULT_GOALS`（参考 §3 原默认）仍作为「字段缺失」兜底；用户主动清空 `goals: []` 后不再复活。
- 写作字数目标默认已设为 `auto:'wordcount', folder:''`（全库，已排除 `node_modules`）。

### 12.6 styles.css 新增类

在 `styles.css` 末尾追加（沿用现有 `--ad-*` 变量）：
- 目标编辑弹窗：`.ad-gform` / `.ad-gform__row` / `.ad-gform__icon` / `.ad-gform__color` / `.ad-gform__btns` + `.ad-modal-input`
- 目标卡新增按钮：`.ad-goal__add` / `.ad-goal__addbtn` / `.ad-goal__btns`
- 新建页区块：`.im-create` / `.im-create__title` / `.im-create__row`

### 12.7 manifest 切断更新

`manifest.json` 版本写入 `99.99.99`，插件名改为 `Xove Dashboard (定制版·勿更新)`，Obsidian / BRAT 不再提示更新。
（`apply-patch.sh` 末尾用 python 改 `d['version']='99.99.99'`。）

### 12.8 重打 / 回滚

```bash
# 一键重打（先备份 *.bak.<时间戳> → 打补丁 → 锁版本 → node --check）
bash 02\ WorkBuddy/backups/xove-dashboard-patch/apply-patch.sh
bash 02\ WorkBuddy/backups/xove-dashboard-patch/apply-patch.sh ~/.obsidian/plugins/xove-dashboard

# 若 main.js 补丁应用失败（官方大改版上下文不匹配），直接恢复成品：
cp 02\ WorkBuddy/backups/xove-dashboard-patch/main.js.patched   ~/.obsidian/plugins/xove-dashboard/main.js
cp 02\ WorkBuddy/backups/xove-dashboard-patch/styles.css.patched ~/.obsidian/plugins/xove-dashboard/styles.css
```
- 改完需**重启 Obsidian**（或禁用再启用插件）才生效。
- 手动合并新版时按 §12.3 的「方法名」定位（行号随版本变化）。

### 12.9 重构修订（第二轮，2026-09-04）—— 新建逻辑纠正 + 结构与性能重构

> **本节取代 §12.1 / §12.3 / §12.4 的 ③⑤ / §12.6 中关于「新建内容」的部分。**
> 上面原文保留作历史记录，实际实现以本节为准（补丁文件已同步重新生成）。

#### 12.9.1 为什么要改（逻辑纠正）

- 第一版把「新建」做成了**模块内的单条创建**：灵感条目 / 打卡项 / 普通笔记（`doCreate` 的 `inspiration` / `checklist` / `note` 三个分支）。
- 这不是预期行为：要的是 Xove 的**一级内容实体** —— 日记 / 任务 / 项目（对应导航栏模块与「全部项目」里的项目概念），而不是在清单里加一个 `- [ ] 任务`。
- 因此**移除** `doCreate` 的三个自建分支，改为**复用 Xove 原生创建流程**，保证数据格式与「快速捕获」「全部项目」完全一致。

#### 12.9.2 重构后的职责划分

| 位置 | 职责 |
|---|---|
| `XOVE_CREATE_ENTRIES`（常量，定义在 `ImportBoard` 之前） | 声明式定义三个入口（key / 标题 / 描述 / SVG 图标）—— 加入口只改这一处 |
| `ImportBoard.renderHead` | 页头 |
| `ImportBoard.renderCreateGrid` | 三个入口卡片（键盘可达：Tab 聚焦、Enter/Space 触发） |
| `ImportBoard.renderDiaryPanel` | 日记内联输入区（默认收起，⌘/Ctrl+Enter 保存） |
| `ImportBoard.renderMapSection` | 映射已有笔记（折叠；展开时才构建文件下拉列表） |
| `ImportBoard.renderMirrorList` | 已有映射卡片列表 |
| `ImportBoard.runCreate(key)` | 入口分发 |
| `ImportBoard.submitDiary()` | 日记写入 |
| `GoalEditModal` | 目标编辑弹窗（字段配置化渲染） |
| `renderGoals` + `commit()` + `renderList()` | 目标渲染；保存与渲染解耦 |
| `countWordsInFolder` / `refreshAutoGoals` / `recomputeWordCounts` | 字数统计（持久缓存 + 后台重算） |

#### 12.9.3 三个入口调用的 Xove 原生函数

| 入口 | 调用 | 说明 |
|---|---|---|
| 新建日记 | `this.host.createCaptureNote(content)` | `daily` 模式追加到当日日记（memo 格式），`file` 模式建独立 md |
| 新建任务 | `this.host.openTaskModal()` → `createTaskFile(...)` | 原生任务弹窗，字段完整（项目/状态/优先级/日期/重复规则） |
| 新建项目 | `this.host.createProjectFile()` → `createProjectFolder(...)` | 原生项目弹窗，字段完整（名称/颜色/类型/起止日期/描述） |

> 这三个方法都在 `DashboardView` 上（`host` 即 `DashboardView`），直接 `this.host.xxx()` 调用即可，无需自己拼数据格式。

#### 12.9.4 关键代码（取代 §12.4 的 ⑤）

```js
/** 字数统计缓存有效期（毫秒）：期间直接用缓存值，过期后后台重算。 */
const WC_TTL = 10 * 60 * 1000;
const XOVE_CREATE_ENTRIES = [
    { key: 'diary',   title: '新建日记', desc: '写一条闪念 / 今日日记', icon: '<svg …日历…/>' },
    { key: 'task',    title: '新建任务', desc: '在指定项目下新建任务，可设日期与优先级', icon: '<svg …勾选…/>' },
    { key: 'project', title: '新建项目', desc: '新建项目文件夹与 project 配置文件', icon: '<svg …文件夹…/>' },
];
class ImportBoard {
    renderCreateGrid(root) {
        const grid = root.createDiv({ cls: 'im-grid' });
        for (const e of XOVE_CREATE_ENTRIES) {
            const card = grid.createDiv({ cls: 'im-card' });
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', e.title);
            card.createDiv({ cls: 'im-card__icon' }).innerHTML = e.icon;   // 内联 SVG
            card.createDiv({ cls: 'im-card__title', text: e.title });
            card.createDiv({ cls: 'im-card__desc', text: e.desc });
            card.addEventListener('click', () => this.runCreate(e.key));
            card.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.runCreate(e.key); }
            });
        }
    }
    /** 入口分发：日记走内联输入，任务/项目交给 Xove 原生弹窗 */
    runCreate(key) {
        if (key === 'diary')   { this.toggleDiary(true); return; }
        if (key === 'task')    { void this.host.openTaskModal(); return; }
        if (key === 'project') { void this.host.createProjectFile(); }
    }
    async submitDiary() {
        const content = (this.diaryArea?.value || '').trim();
        if (!content) { this.diaryArea?.focus(); return; }
        try {
            await this.host.createCaptureNote(content);
            this.diaryArea.value = '';
            this.host.showToast(t('home.capturedToast'));
            this.toggleDiary(false);
        } catch (err) {
            console.error('[Xove] capture failed', err);
            this.host.showToast(t('home.captureFailed'), 'error');
        }
    }
    /** 映射区：展开时才构建文件列表（库内上千 md，避免每次进页面都排序加载） */
    buildMapForm(body) {
        if (this.mapBuilt) return;
        this.mapBuilt = true;
        /* …原 im-form：select + path + title + icon + 按钮… */
    }
}
```

#### 12.9.5 字数统计性能优化（取代 §12.4 的 ③）

三层优化，目标是**打开首页不再全库扫描**：

```js
/** 刷新：先套用持久缓存立即出结果，过期项交给后台重算。 */
async refreshAutoGoals(goals, onUpdated, commit) {
    const auto = goals.filter((g) => g.auto === 'wordcount');
    if (!auto.length) return;
    const cache = (this.plugin.settings.wcCache = this.plugin.settings.wcCache || {});
    const now = Date.now();
    let changed = false;
    const stale = [];
    for (const g of auto) {
        const key = g.folder || '/';
        const hit = cache[key];
        if (!hit) { stale.push(g); continue; }        // 首次：无缓存 → 后台算
        if (hit.n !== g.current) { g.current = hit.n; changed = true; }
        if (now - hit.at > WC_TTL) stale.push(g);     // 过期 → 后台算
    }
    if (changed) { if (commit) await commit(); if (onUpdated) onUpdated(); }
    if (stale.length) void this.recomputeWordCounts(stale, goals, cache, onUpdated, commit);
}
/** 后台重算（不阻塞首屏）：算完回写并局部刷新。 */
async recomputeWordCounts(list, goals, cache, onUpdated, commit) {
    let changed = false;
    for (const g of list) {
        const key = g.folder || '/';
        const n = await this.countWordsInFolder(g.folder);
        cache[key] = { at: Date.now(), n };
        if (n !== g.current) { g.current = n; changed = true; }
    }
    if (!changed) return;
    if (commit) await commit();
    else { this.plugin.settings.goals = goals.map((g) => ({ ...g })); await this.plugin.saveSettings(); }
    if (onUpdated) onUpdated();
}
// countWordsInFolder：分批并发（每批 100），避免上千 Promise 一次性占满微任务队列
for (let i = 0; i < files.length; i += 100) {
    const counts = await Promise.all(files.slice(i, i + 100).map(async (f) => { /* cachedRead + 剔除 frontmatter + 中英计数 */ }));
    for (const n of counts) total += n;
}
```

#### 12.9.6 视觉与无障碍（取代 §12.6 的 `.im-create*`）

- 样式类改为：`.im-grid` / `.im-card`（+`__icon` `__title` `__desc`）/ `.im-diary`（+`__area` `__row`）/ `.im-section`（+`__head` `__title` `__toggle` `__body`）；**`.im-create*` 已删除**。
- 全部沿用插件既有 `--ad-*` 变量，不引入新色值。
- 图标用内联 SVG（不依赖字体、随主题变色），取代 emoji。
- 微交互统一 180ms：`hover` 换边框+底色、`active` 轻微下沉、`focus-visible` 描边、键盘可达。
- `@media (prefers-reduced-motion: reduce)` 下关闭过渡。
- 目标卡操作按钮 18px → 20px，补 `transition` 与 `focus-visible`。

#### 12.9.7 重打补丁时注意

`apply-patch.sh` 的「已打补丁」检测标记已同步更新：
- `main.js` → `grep 'class GoalEditModal'`（不变）
- `styles.css` → `grep 'im-grid'`（原为 `im-create__row`，因该样式已删除而失效）
