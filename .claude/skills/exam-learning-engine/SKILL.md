---
name: "exam-learning-engine"
description: "Generates complete exam learning cards with cloze, recitation, self-test modules. Invoke when user wants to create study materials for CPA, intermediate accounting, or other professional exams."
---

# Exam Learning Engine

## Overview

This skill transforms any heading/topic into a complete, structured learning card specifically designed for professional exam preparation (CPA, Intermediate Accounting, etc.). Each heading generates 12 standardized modules covering reading, understanding, active recall, self-testing, and review scheduling.

## Trigger Conditions

Invoke this skill when:
- User wants to create study materials for CPA exams
- User wants to create study materials for Intermediate Accounting exams
- User asks to generate cloze cards or learning cards
- User provides textbook content and asks to format it for exam preparation
- User mentions terms like "挖空", "背诵", "自测", "复习", "考点"

---

## Exam Structure Reference

### CPA 考试科目

| 科目 | 核心章节 | 主观题重点 | 难度 |
|------|----------|------------|------|
| 会计 | 长投、合并报表、收入、金融工具、所得税 | 合并抵销、收入确认、金融工具分类 | ★★★★★ |
| 审计 | 风险评估、风险应对、销售循环、审计报告 | 审计程序设计、审计意见判断 | ★★★★☆ |
| 税法 | 增值税、企业所得税、消费税 | 税额计算、税收优惠应用 | ★★★☆☆ |
| 经济法 | 合同法、公司法、证券法、破产法 | 案例分析、法律条文应用 | ★★★☆☆ |
| 财管 | 财务报表分析、资本预算、资本结构 | 公式应用、计算分析 | ★★★★☆ |
| 战略 | 战略分析、战略选择、风险管理 | 案例分析、框架应用 | ★★☆☆☆ |

### CPA 会计章节学习顺序

**推荐学习路径：**
6→10→13→14→17→19→24→23→27（其他按顺序）

**核心章节（主观题必考）：**
- 第6章 长期股权投资与合营安排
- 第10章 股份支付
- 第13章 金融工具
- 第14章 租赁
- 第17章 收入确认
- 第19章 所得税
- 第23章 财务报告
- 第24章 会计政策/估计变更和差错更正
- 第27章 合并财务报表

### 中级会计考试科目

| 科目 | 核心章节 | 主观题重点 | 难度 |
|------|----------|------------|------|
| 中级实务 | 长投、合并报表、收入、金融工具、所得税 | 合并抵销、收入确认 | ★★★★☆ |
| 经济法 | 公司法、合同法、合伙企业法、金融法律 | 案例分析、条文应用 | ★★★☆☆ |
| 财务管理 | 预算管理、筹资管理、投资管理、营运资金 | 公式计算、综合分析 | ★★★★☆ |

### 常见关联考点

**会计：**
- 长期股权投资 ↔ 合并财务报表
- 所得税 ↔ 几乎所有章节（递延所得税）
- 债务重组 ↔ 金融工具
- 非货币性资产交换 ↔ 固定资产/无形资产/存货

**经济法：**
- 合同法律制度 ↔ 债法基础
- 公司法 ↔ 合伙企业法
- 证券法 ↔ 上市公司治理
- 破产法 ↔ 债务清偿顺序

---

## Learning Card Template

For every heading, generate ALL of the following modules in order:

---

### ① 📖 原文

Present the original text content clearly. Use blockquotes for key definitions.

**Example:**
> 合同：民事主体之间设立、变更、终止民事法律关系的协议。
> 合同是平等主体之间的民事法律关系。

---

### ② ✏️ 挖空版

Create cloze-style content by replacing key terms with `==highlight==` syntax. Mark the most important concepts that appear in exams.

**Example:**
> 合同：民事主体之间==设立、变更、终止==民事法律关系的协议。
> 合同是==平等主体==之间的民事法律关系。

---

### ③ ⭐ 重点背诵

