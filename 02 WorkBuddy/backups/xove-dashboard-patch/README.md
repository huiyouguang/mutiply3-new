# Xove Dashboard 定制补丁

对官方 `xove-dashboard` v0.3.1 的本地定制。官方插件更新会覆盖 `main.js` / `styles.css` / `manifest.json`，
本目录保存补丁与原始文件，便于升级后一键重打。

> 插件名称已改为 `Xove Dashboard (定制版·勿更新)`，`manifest.json` 版本锁定 `99.99.99`，
> Obsidian / BRAT 不再提示更新。在设置 → 第三方插件里可一眼辨认。

---

## 一、定制内容

| # | 功能 | 说明 |
|---|---|---|
| 1 | 目标进度支持自定义 | 每个目标可 ⚙ 编辑 / ✕ 删除，卡片底部「+ 新增目标」；弹窗可设名称、目标值、单位、图标、颜色 |
| 2 | 写作目标自动字数统计 | 目标可设为「自动统计 = 字数统计」，中文按字、英文按词，自动剔除 frontmatter；默认统计全库（已排除 `node_modules`），可在弹窗填文件夹限定；**持久缓存 + 后台重算**，首屏秒出不卡顿 |
| 3 | 主页「导入」→「新建」 | 导航按钮改为「新建」，提供三个一级入口：**新建日记**（内联输入 → `createCaptureNote`）、**新建任务**（`openTaskModal`）、**新建项目**（`createProjectFile`）；次要区块保留「映射已有笔记为首页卡片」（折叠 + 懒加载） |
| 4 | 修复默认目标复活 | 官方逻辑在目标为空时会回退默认目标，导致「删光目标」无效；现仅在字段缺失时初始化 |
| 5 | 切断更新 | `manifest.json` 版本锁定 `99.99.99`，Obsidian / BRAT 不再提示更新 |

---

## 二、功能详细操作

### 1. 自定义目标（首页「目标进度」卡片）

- **新增**：卡片底部「+ 新增目标」→ 弹窗填写：
  - 名称（如「写作字数」）
  - 目标值（数字）、单位（如「字 / 本 / 天」）
  - 图标（任意 emoji）、颜色（进度条颜色）
  - 自动统计：选「手动（± 按钮调整）」或「字数统计（自动）」
  - 统计范围：仅自动统计时生效，留空 = 整个库；填文件夹路径（如 `07 成长`）只统计该目录
- **编辑**：点目标右侧 ⚙ → 同上方弹窗，改完保存即刷新。
- **删除**：点目标右侧 ✕ → 该目标从 `data.json` 移除（不再复活默认目标）。
- **手动目标**：带「- / +」按钮，每点一次 `current` ±1，用于跑步天数、打卡天数等。

### 2. 写作字数自动统计

- 在目标编辑弹窗里把「自动统计」选为「字数统计（自动）」，保存后**打开首页即自动刷新真实字数**，不再需要手动点 +。
- 统计口径：遍历所有 `.md`，用 `cachedRead` 读取后剔除 `---` 包裹的 YAML frontmatter；
  中文按字符数计，英文/数字按「词」计（连续字母数字算一个）。
- 已自动排除 `node_modules`（你库里有 `02 WorkBuddy/node_modules`，否则会把第三方库字数算进去）。
- 结果按「统计范围」缓存 60 秒，避免每次打开首页都全库扫描（库内约 1097 个 md）。
- **想只统计写作目录**：编辑该目标，「统计范围」填你的写作文件夹（如 `07 成长`），保存后再打开首页即仅统计该目录。
- 当前已默认开启：首页「写作字数」目标 `auto=wordcount`、`folder=`（全库）。

### 3. 主页「新建」按钮

首页导航栏的「导入」已改为「新建」，进入后是**三个一级创建入口 + 一个折叠的次要区块**：

| 入口 | 行为 | 落点 |
|---|---|---|
| **新建日记** | 点开内联输入框，⌘/Ctrl+Enter 或点「保存」 | `createCaptureNote()` —— 按「快速捕获」设置写入日记（`daily` 模式追加到当日日记，`file` 模式建独立 md） |
| **新建任务** | 直接弹出 Xove 原生任务弹窗 | `openTaskModal()` → `createTaskFile()` |
| **新建项目** | 直接弹出 Xove 原生项目弹窗 | `createProjectFile()` → `createProjectFolder()` |

