---
name: json-canvas
description: 创建和编辑 JSON Canvas 白板文件（.canvas），适配本仓库的 CPA 知识点思维导图、学习路线图、错题关系图等画布结构。
---

# JSON Canvas Skill（定制版）

基于本仓库现存的 `canvas/投资性房地产.canvas` 和 `canvas/第二章战略分析-知识体系.canvas` 等画布的实际结构进行定制。

## 文件位置

本仓库的画布文件位于 `canvas/` 目录下。现有画布：
- `canvas/投资性房地产.canvas` — 会计科目知识图谱
- `canvas/第二章战略分析-知识体系.canvas` — 战略科目思维导图
- `canvas/会计/` — 会计相关画布
- `canvas/战略/` — 战略相关画布

## 文件结构

```json
{
  "nodes": [],
  "edges": [],
  "metadata": {
    "version": "1.0-1.0",
    "frontmatter": {}
  }
}
```

## 常用工作流

### 1. 创建 CPA 知识点思维导图画布
1. 创建 `.canvas` 文件（如 `canvas/长期股权投资.canvas`）
2. 中央节点：知识点名称（紫色 **6**，大尺寸），类似 `投资性房地产.canvas` 的首页节点
3. 分支节点：子知识点（蓝色 **5** 或绿色 **4**）
4. 连接线标注关系（定义、分类、易错点、计算公式）
5. **色彩约定**：`1=红` 易错点 / `2=橙` 分类 / `3=黄` 注意 / `4=绿` 正常 / `5=蓝` 定义 / `6=紫` 核心

### 2. 编辑现有画布
1. 读取并解析 `.canvas` 文件
2. 查找目标节点 ID
3. 修改属性（位置、文本、颜色等）
4. 写回文件

## Nodes（节点）

```json
{
  "id": "a1b2c3d4e5f6a7b8",   // 16位十六进制ID
  "type": "text",              // text / file / link / group
  "x": 0, "y": 0,             // 坐标（左上角）
  "width": 300, "height": 200, // 尺寸
  "color": "6",                // 颜色预设 1-6 或 hex
  "text": "节点内容（支持Markdown）\\n\\n支持**加粗**和\\n`换行用\\\\n`"
}
```

### 色彩约定（适配本仓库）

| 预设 | 颜色 | 用途 |
|------|------|------|
| `"1"` | 红 | 易错点、危险提示 |
| `"2"` | 橙 | 分类/子类别 |
| `"3"` | 黄 | 注意/考试要点 |
| `"4"` | 绿 | 正常知识点 |
| `"5"` | 蓝 | 定义/概念解释 |
| `"6"` | 紫 | 核心/中心节点 |

### 节点类型

**Text 节点** — 最常用，支持 Markdown 文本
```json
{
  "id": "a1b2c3d4e5",
  "type": "text",
  "x": -400, "y": 0,
  "width": 460, "height": 440,
  "color": "6",
  "text": "投资性房地产\\n\\n**核心知识点**\\n注册会计师会计科目\\n分值：2-6分"
}
```

**File 节点** — 嵌入文件预览
```json
{
  "id": "f6g7h8i9j0",
  "type": "file",
  "x": 80, "y": -400,
  "width": 280, "height": 120,
  "color": "5",
  "file": "04成长/知识管理/004 注会/001 会计/会计知识点/005 投资性房地产.md",
  "subpath": "#定义"
}
```

**Link 节点** — 外部链接
```json
{
  "id": "c3d4e5f6a7b8",
  "type": "link",
  "x": 500, "y": 100,
  "width": 300, "height": 150,
  "color": "3",
  "url": "https://help.obsidian.md"
}
```

**Group 节点** — 分组容器
```json
{
  "id": "d4e5f6a7b8c9",
  "type": "group",
  "x": -500, "y": -200,
  "width": 1200, "height": 800,
  "color": "4",
  "label": "投资性房地产知识体系"
}
```

## Edges（连线）

```json
{
  "id": "edge1",                              // 唯一ID
  "fromNode": "a1b2c3d4e5",                   // 源节点ID
  "fromSide": "right",                        // top/right/bottom/left
  "toNode": "f6g7h8i9j0",                     // 目标节点ID
  "toSide": "left",                           // top/right/bottom/left
  "label": "定义",                             // 连线标签
  "color": "4"                                // 颜色
}
```

