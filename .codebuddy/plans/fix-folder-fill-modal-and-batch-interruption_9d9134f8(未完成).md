---
name: fix-folder-fill-modal-and-batch-interruption
overview: 修复文件夹填充时没有弹出字段选择弹窗的问题，以及批量填充时处理到第2个文件后中断的问题。
todos:
  - id: fix-updatefm
    content: 修复 U.updateFM：当文件无 Frontmatter 时，创建新的 Frontmatter 块而非返回原文
    status: pending
  - id: fix-folder-menu
    content: 合并文件夹右键菜单："AI 填充该文件夹属性" 改为走 FillConfigModal 流程，移除冗余菜单项
    status: pending
  - id: fix-callai-log
    content: 改进 _callAI 的错误日志：catch(e) 改为输出 console.error
    status: pending
  - id: fix-batch-delay
    content: 批量填充中 AI 调用间隔 300ms + 每次处理后刷新 metadataCache
    status: pending
---

修复两个核心问题：

**问题 1：右键文件夹填充时没有弹出字段选择**
当前右键文件夹时有两条菜单项："AI 填充该文件夹属性"（直接调 `_fillMul`，只弹确认框）和"选择字段填充该文件夹..."（打开 `FillConfigModal`）。用户期望前者也能弹出字段选择弹窗。需将两个菜单项合并为一个流程：统一为弹出 `FillConfigModal`（含组合选择和字段勾选），确认后执行批量填充。

**问题 2：批量填充只处理了部分文件就断了**
根因在 `U.updateFM`（第 169 行）：对于没有 Frontmatter 的笔记，`getFMRange` 返回 `null`，函数直接 `return c`（返回原文不变），导致 `updateFile` 判断 `mod: false`，该文件不被计数。同时 `_callAI` 中 `catch(e){}` 为空，AI 调用失败的异常被静默吞掉，无明显日志。另外批量填充中连续 AI 调用无间隔，可能触发 API 限流。

## 技术方案

### 涉及文件

- `/Users/guochenfa/Nutstore Files/.symlinks/坚果云/mutiply-main/.obsidian/plugins/auto-ai-property/main.js`

### 修改点

**1. 修复 `U.updateFM` 对无 Frontmatter 文件的处理**

- 文件：`main.js` 第 168-179 行
- 当前：`if(!rg)return c;` → 直接返回原文，不会创建 Frontmatter
- 修复后：当 `rg` 为 `null` 时，如果 `newFields` 不为空，构造新的 `---\nkey: value\n---\n` + 原文 返回。这使 `updateFile` 能正确检测到内容变化并写入文件。
- 这修复了无 Frontmatter 笔记无法被批量填充的问题

**2. 合并文件夹右键菜单为 FillConfigModal 流程**

- 文件：`main.js` 第 543-547 行
- 当前："AI 填充该文件夹属性"直接调用 `_fillMul(folderFiles, confirmMsg, null)`
- 修复后：该菜单项改为调用 `self._cfgFolderWith(file)`，与"选择字段填充该文件夹..."合并，统一走 `FillConfigModal` 弹窗→字段选择→批量填充流程
- 移除冗余的"选择字段填充该文件夹..."菜单项

**3. 改进 `_callAI` 的错误日志**

- 文件：`main.js` 第 255 行
- 当前：`catch(e){}`
- 修复后：`catch(e){console.error('[AAP] AI call error:', e.message||e)}`
- 确保任何 AI 调用失败都能在控制台看到原因

**4. 批量填充时 AI 调用间隔**

- 文件：`main.js` 第 585-587 行
- 当前：连续调用无间隔
- 修复后：在 `Analyzer.fill` 后（如果该次填充包含 AI 字段）增加 300ms 延迟，避免 API 限流

**5. `_fillMul` 中每次文件处理后刷新 metadataCache**

- 文件：`main.js` 第 585-587 行
- 添加 `app.metadataCache.trigger('changed', file)` 确保 Obsidian 实时感知文件变化

## Agent Extensions

### SubAgent

- **code-explorer**
- 用途：在编写计划前对代码库进行高效探索，定位修改目标文件和具体代码行
- 预期产出：确认 `main.js` 中 `updateFM`、`_menu`、`_callAI`、`_fillMul` 的准确位置和完整代码上下文

### Skill

- **debug-pro-1.0.0**
- 用途：用于诊断批量填充中断时的未捕获异常和时序问题
- 预期产出：确认 `updateFM` 中对无 Frontmatter 文件返回 `c` 不变是导致 success 不递增的根因