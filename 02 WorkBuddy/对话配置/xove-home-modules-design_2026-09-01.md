# Xove Dashboard 首页模块整合设计

> 主题：把「人生打卡清单」做成插件内置模块 + 个人工作台模块化组件设计
> 日期：2026-09-01 ｜ 插件版本：Xove Dashboard **0.3.1**
> 状态：⏳ **待确认后实施**（未改动任何插件代码）
>
> ⚠️ **Part 1（方案一：打卡清单内置模块）已被弃用** —— 用户选择改用「通用 md 映射卡片」，
> 见 [`xove-mirror-module_2026-09-01.md`](./xove-mirror-module_2026-09-01.md)。
> 本文 **Part 0（架构锚点）与 Part 2（工作台组件设计）仍然有效**。

---

## 0. 备份（已完成，可随时回滚）

| 备份项 | 位置 |
|---|---|
| 插件整目录（11M，含 main.js / styles.css / manifest） | `02 WorkBuddy/对话配置/backups/xove-dashboard_2026-09-01/` |
| 模块源文件 | `02 WorkBuddy/对话配置/backups/人生打卡清单.README_2026-09-01.md` |

**回滚方式**：把 `backups/xove-dashboard_2026-09-01/` 整个覆盖回 `.obsidian/plugins/xove-dashboard/`，再在 Obsidian 重载插件即可。

---

## Part 0. 插件架构速查（实施锚点，行号基于 0.3.1）

| 机制 | 位置 | 说明 |
|---|---|---|
| 模块注册表 `this.homeModules` | main.js 6499 | `{ id, title, cardCls, live?, render }` |
| 模块设置 `settings.homeModules` | main.js 729 | `{ id, enabled, order, cols, rows }` |
| 默认布局常量 `DEFAULT_HOME_MODULES` | main.js 741 | 「恢复默认布局」的深拷贝源 |
| 渲染调度 `renderEnabledModules` | main.js 7933 | 过滤 enabled → 按 order 同步建卡壳 → 异步填内容 |
| 卡片壳 `getOrCreateCard` / `cardSel` | main.js 7919 | `ad-card ad-b-xxx` + `data-mod` |
| 卡片标题 `cardHead(card, icon, title, hint, hintEl)` | main.js 9849 | 统一头部 |
| 尺寸夹紧 `resolveSpan` | main.js 8058 | 1..MAX_SPAN，按 MIN_COLS / MIN_RATIO 夹紧 |
| 尺寸常量 `MAX_SPAN=4` / `MIN_COLS` / `MIN_RATIO` | main.js 6321 / 6323 / 6336 | 新增模块在此声明最低宽/最低宽高比 |
| 缩放拖拽 `beginResizeDrag` | main.js 8691 | 右下角手柄，按指针绝对位置吸格 |
| 比例菜单 `openProportionMenu` | main.js 8819 | 4×4 网格，非法比例置灰抖动 |
| 编辑态入口 `attachBoardInteractions` | main.js 8127 | 长按进入编辑态（仿手机桌面） |
| 拖拽排序 `beginCardDrag` → `syncOrderFromDom` | main.js 8316 / 8517 | 拖完把 DOM 顺序写回 `order` |
| 添加卡片 `openAddMenu` | main.js 8873 | 只列「被隐藏模块」+ 倒计时(≤5) |
| 移除卡片 `removeModule` | main.js 8544 | `enabled=false` |
| 恢复默认 `resetLayout` / `resetHomeLayout` | main.js 8556 / 10604 | 恢复显隐/顺序/比例 |
| **文件联动** `vault.on(create/delete/rename/modify)` | main.js 6586-6589 → `refreshAll` 6572 | ⚠️ 只刷 taskStore / 热力图 / dashboardStore，**不重建卡片** |
| 设置面板分区 | main.js 793 / 861 / 919 / 992 / 1048 / 1162 | 常规 / 存储 / 任务与项目 / 看板 / 流水线 / 关于（**无「首页模块」分区**） |
| 文件夹下拉 `addFolderDropdown` | main.js 773 | ⚠️ 无「md 文件选择器」（需新建，见 §1.3） |
| 既有 wikilink 建议 `FileSuggest` | main.js 2728 | 继承 AbstractInputSuggest，但仅在输入含 `[` 时触发，**不可直接复用** |
| 数据归一化 `normalizeHomeModules` | main.js 10446 | ⚠️ **新增模块必须在此补默认项**，否则旧 data.json 读到 undefined |
| 布局 CSS `.ad-board` | styles.css 673 | `grid-template-columns: repeat(var(--ad-cols,4), 1fr)`；卡片 `span var(--cols)/var(--rows)` |
| 卡片容器查询 | styles.css 697 | `container-type: inline-size` → 内部字号用 `cqi` 随卡宽缩放 |

