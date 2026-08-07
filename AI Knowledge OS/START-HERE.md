---
title: AI Knowledge OS · 开始使用
tags:
  - system/start-here
---

# AI Knowledge OS · 开始使用

这是一个基于 CodeBuddy Agent 驱动的个人知识管理系统，包含 Obsidian 插件、模板、Base、Canvas 和知识管理全链路工作流。

## 系统架构

```
AI Knowledge OS (加工站) → CodeBuddy Agent (AI 大脑) → 主知识库 (04成长/、03Life os/、工作/)
```

- **AI Knowledge OS**：Inbox 接收 → 模板加工 → Agent 处理 → 路由分发
- **CodeBuddy Agent**：加载 obsidian-knowledge-os Skill，执行分析、分类、分发
- **主知识库**：04成长/知识管理/、03Life os/、工作/ 等外层目录

## 第一次使用

1. 确认 Obsidian 已启用 AI Knowledge OS 插件。
2. 确认 CodeBuddy 已加载 `obsidian-knowledge-os` Skill。
3. 在 CodeBuddy 中说出以下任意命令：

```text
处理 Inbox          → 批量处理待整理内容
创建知识笔记        → 按模板生成新知识笔记
检查项目进度        → 查看 Projects/ 中所有项目状态
生成周报            → 统计本周知识管理数据
找孤立笔记          → 检测未连接的知识节点
```

## 建议体验顺序

1. **Dashboard**：查看整个 Vault 的动态统计。
2. **Inbox** → CodeBuddy 说"处理 Inbox"：体验批量加工流程。
3. **Knowledge**：浏览核心概念与原生关系图谱。
4. **Agent Center**：调用三种 Agent 角色处理复杂任务。
5. **Projects**：打开示例项目，体验项目跟踪。
6. **Analytics**：查看知识增长和结构分析。

## 三种 Agent 角色

在 CodeBuddy 中说"内容助手/商业分析助手/学习助手"激活：

| Agent | 一句话描述 |
|-------|-----------|
| 内容助手 | 知识笔记 → 公众号/视频稿/提案 |
| 商业分析 | 六步法分析企业 AI 落地方案 |
| 学习助手 | 论文/资料 → 可复用知识笔记 |

## AI 引擎说明

- **不再需要 Claudian**：原 Knowledge OS 依赖 Claudian（已停用），现全面迁移至 CodeBuddy Agent。
- **本地优先**：所有知识处理在本地完成，不上传云端 AI 服务。
- **Skill 驱动**：obsidian-knowledge-os Skill 封装了全部工作流规则、路由表和模板系统。

## 重要说明

- 插件提供 Dashboard UI、Inbox 界面等交互功能。
- 批量处理、智能分析、知识分发由 CodeBuddy Agent 执行。
- 所有新增内容均保存在当前本地 Vault 对应目录中。
- `.base` 文件用于 Obsidian 内视图展示，不存储数据。

插件的完整安装、隐私和功能边界说明位于：

```text
.obsidian/plugins/ai-knowledge-os/README.md
```
