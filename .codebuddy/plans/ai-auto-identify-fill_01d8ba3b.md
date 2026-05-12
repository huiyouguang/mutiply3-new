---
name: ai-auto-identify-fill
overview: 新增 AI 智能识别填充模式：AI 自主分析笔记内容决定 Frontmatter 属性，新字段自动加入配置列表，支持单文件/文件夹/整库三种作用域。
todos:
  - id: add-translations
    content: 新增 zhCN/en 翻译：commands 3 条 + messages 7 条
    status: completed
  - id: add-analyzeAuto
    content: 在 Analyzer 中新增 analyzeAuto 方法：AI 自由识别属性
    status: completed
  - id: add-preview-modal
    content: 新增 AutoFillPreviewModal：展示新增/更新字段对比，用户确认
    status: completed
    dependencies:
      - add-translations
  - id: add-plugin-methods
    content: 新增 fillNoteAuto, _fillAutoMul, _addAutoFields 方法
    status: completed
    dependencies:
      - add-analyzeAuto
      - add-preview-modal
  - id: add-commands-and-menu
    content: 注册 3 条命令 + 右键菜单 3 处新增入口
    status: completed
    dependencies:
      - add-plugin-methods
      - add-translations
---

## AI 智能识别填充模式

新增一种独立的 AI 填充模式：AI 自由阅读笔记内容，自主判断应该添加哪些 Frontmatter 属性字段，不受预设字段列表限制。

### 核心功能

1. **AI 自主识别**：不依赖预设字段列表，AI 自由分析笔记内容来决定合适的属性字段和值
2. **三场景覆盖**：单文件 / 文件夹批量 / 整库批量，均可通过命令面板和右键菜单触发
3. **新字段自动注册**：AI 识别出的新属性字段自动添加到插件设置字段列表中，后续可用其他模式继续填充
4. **覆盖需确认**：单文件模式下弹出详细对比弹窗（新增字段 + 将覆盖的已有字段），用户确认后才写入
5. **独立命令**：注册独立的命令条目，可绑定快捷键

### 交互流程

- **单文件**：AI 分析 → 弹出预览弹窗（展示新增字段和将覆盖的已有字段对比）→ 用户确认 → 写入文件并自动注册新字段到配置
- **批量（文件夹/整库）**：弹出确认框（显示文件数量）→ 逐文件 AI 分析并写入（显示进度）→ 最终结果显示 → 新字段统一注册到配置

## 技术方案

### 涉及文件

- `/Users/guochenfa/Nutstore Files/.symlinks/坚果云/mutiply-main/.obsidian/plugins/auto-ai-property/main.js`

### 实现策略

整体策略：复用现有的 Analyzer、LLM、U 工具模块，新增独立的 `analyzeAuto` 方法和 `AutoFillPreviewModal` 弹窗，不修改已有填充逻辑。

### 新增模块详解

**1. Analyzer.analyzeAuto(s, ct)** — 第 239 行 Analyzer 对象内新增

与现有 `analyze` 的区别：

- `analyze` 依赖 `getFields()` 获取预设字段列表，再调用 `getEmpty()` 筛选空字段
- `analyzeAuto` 不依赖预设字段，直接将笔记内容发送给 AI，prompt 为："请分析以下笔记内容，自行判断哪些 Frontmatter 属性字段是合适的，输出 YAML 键值对，不要额外解释"
- 直接调用 `LLM.call()` 后 `U.parseAI()` 解析，返回 `{key: value}` 对象

```javascript
analyzeAuto: async function(s, ct){
  try{
    var sys='你是一个 Obsidian 笔记属性分析助手。请根据笔记内容，推断出最合适的 Frontmatter 属性字段。';
    var usr='请分析以下笔记内容，输出 YAML 键值对，每行一个字段，不要额外解释和代码块标记：\n\n'+ct;
    var r=await LLM.call(s,sys,usr);
    return U.parseAI(r);
  }catch(e){console.error('[AAP] analyzeAuto error:', e.message||e);return {};}
}
```

**2. AutoFillPreviewModal** — 第 342 行后新增

新弹窗类，用于单文件模式：

- 构造函数接收：`app`, `plugin`, `file`, `aiFields`(AI 返回的字段), `existing`(原文件已有字段), `onConfirm`(回调)
- `onOpen` 渲染：
- 标题："AI 识别结果预览"
- 区域 1 绿色徽章"新增字段 (N 个)"：列出 AI 建议但原文件不存在的属性及其值
- 区域 2 橙色徽章"更新字段 (N 个)"：列出 AI 建议且原文件已有但值不同的属性，显示"旧值 → 新值"对比
- 区域 3"无需变更 (N 个)"：AI 未输出的已有字段（折叠显示）
- 底部按钮：取消 / 确认填充
- `onClose` 清理

**3. PluginClass 新增方法** — 第 582 行附近

- `fillNoteAuto(file)`：