---

## Part 1. 方案一：人生打卡清单模块（id: `checklist`）

### 1.1 目标与验收标准
- 设置里**选一个 md 文件** → 首页出现该模块卡片
- 内容**按一级标题分组**，组内按任务原顺序排列
- 显示勾选状态、完成日期、每组进度与总进度
- **点击可勾选/取消并写回 md**
- 可启用/禁用、可排序、可缩放（复用现有编辑态，零额外开发）
- 源文件被改动时卡片**自动刷新**

### 1.2 md 解析规则（依据你文件的真实格式定制）

> 已分析 `01 主页/人生打卡清单.README.md`：**分组用的是 `## `（h2）而非 `#`**；9 个分组（学习·成长 / 工作·事业 / 娱乐·拓展 / 健康·自律 / 人际·关系 / 体验·突破 / 思想进步 / 财务·理财 / 家庭·生活 / 考证），约 90 条任务。

| 元素 | 正则 / 规则 |
|---|---|
| 分组标题 | `/^(#{1,6})\s+(.+)$/`，层级可配（**默认 h2**，因文件用 `##`） |
| 任务行 | `/^(\s*)-\s+\[([ xX/-])\]\s*(.*)$/` |
| 状态映射 | `x` / `X` = 已完成；`/` = 进行中；空格 = 待办 |
| 子任务 | 缩进（tab 或 ≥2 空格）的任务行挂到上一条（如「成为更好」是「26年读12本书」的子项） |
| 完成日期 | `✅ YYYY-MM-DD` / `🛫 YYYY-MM-DD` / `[completion:: YYYY-MM-DD]` 三种都识别 |
| 标签 | `/#[\w\u4e00-\u9fa5/-]+/g`（如 `#project/人生打卡计划`） |
| 续行归属 | 非任务、非空、有缩进的行 → 上一条任务的备注（如孤立的 `✅ 2026-06-02`） |
| 显示清洗 | 剥离 wikilink 残留（`[[第二章 公司法律制度.MD#-|-]]`）后再显示，**原文不动** |
| 脏数据容错 | 空任务 `- [ ]`（第 151 行）、行内 wikilink 混入任务（第 48 行）不崩溃，降级显示 |

### 1.3 接入方式（改动清单）

| # | 位置 | 改动 |
|---|---|---|
| 1 | `DEFAULT_SETTINGS`（729 附近） | 新增 `checklist: { filePath:'', headingLevel:2, showDone:true, showDate:true, showProgress:true, clickAction:'toggle' }` |
| 2 | `DEFAULT_SETTINGS.homeModules`（729） | 追加 `{ id:'checklist', enabled:true, order:8, cols:2, rows:2 }` |
| 3 | `DEFAULT_HOME_MODULES`（741） | 同步追加（保持一致） |
| 4 | `normalizeHomeModules`(10446) + `normalizeSettings`(10547) | 补齐新字段 ⚠️ **浅合并会丢嵌套默认值**（与既有 Thino 补丁同一陷阱） |
| 5 | 注册表 `this.homeModules`（6499） | 追加 `{ id:'checklist', title:t('home.modules.checklist'), cardCls:'ad-card ad-b-checklist', live:false, render:(b)=>void this.renderChecklist(b) }` |
| 6 | 新方法（建议放在 `renderMemoList` 7154 之后） | `parseChecklist(text, level)`、`renderChecklist(board)`、`toggleChecklistItem(file, lineIdx, next)` |
| 7 | `refreshAll`（6572） | 增加路径判断：变更文件 === `checklist.filePath` → 防抖 300ms 后重渲染该卡 |
| 8 | 设置面板（新增分区，建议插在 861「存储」之后） | 「首页模块」区：显隐开关 + 上/下移 + 尺寸；「人生打卡清单」区：文件选择 + 层级 + 显示项 |
| 9 | **新建 `MdFileSuggest extends AbstractInputSuggest`** | 列出 `vault.getMarkdownFiles()` 实时过滤（现有 `FileSuggest` 是 wikilink 专用，不能复用） |
| 10 | i18n zh(11) / en(299) | 新增 `home.checklist*`、`settings.secHomeModules`、`settings.checklist*` 三组 key |
| 11 | styles.css | 新增 `.ad-ck*` 样式，沿用 `--ad-*` 令牌 + `cqi` 字号 |

### 1.4 渲染与交互设计

