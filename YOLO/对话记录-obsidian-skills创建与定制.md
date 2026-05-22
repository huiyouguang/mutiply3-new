# 对话记录 — Obsidian Skills 创建与定制

**时间**：2026-05-21 21:12 ~ 21:25

---

## 1. 发现 `.claude/skills/` 文件夹不存在

- 询问旧有的 `.claude skill` 文件夹位置
- 全局 `~/.claude/` 和项目目录中均未找到
- CodeBuddy 使用不同的 skills 管理机制

## 2. 创建自定义 Skills

### `obsidian-workflow.md` — 综合工作流
- 通用笔记创建（适配仓库模板：科目类别、章节、主要程度等）
- 备考学习五步法：预习→听课→做题→复盘→背诵
- 错题管理模板（question → failure → success → info → tip）
- Tasks 格式（`#project/注册会计师`、优先级、日期）
- Thino 闪念笔记
- 知识分类路径（司法考试/中级/注会/税务师/错题库）
- 快捷键参考

### `obsidian-CPA-会计.md` — CPA 会计专项
- 学习路径顺序：6→10→13→14→17→19→24→23→27
- 章节考点分级（核心/重要）
- 各章学习模板
- 常见关联考点
- 错题整理重点

## 3. 拉取 Obsidian CEO 官方 5 个 Skill

来源：https://github.com/Boboegg/obsidian-skills (fork from kepano/obsidian-skills)

### `obsidian-markdown.md` — Obsidian 风味 Markdown
- wikilinks、embeds、callouts、properties、tags、comments
- 数学公式、Mermaid 图表、脚注

### `obsidian-bases.md` — Bases 数据库
- 过滤器语法、公式语法、视图类型
- Duration 类型注意事项

### `json-canvas.md` — JSON Canvas 白板
- 节点类型（text/file/link/group）
- 色彩约定、布局指南、验证清单

### `obsidian-cli.md` — Obsidian CLI
- 笔记操作、search、property:set
- 插件开发工作流

### `defuddle.md` — 网页提取
- `defuddle parse <url> --md`
- `-p title/description/domain`

## 4. 定制化改写（基于仓库内容）

基于仓库实际使用模式重新改写全部 5 个官方 Skill + 保留 2 个自定义 Skill：

| Skill | 定制内容 |
|-------|---------|
| obsidian-markdown | 仓库专属 frontmatter、CPA 错题模板、Tasks 格式、Callout 频率排序、挖空语法、章节结构 |
| obsidian-bases | 直接解析 4 个已有 .base 文件（Inbox/书籍总库/影视剧库/最近编辑）的真实语法 |
| json-canvas | 基于 `投资性房地产.canvas` 节点结构，6 色约定，连线标签规范 |
| obsidian-cli | 映射仓库目录结构，CPA 场景命令（Thino、Task、错题整理） |
| defuddle | 贴合 CPA 备考场景（讲义、真题、税法政策） |

## 5. 当前 Skill 文件清单

位置：`.claude/skills/`（7 个文件）

```
.claude/skills/
├── obsidian-markdown.md    (官方 - 已定制)
├── obsidian-bases.md       (官方 - 已定制)
├── json-canvas.md          (官方 - 已定制)
├── obsidian-cli.md         (官方 - 已定制)
├── defuddle.md             (官方 - 已定制)
├── obsidian-workflow.md    (自定义)
└── obsidian-CPA-会计.md     (自定义)
```