连线标签常用语（适配本仓库的 CPA 知识画布）：
- `定义` — 概念定义关系
- `分类` — 类别细分关系
- `易错点` — 关联易错知识点
- `计算公式` — 关联公式
- `考试要点` — 关联考试重点
- `同类对比` — 易混淆知识点对比
- `记忆口诀` — 关联记忆技巧
- `例题` — 关联例题

## 布局指南

### 中心辐射式（知识图谱推荐）
```
        [子节点2] ← [子节点1]
                       ↑
        [子节点3] ← [核心节点] → [子节点4]
                       ↓
        [子节点5] → [子节点6]
```

### 推荐节点尺寸

| 节点类型 | 建议宽×高 |
|---------|----------|
| 核心节点（紫色6） | 400-500 × 400-500 |
| 子知识点（蓝色5/绿色4） | 250-350 × 100-200 |
| 考试要点（黄色3） | 280-380 × 120-200 |
| 易错点（红色1） | 250-350 × 100-180 |
| 文件嵌入 | 300-500 × 200-400 |

### 间距建议
- 节点间距：50-100px
- Group 内边距：20-50px
- 坐标对齐网格（10 或 20 的倍数）

## 完整示例：投资性房地产画布

```json
{
  "nodes": [
    {
      "id": "a1b2c3d4e5",
      "type": "text",
      "text": "投资性房地产\\n\\n**核心知识点**\\n注册会计师会计科目\\n分值：2-6分",
      "x": -400, "y": 0,
      "width": 460, "height": 440,
      "color": "6"
    },
    {
      "id": "f6g7h8i9j0",
      "type": "text",
      "text": "一、定义\\n为赚取租金或资本增值，\\n或两者兼有而持有的房地产",
      "x": 80, "y": -400,
      "width": 280, "height": 120,
      "color": "5"
    },
    {
      "id": "k1l2m3n4o5",
      "type": "text",
      "text": "二、范围\\n1.已出租的土地使用权\\n2.持有并准备增值后转让\\n3.已出租的建筑物",
      "x": 80, "y": -200,
      "width": 280, "height": 150,
      "color": "4"
    },
    {
      "id": "p6q7r8s9t0",
      "type": "text",
      "text": "三、初始计量\\n按成本进行初始计量\\n\\n后续模式：\\n- 成本模式\\n- 公允价值模式",
      "x": 80, "y": 50,
      "width": 280, "height": 180,
      "color": "4"
    },
    {
      "id": "u1v2w3x4y5",
      "type": "text",
      "text": "四、转换与处置\\n**模式转换**\\n成本模式→公允价值模式\\n作为会计政策变更\\n\\n**处置**\\n出售/转让/报废时\\n确认损益",
      "x": 80, "y": 300,
      "width": 280, "height": 200,
      "color": "3"
    }
  ],
  "edges": [
    {"id": "e1", "fromNode": "a1b2c3d4e5", "fromSide": "right", "toNode": "f6g7h8i9j0", "toSide": "left", "label": "定义", "color": "4"},
    {"id": "e2", "fromNode": "a1b2c3d4e5", "fromSide": "right", "toNode": "k1l2m3n4o5", "toSide": "left", "label": "范围", "color": "4"},
    {"id": "e3", "fromNode": "a1b2c3d4e5", "fromSide": "right", "toNode": "p6q7r8s9t0", "toSide": "left", "label": "计量", "color": "4"},
    {"id": "e4", "fromNode": "a1b2c3d4e5", "fromSide": "right", "toNode": "u1v2w3x4y5", "toSide": "left", "label": "处置", "color": "3"}
  ],
  "metadata": {
    "version": "1.0-1.0",
    "frontmatter": {}
  }
}
```

## 验证清单

1. 所有 `id` 在 nodes 和 edges 中唯一
2. 每个 `fromNode` / `toNode` 引用存在的 node ID
3. 颜色预设只能是 `"1"` ~ `"6"` 或 hex
4. `type` 只能是 `text` / `file` / `link` / `group`
5. JSON 格式合法（特别注意 Markdown 中的换行用 `\\n`）

## References
- [JSON Canvas Spec 1.0](https://jsoncanvas.org/spec/1.0/)
- [JSON Canvas GitHub](https://github.com/obsidianmd/jsoncanvas)