**卡片结构**（沿用 `cardHead` 统一头部）：
```
☑  人生打卡清单                    36/90
━━━━━━━━━━━━━━━━━━━━━━━━━━  （总进度条）
▸ 1 学习 · 成长                    1/7
  ☐ 完成10+个网课，实现技能突破
  ☑ 更新自己的简历              ✅ 2025-12-25
▸ 4 健康 · 自律                   11/21
  …
```

| 交互 | 行为 |
|---|---|
| 点 checkbox 区 | 切换完成状态 → 写回 md |
| 点任务文本 | 打开源文件并跳到该行（`openLinkText` + `editor.setCursor`） |
| 点分组名 | 折叠/展开该组（状态存内存，不写文件） |
| 右键 | 菜单：打开源文件 / 重新读取 / 更改文件（跳设置） |
| 未配置文件 | 占位卡：「点击选择一个 md 文件」→ 跳设置 |

**写回策略（安全优先）**：
1. 用 `vault.process(file, data => newData)` 原子读写，避免并发写冲突
2. 解析时缓存**行号 + 该行原文指纹**；写回前比对，文件已被外部改动则放弃并 toast「文件已被外部修改，已重新加载」
3. **只改目标行的 `[ ]` 标记与日期片段**，绝不整体重写 → 完整保护 frontmatter、wikilink、空行与缩进结构
4. 完成时若该行无日期 → 追加 ` ✅ YYYY-MM-DD`（沿用你的现有习惯）；取消完成 → 移除该日期标记

### 1.5 启用/禁用与数据联动

| 项 | 方案 |
|---|---|
| 启用/禁用 | `settings.homeModules[].enabled`，三个入口：编辑态拖到垃圾桶（8544）、编辑态「添加卡片」（8873）、设置面板开关（新增） |
| 禁用时 | 不渲染、不读文件（零 IO） |
| 数据联动 | `vault.on('modify')` → `refreshAll` → 路径匹配 → 防抖重渲染（现有 refreshAll 不含卡片重建，**必须补这一步**） |
| 外部编辑 | 在 Obsidian 里改清单 → 首页卡片实时跟随；在首页勾选 → 文件即时更新（双向） |
| 大文件保护 | >2000 行时只渲染前 N 组 + 折叠提示，避免长列表拖慢首屏 |

### 1.6 兼容性处理

- **旧 data.json**：靠 `normalizeHomeModules` / `normalizeSettings` 补默认值（否则新字段 undefined 崩溃）
- **与既有 todo 模块不冲突**：`todo` 走 `taskStore` 扫 `projectsFolder` 下带 frontmatter 的任务文件；`checklist` 面向**任意纯清单 md**。两者数据源不同，可共存
- **插件更新**：改的是编译产物 `main.js`，更新即覆盖 → 需重打补丁（见 Part 3）
- **主题/风格**：只用 `--ad-*` 令牌 + `data-theme` 继承，自动适配明暗主题

---

## Part 2. 方案二：个人工作台模块化组件

### 2.1 现状盘点：插件已有 8 个模块

| 你的需求 | 插件现状 | 结论 |
|---|---|---|
| 待办任务清单 | `todo`（已有，8977） | 复用 / 增强 |
| 每日目标进度 | `progress`（已有进度环，9067） | 复用 / 增强 |
| 番茄专注计时 | `pomodoro`（已有，9628） | 复用 |
| 快捷笔记 | `quick-capture`（已有，且已与 Thino 闪念互通） | 复用 |
| 倒计时 | `countdown`（已有，多实例） | 已有 |
| **习惯打卡** | 无 | **新增 `habit`** |
| **日程概览** | 仅 `weekly`（周计划，偏计划非日程） | **新增 `schedule`** |
| **常用工具入口** | 无 | **新增 `shortcuts`** |

→ 真正需新增：**`habit` / `schedule` / `shortcuts`**（+ 方案一 `checklist`）

### 2.2 各模块设计

**① `habit` 习惯打卡**
- 数据源：专用 md（建议 `06 life os/习惯打卡.md`），格式 `## YYYY-MM-DD` 分组 + `- [x] 习惯名`
- 核心功能：今日习惯列表 + 连续天数 streak + 近 30 天热力格（复用 heatmap 的格子样式）
- 交互：点圆点切换完成（写回 md，同 §1.4 写回策略）；右键编辑习惯清单
- 建议尺寸 `2×1`；`MIN_COLS=1`；多实例：否

**② `schedule` 日程概览**
- 数据源：Daily Notes 今日/明日文件 + `taskStore` 到期任务 + 逾期项
- 核心功能：今日时间轴 / 待办 + 明日预告 + 逾期红点提醒
- 交互：点击条目跳转对应文件或任务
- 建议尺寸 `1×2`（竖卡，时间轴适合竖排）；多实例：否