**CRITICAL: Do NOT copy the original text verbatim.** Reorganize into structured recitation lists with clear question-answer format.

**Example:**
**必须记住：**
① 调整对象 → 人身关系、财产关系
② 调整主体 → 平等主体
③ 调整范围 → 民事法律关系

**Format Rules:**
- Use numbered items (①②③)
- Each item must have a clear question/label and answer
- Focus on exam-tested elements
- Group related concepts together

---

### ④ 🧠 一句话记忆

Summarize the core concept into a concise, memorable formula or sentence.

**Example:**
> 合同 = 平等主体 + 设立/变更/终止 + 民事法律关系

**Requirements:**
- Must fit in one line
- Capture the essence of the concept
- Use simple mathematical or structural notation if helpful

---

### ⑤ 💬 背诵提示

Provide memory aids and mnemonics to assist recall.

**Structure:**
**记忆顺序：**
主体 → 行为 → 结果

**口诀：**
平等的人 做合同 产生关系

**Requirements:**
- Suggest a logical memory order
- Create a simple mnemonic (doesn't need to rhyme)
- Help users remember through association

---

### ⑥ ⚠️ 易混知识

List concepts that are commonly confused with the current topic.

**Example:**
**不要和以下概念混淆：**
- 行政协议
- 行政行为
- 单方法律行为

**Requirements:**
- Identify 2-5 common confusions
- Briefly explain why they're different
- Highlight key distinguishing factors

---

### ⑦ 🎯 高频考点

Rate each exam point by importance using star ratings (★★★★★).

**Example:**
- ★★★★★ 定义
- ★★★★☆ 平等主体
- ★★★☆☆ 民事法律关系
- ★★☆☆☆ 合同分类

**Rating Scale:**
- ★★★★★: Core, must-memorize
- ★★★★☆: Very important, high exam frequency
- ★★★☆☆: Important, moderate frequency
- ★★☆☆☆: Understand, may appear
- ★☆☆☆☆: Extension reading

---

### ⑧ 🚨 考试提醒

Highlight recent exam trends and common pitfalls.

**Example:**
**★★★★★ 近年考试喜欢考：**
✔ 平等主体
✔ 民事法律关系

**容易误选：**
❌ 行政主体
❌ 劳动关系
❌ 行政协议

**Requirements:**
- Identify 2-3 high-frequency exam points
- List 2-3 common wrong answers/traps
- Provide actionable advice

---

### ⑨ 💡 常见命题方式

List the typical exam question formats for this topic.

**Example:**
**常见考法：**
✔ 判断题 → 合同可以发生在行政主体之间。（×）
✔ 单选题 → 合同属于什么法律关系？
✔ 多选题 → 合同包括哪些法律效果？

**Supported Question Types:**
- 判断题 (True/False)
- 单选题 (Single Choice)
- 多选题 (Multiple Choice)
- 简答题 (Short Answer)
- 案例分析 (Case Analysis)
- 计算分析 (Calculation)

---

### ⑩ 🔄 快速自测

Generate 3-5 self-test questions with blank answers for active recall.

**Example:**
**Q：合同是谁与谁之间？**
**A：_________**

**Q：合同产生什么法律效果？**
**A：_________**

**Q：合同属于什么法律关系？**
**A：_________**

**Requirements:**
- 3-5 questions per heading
- Mix question types
- Leave answers blank for self-testing
- Include answers in collapsed section below

---

### ⑪ 📌 延伸关联

Link the current topic to other related knowledge points.

**Example:**
**关联知识点：**
- 民法基本原则 → 平等原则
- 民事法律行为 → 有效要件
- 债法 → 合同之债

**Requirements:**
- List 2-4 related topics
- Show logical connections
- Help build knowledge network

---

### ⑫ 📅 复习建议

Provide review scheduling based on importance rating.

**Based on Importance:**
- ★★★★★ → 今天必须背会，每日复习一次
- ★★★★☆ → 两天内掌握，隔日复习
- ★★★☆☆ → 一周内掌握，每周复习一次
- ★★☆☆☆ → 理解即可，考前浏览
- ★☆☆☆☆ → 作为扩展阅读

**Example:**
**重要度：★★★★★**
**建议：今天必须背会，每日复习一次**
**复习周期：第1天 → 第2天 → 第4天 → 第7天 → 第15天**

---

## Best Practices

### For Legal/Regulatory Content:
- Focus on definitions and key elements
- Highlight legal requirements and exceptions
- Compare similar concepts systematically

### For Accounting/Finance Content:
- Break down formulas into components
- Emphasize calculation steps
- Note common mistakes in journal entries

### For Conceptual Content:
- Extract core principles
- Create logical frameworks
- Provide real-world examples

---

## Example Output

```markdown
# 合同

## 📖 原文
> 合同：民事主体之间设立、变更、终止民事法律关系的协议。
> 合同是平等主体之间的民事法律关系。

---

## ✏️ 挖空版
> 合同：民事主体之间==设立、变更、终止==民事法律关系的协议。
> 合同是==平等主体==之间的民事法律关系。

---

## ⭐ 重点背诵
**必须记住：**
① 合同的本质 → 民事主体之间设立、变更、终止民事法律关系的协议
② 合同主体要求 → 平等主体
③ 合同法律属性 → 民事法律关系

---

## 🧠 一句话记忆
> 合同 = 平等主体 + 设立/变更/终止 + 民事法律关系

---

## 💬 背诵提示
**记忆顺序：**
主体 → 行为 → 关系

**口诀：**
平等的人 做合同 产生民事关系

---

## ⚠️ 易混知识
**不要和以下概念混淆：**
- 行政协议 → 不平等主体之间，行政机关与相对人
- 行政行为 → 单方行为，无需对方同意
- 单方法律行为 → 仅需一方意思表示即可成立

---

## 🎯 高频考点
- ★★★★★ 合同定义
- ★★★★☆ 平等主体
- ★★★☆☆ 民事法律关系
- ★★☆☆☆ 合同分类

---

## 🚨 考试提醒
**★★★★★ 近年考试喜欢考：**
✔ 平等主体的判断
✔ 合同与行政协议的区分

**容易误选：**
❌ 行政主体之间也能成立合同
❌ 合同属于行政法律关系
❌ 劳动合同属于民事合同

---

## 💡 常见命题方式
**常见考法：**
✔ 判断题 → 合同可以发生在行政主体之间。（×）
✔ 单选题 → 合同属于什么法律关系？（民事法律关系）
✔ 多选题 → 合同包括哪些法律效果？（设立、变更、终止）

---

## 🔄 快速自测
**Q：合同是谁与谁之间？**
**A：_________**

**Q：合同产生什么法律效果？**
**A：_________**

**Q：合同属于什么法律关系？**
**A：_________**

**答案：**
- 平等主体
- 设立、变更、终止民事法律关系
- 民事法律关系

---

## 📌 延伸关联
**关联知识点：**
- 民法基本原则 → 平等原则是合同成立的前提
- 民事法律行为 → 合同是双方法律行为
- 债的发生原因 → 合同是债的主要发生原因

---

## 📅 复习建议
**重要度：★★★★★**
**建议：今天必须背会，每日复习一次**
**复习周期：第1天 → 第2天 → 第4天 → 第7天 → 第15天**
```

---

## Integration Notes

When the user provides content, follow this workflow:
1. Identify all headings in the content
2. For each heading, generate the complete 12-module learning card
3. Maintain consistent formatting across all cards
4. Ensure the output is directly usable in Obsidian
5. Add appropriate tags (#CPA #中级会计 #经济法)

---

## Future Enhancements

When integrated with real exam databases (CPA, Judicial Exam, Graduate Entrance Exam):
- Dynamic priority ranking based on actual exam frequency
- Real question examples from past papers
- Personalized review schedules based on user's performance
- Difficulty assessment based on historical pass rates