1. 读取笔记内容并校验非空
2. 调用 `Analyzer.analyzeAuto()` 获取 AI 建议字段
3. 解析原有 Frontmatter 得到 `existing`
4. 对比得到 `add`(新增) 和 `update`(覆盖) 两组
5. 若都为空 → Notice "AI 未发现需要新增或更新的属性"
6. 否则弹出 `AutoFillPreviewModal`，用户确认后：

    - 调用 `Analyzer.updateFile(app, file, aiFields, false)`（eoo=false 强制覆盖）
    - 调用 `_addAutoFields(aiFields)` 注册新字段
    - 刷新视图

- `_fillAutoMul(files, confirmMsg)`：

1. `_clean()` 过滤排除文件夹
2. 若有 `confirmMsg` 则弹出 `ConfirmModal`
3. 逐文件：`Analyzer.analyzeAuto()` → `Analyzer.updateFile()` → 计数 → 300ms 间隔
4. 结束后调用 `_addAutoFields()` 统一注册所有新字段
5. Notice 显示结果

- `_addAutoFields(aiFields)`：

1. 遍历 `Object.keys(aiFields)`
2. 若 `settings.propertyFields` 中无同名项（忽略大小写）
3. 则追加 `{name: key, enabled: true, strategy: 'ai', description: '', options: [], allowCustom: true}`
4. 追加后调用 `saveSettings()`

**4. 新命令注册（3 条）** — 第 537-549 行 `_cmds()`

```javascript
this.addCommand({id:'fill-note-auto', name:'AI 智能识别填充属性', icon:'sparkles', editorCallback:function(ed,ctx){...self.fillNoteAuto(v.file);}});
this.addCommand({id:'fill-folder-auto', name:'AI 智能识别填充当前文件夹', icon:'sparkles', callback:function(){...self._fillAutoMul(f2, confirmMsg);}});
this.addCommand({id:'fill-vault-auto', name:'AI 智能识别填充整个库', icon:'sparkles', callback:function(){...self._fillAutoMul(f3, confirmMsg);}});
```

**5. 右键菜单新增（3 处）** — 第 550-568 行 `_menu()`

- 单文件：新增 "AI 智能识别填充属性" → `fillNoteAuto(file)`
- 文件夹：新增 "AI 智能识别填充该文件夹属性" → 确认后 `_fillAutoMul(folderFiles, msg)`
- 多文件选中：新增 "AI 智能识别填充 (N 个文件)" → `_fillAutoMul(mf, null)`

**6. 翻译新增** — 第 5-45 行 zhCN、第 47-89 行 en

zhCN 新增：

- `commands.autoFillNote: 'AI 智能识别填充属性'`
- `commands.autoFillFolder: 'AI 智能识别填充当前文件夹'`
- `commands.autoFillVault: 'AI 智能识别填充整个库'`
- `messages.autoPreviewTitle: 'AI 识别结果预览'`
- `messages.autoNewFields: '新增字段'`
- `messages.autoUpdateFields: '更新字段'`
- `messages.autoNoChanges: 'AI 未发现需要新增或更新的属性'`
- `messages.autoConfirmBatch: 'AI 将分析 {count} 个文件，自动判断并填充属性，是否继续？'`
- `messages.autoFillProgress: 'AI 分析 {current}/{total} 个文件...'`
- `messages.autoFillSuccess: 'AI 识别填充完成，更新 {success}/{total} 个文件'`

en 对应翻译。

### 关键设计决策

| 决策 | 选择 | 理由 |
| --- | --- | --- |
| 单文件弹窗确认 | AutoFillPreviewModal 展示新增/更新对比 | 用户要求"每次都确认"，弹窗对比清晰可见 |
| 批量不逐个确认 | 仅开始前一次确认 + 进度 + 最终结果 | 逐个确认 N 次不现实，用户体验极差 |
| 新字段去重 | 大小写不敏感比较，同名不追加 | 避免 AI 每次输出相同字段导致配置列表膨胀 |
| 覆盖策略 | `updateFile` 传 `eoo=false` | AI 识别模式下，AI 的判断优先级高于原值 |
| icon 选择 | `sparkles` | Obsidian 内置图标，与现有 `wand` 区分 |


### 性能考虑

- 批量模式同现有 `_fillMul`，每文件间 300ms 间隔避免 API 限流
- `_addAutoFields` 只在批量结束后调用一次，不每文件调用
- AutoFillPreviewModal 无需额外 API 调用，数据在 `analyzeAuto` 时已获取

### 目录结构

仅修改一个文件：

```
.obsidian/plugins/auto-ai-property/
  main.js  # [MODIFY] 新增 Analyzer.analyzeAuto, AutoFillPreviewModal, 
           #         fillNoteAuto, _fillAutoMul, _addAutoFields,
           #         3 条命令, 3 处右键菜单, 翻译
```

## Agent Extensions

### Skill

- **debug-pro-1.0.0**
- 用途：在实现和测试阶段用于诊断 AI 识别模式的异常路径，包括 AI 返回空结果、YAML 解析失败、字段注册冲突等边界情况
- 预期产出：确保所有异常路径有合理兜底，不会因为单文件异常导致批量中断