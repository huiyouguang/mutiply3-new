---
name: defuddle
description: 从网页提取干净 Markdown 内容，适配 CPA/中级备考场景，用于抓取在线讲义、真题解析、税法政策、考试资讯等网页内容。
---

# Defuddle（定制版）

用 Defuddle CLI 从网页提取干净可读的 Markdown 内容，去除导航广告等无关信息。比 WebFetch 更适合标准网页。

安装：`npm install -g defuddle`

## 备考场景用法

### 抓取在线讲义/知识点

```bash
# 提取讲义正文为 Markdown
defuddle parse <讲义URL> --md

# 保存到文件
defuddle parse <讲义URL> --md -o content.md
```

### 抓取真题/解析

```bash
# 提取真题页面正文
defuddle parse <真题URL> --md

# 提取后导入 Obsidian 笔记
defuddle parse <真题URL> --md -o /tmp/zhenti.md
```

### 抓取税法政策更新

```bash
# 提取最新税法政策
defuddle parse <政策URL> --md

# 仅提取标题
defuddle parse <政策URL> -p title
```

### 抓取考试资讯

```bash
# 提取报名时间/考试安排
defuddle parse <资讯URL> --md -o /tmp/news.md

# 提取页面描述
defuddle parse <资讯URL> -p description
```

## 保存到正确的仓库目录

抓取内容后建议整理到对应目录：

```bash
# 整理到会计知识点
defuddle parse <URL> --md
# 手动复制内容到: 04成长/知识管理/004 注会/001 会计/会计知识点/

# 整理到税法知识点
defuddle parse <税法政策URL> --md
# 手动复制内容到: 04成长/知识管理/004 注会/006 税法/
```

## 输出格式

| 参数 | 说明 |
|------|------|
| `--md` | Markdown（推荐，用于笔记整理） |
| `--json` | JSON（含 HTML 和 Markdown） |
| (无) | HTML 原文 |
| `-p <name>` | 提取指定元数据（title/description/domain） |

## 注意

- Defuddle 适用于标准网页（文章、博客、文档、真题页面）
- 对于 `.md` 结尾的 URL 直接用 WebFetch，无需 Defuddle 处理
- 抓取的内容通常需要手动整理格式后再放入笔记