- 三者**全部复用 Xove 原生创建流程**，数据格式与「快速捕获」「全部项目」模块完全一致，不会出现自建结构对不上的问题。
- 支持键盘操作：`Tab` 聚焦卡片，`Enter`/`Space` 触发。
- **映射已有笔记为首页卡片**（次要区块，默认折叠）：展开时才构建文件下拉列表（库内上千 md，避免每次进页面都排序加载）；把已有 md 映射成首页卡片。

> 改名说明：原「导入」按钮文案由 `data.json` 的 `importTitle` 控制（默认已改为「新建」），也可在插件设置里手动改回或改成别的。

---

## 三、目录说明

| 文件 | 用途 |
|---|---|
| `apply-patch.sh` | 一键重打补丁（先备份 → 打补丁 → 锁版本 → 语法校验） |
| `xove-main.patch` | `main.js` 的 unified diff（针对 v0.3.1） |
| `xove-styles.patch` | `styles.css` 的 unified diff |
| `main.js.orig` / `styles.css.orig` | 官方 v0.3.1 原始文件 |
| `main.js.patched` / `styles.css.patched` | 打好补丁的成品，可直接复制覆盖 |
| `README.md` | 本文档 |

---

## 四、使用方法

插件被更新（定制失效）后执行：

```bash
bash apply-patch.sh                                  # 默认插件目录
bash apply-patch.sh /path/to/.obsidian/plugins/xove-dashboard
```

脚本流程：备份为 `*.bak.<时间戳>` → 应用补丁（已打过会自动跳过）→ 锁定 `manifest` 版本 → `node --check` 语法校验。

正常输出末尾为 `🎉 完成`。改完需**重启 Obsidian**（或禁用再启用插件）生效。

### 升级后如何确认定制还在

- 看插件名是否为 `Xove Dashboard (定制版·勿更新)`、版本是否为 `99.99.99`
- 打开首页，目标卡片是否有「+ 新增目标」按钮、导航是否有「新建」

---

## 五、技术改动清单（供升级手动合并参考）

`main.js` 为编译产物，补丁以函数为单位，行号随版本变化，合并新版时按函数名定位：

定位标记：`class GoalEditModal`（main.js）、`im-grid`（styles.css）。

| 改动 | 所在函数 / 位置 | 作用 |
|---|---|---|
| 新建页入口表 | 新增常量 `XOVE_CREATE_ENTRIES`（`ImportBoard` 之前） | 声明式定义三个入口（标题/描述/SVG 图标），新增入口只改这一处 |
| 新建页重构 | `class ImportBoard`（`renderHead` / `renderCreateGrid` / `renderDiaryPanel` / `renderMapSection` / `renderMirrorList` / `runCreate` / `submitDiary`） | 渲染按职责拆分；入口分发到 Xove 原生创建流程 |
| 目标编辑弹窗 | `class GoalEditModal`（字段配置化） | 字段用数组声明后统一渲染，新增字段只加一行 |
| 目标渲染 | `renderGoals` + `commit()` + `renderList()` | 保存与渲染解耦；每个目标 ⚙/✕，底部「+ 新增目标」 |
| 目标初始化修正 | `renderGoals` 开头 + 启动时迁移逻辑 | 空数组不再回退默认目标 |
| 字数统计 | `countWordsInFolder` / `refreshAutoGoals` / `recomputeWordCounts` | 分批并发统计；持久缓存 + 后台重算 |
| 按钮文案默认 | `importTitle` 默认值 + 迁移修复 | 默认「新建」 |
| 样式 | `styles.css` 末尾追加 | `.im-grid` / `.im-card` 入口卡、`.im-diary` 日记区、`.im-section` 折叠区、`.ad-gform__*` 弹窗表单 |

---

## 六、重构要点（结构 / 性能 / 扩展）

