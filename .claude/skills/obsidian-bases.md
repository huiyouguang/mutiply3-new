---
name: obsidian-bases
description: 创建和编辑 Obsidian Bases（.base 文件），适配本仓库已有的书籍库、影视库、Inbox、最近编辑等数据库视图的 filters、views、formulas 等语法。
---

# Obsidian Bases Skill（定制版）

基于本仓库现存的 4 个 `.base` 文件（Inbox、书籍总库、影视剧库、最近编辑）的使用模式进行定制。

## 快速上手

本仓库的 Bases 文件位于 `08数据库/` 目录。以下是根据已有文件总结的核心模式。

## 已有的 4 个 Base 文件解析

### 1. Inbox.base — 稍后阅读（Table 视图）
```yaml
views:
  - type: table
    name: 稍后阅读
    filters:
      and:
        - or:
            - tag.contains("ToRead")
            - file.tags.contains("ToRead")
    order:
      - file.name
      - stars
      - file.ctime
    sort:
      - property: file.ctime
        direction: DESC
      - property: file.name
        direction: ASC
```

### 2. 书籍总库.base — 书籍卡片（Cards 视图）
```yaml
views:
  - type: cards
    name: 书籍总库
    filters:
      and:
        - file.inFolder("05Books")
        - or:
            - this.关键词.isEmpty()
            - file.name.contains(this.关键词)
            - aliases.contains(this.关键词)
            - file.tags.join(" ").contains(this.searchTerm)
        - '!file.tags.contains("index")'
        - '!file.path.contains("weread")'
    order:
      - file.name
      - 作者
      - 豆瓣评分
    sort:
      - property: file.ctime
        direction: DESC
    image: note.封面
    imageAspectRatio: 1.45
    cardSize: 120
    imageFit: contain
```

### 3. 影视剧库.base — 影视卡片（Cards 视图）
```yaml
views:
  - type: cards
    name: 影视库
    filters:
      and:
        - file.inFolder("06Movies")
        - or:
            - this.searchTerm.isEmpty()
            - file.name.contains(this.searchTerm)
            - aliases.contains(this.searchTerm)
            - file.tags.join(" ").contains(this.searchTerm)
            - director.contains(this.searchTerm)
        - '!file.tags.contains("index")'
    order:
      - file.name
      - 豆瓣评分
      - 影视类型
    sort:
      - property: file.ctime
        direction: DESC
    image: note.封面
    imageAspectRatio: 1.25
    cardSize: 130
```

### 4. 最近编辑.base — 多视图（Table）
```yaml
views:
  - type: table
    name: 最近编辑
    filters:
      and:
        - file.name != this.file.name
        - file.mtime >= now() - "30 d"
    order: [file.name, file.mtime, file.folder]
    sort: [{property: file.mtime, direction: DESC}]
    limit: 50
  - type: table
    name: 今日创建
    filters: [file.ctime.date() == date(this.date)]
    sort: [{property: file.ctime, direction: DESC}]
  - type: table
    name: 今日修改
    filters: [file.mtime.date() == date(this.date)]
    sort: [{property: file.mtime, direction: DESC}]
```

## Schema（基于本仓库语法）

```yaml
# 全局过滤器
filters:
  and:
    - '条件1'
    - '条件2'
  or:
    - '条件A'
    - '条件B'
  not:
    - file.hasTag("排除标签")

# 属性显示配置
properties:
  property_name:
    displayName: 显示名称

# 定义视图
views:
  - type: table      # table / cards / list / map
    name: 视图名称
    limit: 50
    filters:         # 视图级过滤器（可选，覆盖全局）
      and: []
    order:
      - file.name
      - property_name
    sort:
      - property: file.ctime
        direction: DESC
    # Cards 视图专用属性
    image: note.封面
    imageAspectRatio: 1.25
    cardSize: 130
    imageFit: contain
```

## 过滤器语法（适配本仓库）

### 路径过滤
```yaml
file.inFolder("05Books")                     # 在某个文件夹内
'!file.path.contains("weread")'              # 排除路径
```

### 标签过滤
```yaml
file.tags.contains("tagName")                # 包含标签
tag.contains("ToRead")                       # 标签字段包含
'!file.tags.contains("index")'                       # 不包含标签
file.tags.join(" ").contains(this.关键词)     # 标签拼接搜索
```

### 属性过滤
```yaml
this.关键词.isEmpty()                         # 搜索框为空（显示全部）
file.name.contains(this.关键词)               # 文件名包含搜索关键词
aliases.contains(this.关键词)                  # 别名中搜索
director.contains(this.searchTerm)             # 导演字段搜索（影视库）
```

### 时间过滤
```yaml
file.mtime >= now() - "30 d"                  # 30天内修改
file.ctime.date() == date(this.date)           # 今日创建
```

### 文件名过滤
```yaml
file.name != this.file.name                    # 排除当前文件自己
```

## 视图排序（适配本仓库）

```yaml
sort:
  - property: file.ctime
    direction: DESC       # DESC 降序 / ASC 升序
  - property: file.name
    direction: ASC
```

Cards 视图可直接在 `order` 中指定排序属性：
```yaml
order:
  - file.name
  - 作者
  - 豆瓣评分
```

## 嵌入 Bases

在 Markdown 文件中嵌入：
```markdown
![[Inbox.base]]
![[书籍总库.base#书籍总库]]       # 指定视图
```

## 本仓库常见的 Base 创建场景

### 场景一：CPA 错题汇总 Base
```yaml
views:
  - type: table
    name: 会计错题汇总
    filters:
      and:
        - file.inFolder("04成长/知识管理/错题库/会计")
        - '掌握程度 != "已掌握"'
    order:
      - file.name
      - 章节
      - 做题时间
    sort:
      - property: 做题时间
        direction: DESC
    limit: 30
```

### 场景二：CPA 学习进度 Base
```yaml
views:
  - type: table
    name: 会计学习进度
    filters:
      and:
        - file.inFolder("04成长/知识管理/004 注会/001 会计")
    order:
      - file.name
      - 主要程度
      - 分值
    sort:
      - property: 分值
        direction: DESC
```

### 场景三：任务状态 Base
```yaml
views:
  - type: table
    name: 待完成
    filters:
      and:
        - file.inFolder("01 task")
    order:
      - file.name
      - file.mtime

  - type: table
    name: 已完成
    filters:
      'file.name != this.file.name'
    order:
      - file.name
```

## Troubleshooting

### 常见错误
- **引号不匹配**：条件中含有双引号时，整个条件用单引号包裹
```yaml
# 正确
filters: 'file.inFolder("05Books")'
# 错误
filters: "file.inFolder("05Books")"
```

- **this.关键词** 用于搜索框搜索，若 Base 文件中未定义关联属性则无效

## References
- [Bases Syntax](https://help.obsidian.md/bases/syntax)
- [Bases Functions](https://help.obsidian.md/bases/functions)
- [Bases Views](https://help.obsidian.md/bases/views)
- [Bases Formulas](https://help.obsidian.md/formulas)