**③ `shortcuts` 常用工具入口**
- 数据源：`settings.shortcuts[{ label, icon, type, target }]`，type = 笔记 / 命令 / 链接 / 文件夹
- 核心功能：图标网格，点击打开笔记、执行 Obsidian 命令、打开外部链接 / 文件夹
- 交互：编辑态下 `＋` 新增、`×` 删除、拖拽排序（模块内）
- 建议尺寸 `1×1` 或 `2×1`；**支持多实例**（可放「工作」「生活」多个快捷栏）

### 2.3 布局能力：框架已免费提供，无需重复实现

新模块只要完成「注册 + 声明 MIN_COLS/MIN_RATIO + 内部用 cqi 自适应」，就自动获得：

| 能力 | 实现位置 | 用户操作 |
|---|---|---|
| 添加卡片 | `openAddMenu` 8873 | 编辑态 → 添加卡片 |
| 移除卡片 | `removeModule` 8544 | 拖到「拖到此处删除」区 |
| 自由排列 | `beginCardDrag` 8316 → `syncOrderFromDom` 8517 | 长按拖拽，顺序自动持久化 |
| 自由缩放 | `beginResizeDrag` 8691 | 拖右下角手柄，或点击开 4×4 比例菜单（8819） |
| 尺寸约束 | `MIN_COLS` 6323 / `MIN_RATIO` 6336 / `MAX_SPAN=4` | 非法比例置灰 + 抖动提示 |
| 响应式 | `--ad-cols` 按板宽 4→3→2→1 | 自动 |

### 2.4 多实例支持（当前仅 countdown 支持，需扩展）

- 现状：`countdown` 靠 `settings.countdown` 数组 + `data-cd-idx` + `renderEnabledModules` 特殊分支（7958-7967）实现多实例
- 扩展设计：注册表增加 `multi: true` + `instances()` 取值函数，把 7954-7967 的 units 展开逻辑改为通用；`openAddMenu`（8873）增加多实例入口；删除分支（8502）通用化
- 受益模块：`checklist`（多个清单）、`shortcuts`（多个快捷栏）

### 2.5 风格统一规范（新模块必守）

- 卡片壳：`.ad-card .ad-b-{id}` + `data-mod`，内容区 `flex column, gap 10px`
- 头部：统一 `cardHead(icon, title, hint)`；图标用几何符号（◆ ◉ ◑ ⬡ 等），与现有风格一致
- 颜色：只用 `var(--ad-text / --ad-text-dim / --ad-line / --ad-s1~s3 / --ad-accent / --ad-r1~r3 / --ad-font)`，**禁止写死颜色**
- 字号：`clamp(9px, Xcqi, Ypx)`（容器查询，随卡宽等比缩放）
- 反馈：hover 用 `--ad-h1` 背景 + `--ad-line` 边框；圆角 `--ad-r1/r2`
- 空态：统一 `.ad-{id}__empty` 灰字提示（如「暂无习惯」）

### 2.6 实施顺序建议

1. `checklist`（方案一）— 独立、价值最高，同时验证框架接入是否顺畅
2. `shortcuts` — 结构最简单，顺便验证多实例扩展
3. `habit` → `schedule`
4. 最后按需扩展多实例机制

---

## Part 3. 维护：插件更新后重新应用

本方案改动的是编译产物 `main.js`，**Xove 每次更新都会覆盖**。沿用既有约定：
- 实施后把每处改动补写进姊妹补丁文档（参考 `xove-thino-patch_2026-09-01.md` 的格式）
- 更新后：读 `manifest.json` 确认版本 → 按锚点（Part 0 表格的函数名）重打 → `node --check` 校验 → 重载插件
- 备份优先：`backups/xove-dashboard_{日期}/`

---

## Part 4. 待你确认的决策点

1. **分组层级**：你的文件用 `## `（h2）分组 —— 默认按 h2 分组，可以吗？（也可设成自动取「最高层级标题」）
2. **点击行为**：建议「checkbox 区 = 勾选，文本区 = 打开源文件」，是否符合你的习惯？
3. **完成日期**：勾选时自动追加 ` ✅ YYYY-MM-DD`？（沿用你现有写法）
4. **默认启用**：建议默认启用，`order=8`，尺寸 `2×2`（内容较长）
5. **工作台模块优先级**：`habit` / `shortcuts` / `schedule` 先做哪个？
6. **多实例**：`shortcuts` 是否需要「工作 / 生活」多个快捷栏？

确认后即开始实施（顺序：备份已有 → `checklist` → 验证 → 其余模块）。
