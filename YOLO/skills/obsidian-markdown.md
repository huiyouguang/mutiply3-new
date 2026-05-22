---
name: obsidian-markdown
description: 创建和编辑 Obsidian 风味 Markdown，适配注册会计师/中级备考笔记的 wikilinks、callouts、frontmatter 属性、Tasks、挖空等专属语法。
---

# Obsidian 风味 Markdown Skill（定制版）

基于本仓库实际使用习惯，覆盖 Obsidian 特有的 Markdown 语法。

## Workflow: 创建一篇笔记

1. **添加 frontmatter**：使用本仓库的标准属性（科目类别、章节、主要程度、困难程度等）
2. **编写内容**：使用 `## 1` / `### 1.1` 三级标题结构
3. **链接相关笔记**：使用 `[[Note]]` 维基链接跨笔记引用
4. **嵌入内容**：使用 `![[embed]]` 嵌入图片、PDF、其他笔记
5. **添加 Callout**：使用 `> [!type]` 标注不同性质的提示块
6. **验证**：确认在 Obsidian 阅读视图中正确渲染

## Frontmatter 属性（适配本仓库）

### 学习笔记属性
```yaml
---
科目类别: 会计知识点        # 科目分类（会计知识点/审计知识点/经济法知识点/战略知识点/财管知识点/税法知识点）
章节: 会计概述              # 章节名称或编号
主要程度: 核心              # 核心 / 重要 / 一般 / 次要 / 了解
困难程度: 中等              # 简单 / 一般 / 中等 / 困难
复习次数:                   # 复习次数
分值: 9                    # 考试分值
创建时间: 2026-05-03       # 创建日期
文件名: 001 总论            # 文件名
结束日期:                  # 结束时间（ISO格式）
tags:                      # 标签数组
  - 注册会计师
  - 会计
---
```

### 错题属性
```yaml
---
科目类别: 注册会计师-会计
章节:
主要程度: 一般
困难程度: 一般
复习次数:
标签: 会计
做题时间: 2026-05-21
掌握程度: 未掌握            # 未掌握 / 部分掌握 / 已掌握
---
```

### Task / 任务属性
```yaml
---
科目类别: 01 task
创建时间: 2026-05-21T21:04:00.000Z
结束日期: 2026-05-21
文件分类: 01 task
文件名: 任务名称
PrevNote: "[[上一笔记]]"
NextNote: "[[下一笔记]]"
words:
  2026-05-19: 1666
---
```

### 播客笔记属性
```yaml
---
播客:
收藏标签:
季号:
结束日期:
文件分类:
---
```

## 内部链接（Wikilinks）

```markdown
[[Note Name]]                            链接到笔记
[[Note Name|显示文本]]                   自定义显示文本
[[Note Name#Heading]]                    链接到标题
[[Note Name#^block-id]]                  链接到块
[[#当前笔记中的标题]]                     同笔记内跳转
```

定义块 ID：
```markdown
这段内容可以被链接到。 ^my-block-id
```

## 嵌入（Embeds）

```markdown
![[图片.png]]                            嵌入图片
![[图片.png|300]]                        指定宽度嵌入图片
![[PDF文档.pdf#page=5]]                  嵌入 PDF 指定页
![[PDF文档.pdf#page=3&rect=100,100,300,300]] 嵌入 PDF 区域截图
![[其他笔记]]                             嵌入整篇笔记
![[其他笔记#标题]]                         嵌入笔记的某个章节
```

## Callout（提示块）

### 常用类型（按使用频率排序）

```markdown
> [!note] 标题
> 通用提示/定义说明

> [!tip] 快速记忆
> 记忆技巧、口诀提示

> [!warning] 易错点
> 需要特别注意的易错考点

> [!important] 核心要点
> 必须掌握的核心知识点

> [!info] 公式
> 计算公式、测试规则

> [!example] 例题
> 题目内容

> [!success]- 解析
> 折叠的例题解析（加 `-` 默认折叠）

> [!quote] 本章小结
> 章节末尾总结

> [!question] 问题
> 待思考的问题

> [!danger] 高危注意
> 严重错误警示
```

### 嵌套 Callout
```markdown
> [!example] 例题·反向购买每股收益
> 题目内容...
>
> > [!success] 解析
> > 2×22年基本每股收益 = ...
```

## 标签系统（适配本仓库）

