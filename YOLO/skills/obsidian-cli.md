---
name: obsidian-cli
description: 通过 Obsidian CLI 与本仓库交互，适配 CPA/中级备考场景的笔记创建、Thino 闪念笔记操作、Task 任务管理、错题整理等常见操作。
---

# Obsidian CLI（定制版）

使用 `obsidian` CLI 与本仓库交互。需要 Obsidian 处于打开状态。

## 知识库结构（快速参考）

```
📁 mutiply-main/
├── 01 task/               # 备考任务文件
├── 04成长/知识管理/
│   ├── 004 注会/          # CPA 6科笔记
│   │   ├── 001 会计/
│   │   ├── 002 审计/
│   │   ├── 003 经济法/
│   │   ├── 004 战略/
│   │   ├── 005 财管/
│   │   └── 006 税法/
│   └── 错题库/            # 各科错题
├── 08数据库/               # Base 数据库视图
├── canvas/                 # 思维导图画布
├── thino/                  # 闪念笔记（Thino）
└── Templates/              # 笔记模板
```

## 常用命令

### 笔记操作

```bash
# 读取笔记
obsidian read file="001 总论"

# 创建知识点笔记（使用模板）
obsidian create name="006 长期股权投资" \
  content="# 长期股权投资" \
  path="04成长/知识管理/004 注会/001 会计/会计知识点" \
  template="笔记常用模版 new" silent

# 在笔记末尾追加内容
obsidian append file="001 总论" content="## 1 补充内容\\n新知识点"

# 搜索知识点
obsidian search query="长期股权投资" limit=10
obsidian search query="科目类别:会计知识点" limit=20
obsidian search query="#注册会计师" limit=30
```

### 每日闪念笔记（Thino）

```bash
# 读取今日 Thino
obsidian daily:read

# 追加闪念内容
obsidian daily:append content="- 21:00 \\t 今天学习了长期股权投资的权益法核算"

# 读取指定日期的 Thino
obsidian read path="thino/2026-05-21.md"
```

### Task 任务管理

```bash
# 查看今日待办
obsidian tasks daily todo

# 查看 CPA 相关任务
obsidian search query="#project/注册会计师" limit=20

# 查看中级会计任务
obsidian search query="#project/中级会计" limit=20

# 统计各科目标签
obsidian tags sort=count counts
```

### 属性操作

```bash
# 设置笔记属性
obsidian property:set name="复习次数" value="3" file="001 总论"
obsidian property:set name="主要程度" value="核心" file="005 投资性房地产"
obsidian property:set name="掌握程度" value="已掌握" file="会计错题"

# 读取属性
obsidian property:get name="主要程度" file="001 总论"
obsidian property:get name="分值" file="001 总论"
```

### 错题整理

```bash
# 创建错题笔记
obsidian create name="长投成本法错题" \
  content="备注：错误原因..." \
  path="04成长/知识管理/错题库/会计" \
  template="错题模板" silent

# 查询未掌握的错题
obsidian search query="掌握程度:未掌握" limit=20
```

### Base 数据库操作

```bash
# 查看所有 Base 文件
obsidian search query="*.base" limit=10

# 读取 Inbox（稍后阅读）
obsidian read path="08数据库/Inbox.base"

# 查看最近编辑
obsidian read path="08数据库/最近编辑.base"
```

### 画布操作

```bash
# 创建思维导图
obsidian create name="投资性房地产" \
  path="canvas" silent

# 搜索画布文件
obsidian search query="*.canvas" limit=10
```

## 文件路径速查

```bash
# 方法一：使用 wikilink 风格（按文件名匹配，无需路径）
obsidian read file="001 总论"

# 方法二：使用完整路径（从 vault 根目录）
obsidian read path="04成长/知识管理/004 注会/001 会计/会计知识点/001 总论.md"
```

## Vault 定位

本仓库只有一个 vault，默认会自动识别。如需指定：
```bash
obsidian vault="mutiply-main" search query="#注册会计师"
```

## 模板管理

```bash
# 查看可用模板
obsidian read path="Templates/笔记常用模版 new.md"
obsidian read path="Templates/错题模板.md"
obsidian read path="Templates/中级模版.md"

# 使用模板创建笔记（模板会填充默认 frontmatter）
obsidian create name="新笔记" template="中级模版" silent
```

## 调试与开发

```bash
# 查看 vault 文件总数
obsidian eval code="app.vault.getFiles().length"

# 查看插件列表
obsidian eval code="app.plugins.plugins"

# 查看 Obsidian 版本
obsidian help
```

## 注意事项

- Obsidian CLI 需要 Obsidian 客户端处于打开状态
- `silent` 参数防止文件自动打开
- 多行内容使用 `\\n` 换行，`\\t` 制表符
- `file=` 按名称匹配（类似 wikilink），`path=` 按完整路径匹配
- 完整命令文档：`obsidian help` 或 https://help.obsidian.md/cli