### 6.1 结构：职责拆分，一处声明
- **入口声明化**：三个创建入口写在 `XOVE_CREATE_ENTRIES` 常量里（图标/标题/描述），渲染循环消费它——以后加「新建灵感」等入口，只改常量不动渲染逻辑。
- **渲染分块**：`ImportBoard` 拆成 `renderHead` / `renderCreateGrid` / `renderDiaryPanel` / `renderMapSection` / `renderMirrorList`，每块单一职责，改哪块看哪块。
- **弹窗字段配置化**：`GoalEditModal` 用 `fields` 数组声明字段后统一渲染，加字段只加一行。
- **保存与渲染解耦**：目标模块拆出 `commit()`（写配置）与 `renderList()`（重绘），互不嵌套。

### 6.2 性能：不阻塞首屏
| 措施 | 说明 |
|---|---|
| 字数统计持久缓存 | 结果存 `settings.wcCache`（跨会话），打开首页**先用缓存秒出**，不再全库扫描 |
| 后台异步重算 | 缓存超过 `WC_TTL`（10 分钟）或无缓存时，`recomputeWordCounts` 在后台算，算完局部刷新 |
| 分批并发 | `countWordsInFolder` 每批 100 个文件 `Promise.all`，避免上千 Promise 一次性占满微任务队列 |
| 文件列表懒加载 | 映射区的下拉列表（库内上千 md）只在展开时才构建一次（`mapBuilt` 标记） |
| 排除依赖目录 | `node_modules/` 下的 md 不参与统计 |

### 6.3 视觉：与插件同语言
- 全部沿用插件既有 `--ad-*` 变量（背景/描边/文字/强调色/圆角），不引入新色值。
- 入口卡用内联 SVG 图标（不依赖字体、可缩放、随主题变色），标题/描述层级清晰。
- 微交互统一 180ms：`hover` 换边框+底色、`active` 轻微下沉、`focus-visible` 描边，键盘可达。
- 尊重系统「减少动态效果」：`prefers-reduced-motion` 下关闭过渡。

### 6.4 扩展点
| 想加什么 | 改哪里 |
|---|---|
| 新建页加第 4 个入口 | `XOVE_CREATE_ENTRIES` 加一项 + `runCreate()` 加一个分支（复用 Xove 原生方法即可） |
| 目标加新字段 | `GoalEditModal` 的 `fields` 数组加一行；渲染处读 `g.xxx` |
| 加新的自动统计口径（如文件数、任务完成数） | `refreshAutoGoals` 里按 `g.auto` 值分支 + 对应统计方法 |

---

## 七、撤销定制（恢复官方）

```bash
P=~/.obsidian/plugins/xove-dashboard
cp main.js.orig   "$P/main.js"
cp styles.css.orig "$P/styles.css"
# manifest 版本改回官方 0.3.1（第 5 项单独处理）
```

或直接禁用 / 卸载 Xove Dashboard 后重新安装官方版。

---

## 八、故障排查

| 现象 | 处理 |
|---|---|
| `main.js 补丁应用失败` | 官方大改版导致上下文不匹配。先 `cp main.js.patched "$P/main.js"` 恢复定制版；若要新版功能则需人工合并第五节清单 |
| 写作字数始终为 0 / 不刷新 | 确认该目标「自动统计」已选「字数统计（自动）」；首次无缓存时由后台重算，稍等几秒会自动刷新；检查「统计范围」是否正确 |
| 字数与我预期不符 | 统计口径：中文按字、英文数字按词，剔除 YAML frontmatter，且排除 `node_modules/`；想只统计写作目录就在「统计范围」填该文件夹 |
| 点「新建任务」「新建项目」没反应 | 这两个入口调用 Xove 原生弹窗（`openTaskModal` / `createProjectFile`）；若仍无反应，查看开发者控制台（Ctrl/Cmd+Shift+I）是否有报错 |
| 重启后定制消失 | 插件被更新覆盖了。按第四节重打补丁即可 |
| 修改无效果 | 必须重启 Obsidian 或禁用再启用插件才会重新加载 `main.js` |

---

## 注意

- 这是直接改编译产物，官方升级会覆盖，**必须重打本补丁**
- 若官方新增了你想要的功能，需人工把第五节清单里的改动合并进新版 `main.js`
- 修改后需**重启 Obsidian**（或禁用再启用插件）才生效