```markdown
#注册会计师                   CPA 备考标签
#project/注册会计师           CPA 项目任务
#project/中级会计             中级会计项目
#中级经济法                   中级科目
#中级实务                     
#待办                         仪表盘待办
#ToRead                       稍后阅读
#主页/仪表盘                  主页导航
#主页/首页                    
#错题整理                     错题管理
#进度追踪
```

## Tasks 任务格式（适配本仓库）

使用 Obsidian Tasks 插件，优先级 + 日期 + 项目标签：

```markdown
- [x] 预习：财务报告目标 #注册会计师 #project/注册会计师 ✅ 2026-03-19
- [ ] 听课：重点理解会计信息质量要求 #注册会计师 #project/注册会计师 ⏫ 🛫 2026-05-21 ⏳ 2026-05-21 📅 2026-09-30
```

优先级：`🔺` 最高 > `⏫` 高 > `🔼` 中 > `🟩` 低
日期：`🛫` 开始 > `⏳` 计划 > `📅` 截止 > `✅` 完成

### 章节学习五步法模板
```markdown
- [ ] 第X章 章节名 #注册会计师 #project/注册会计师 ⏫ 🛫 2026-05-21 ⏳ 2026-05-21 📅 2026-09-30
  - [ ] 预习：[预习内容]
  - [ ] 听课：[听课重点]
  - [ ] 做题：完成N道客观题+N道主观题
  - [ ] 复盘：[关联考点总结]
    - [ ] 背诵打卡
```

## 挖空复习语法

```markdown
<span class="cloze-span">需要挖空的内容</span>
```

配合 Cloze 插件（Alt+C 添加挖空，Alt+V 切换显示）。

## 高亮标注语法

```markdown
==标准高亮==
<mark style="background:#ff4d4f">红色高亮</mark>
<mark style="background:#d4b106">黄色高亮（用于错题标记）</mark>
<span style="background:#d4b106">内联高亮（错题专用）</span>
+ <span style="background:#d4b106">列表中的高亮项</span>
```

## 内容结构（适配本仓库）

### 知识点笔记标准结构
```markdown
## 1 第1节　会计概述
### 1.1 会计的定义
会计是以货币为主要计量单位...
### 1.2 会计的作用
- **提供决策有用信息**
- **加强经营管理**
```

### 首页 Dataview 查询结构
````markdown
```dataview
TABLE subject AS "科目", chapter AS "章节", name AS "名称", importance AS "重要程度", difficulty AS "难度", 分值 AS "分值", 科目类别 AS "科目类别" 
FROM "04成长/知识管理/004 注会/001 会计/会计知识点" 
SORT chapter ASC
```
````

### 错题标准结构
```markdown
---
科目类别: 注册会计师-会计
章节:
主要程度: 一般
困难程度: 一般
标签: 会计
做题时间: 2026-05-21
掌握程度: 未掌握
---

备注：错误原因：... <span style="background:#d4b106">关键点高亮</span>

---
1.「年份·题型」题目内容
「正确答案」A 「芒果解析」...
「芒果提醒」...

---
2.「年份·题型」题目内容
「正确答案」B 「芒果解析」...
```

## 完整示例

```markdown
---
科目类别: 会计知识点
章节: 长期股权投资
主要程度: 核心
困难程度: 困难
复习次数: 3
分值: 12
创建时间: 2026-05-21
tags:
  - 注册会计师
  - 会计
---

# 长期股权投资

## 1 初始计量

### 1.1 同一控制下企业合并

> [!important] 核心要点
> 初始投资成本 = 被合并方在最终控制方合并财务报表中的 **净资产账面价值** × 持股比例

==长期股权投资==的初始投资成本与支付的现金、转让的非现金资产等的账面价值之间的差额，应当调整 ==资本公积（资本溢价或股本溢价）==。

### 1.2 非同一控制下企业合并

> [!warning] 易错点
> 购买方作为合并对价付出的资产，按其 **公允价值** 确认损益。

## 2 后续计量

- [x] 成本法适用范围 #注册会计师 #project/注册会计师 ✅ 2026-05-21
- [ ] 权益法核算：<span class="cloze-span">损益调整</span>、<span class="cloze-span">其他综合收益</span> #注册会计师 #project/注册会计师 ⏫ 🛫 2026-05-21

## References

- [Obsidian Flavored Markdown](https://help.obsidian.md/obsidian-flavored-markdown)
- [Internal links](https://help.obsidian.md/links)
- [Embed files](https://help.obsidian.md/embeds)
- [Callouts](https://help.obsidian.md/callouts)
- [Properties](https://help.obsidian.md/properties)
