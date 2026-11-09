---
title: "如何为 RAG 切分文档？分块策略详解"
description: "从请假制度的检索失败讲起，比较定长、按句、递归、结构、语义、上下文、父子和智能体分块。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-09-10"
readingOrder: 26
tags: ["AI", "LLM", "RAG", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/chunking-strategies-for-rag"
draft: false
---

![如何为 RAG 切分文档？分块策略详解的原文封面](/images/posts/chunking-strategies-for-rag.png)

在[检索增强生成（RAG）](/posts/retrieval-augmented-generation-rag/)中，系统先找出与问题有关的材料，再把材料交给模型。分块就是将大文档拆成可独立检索的小段。问「年假有几天」时，检索员工手册中相关的几段通常比附上整本手册更有效。

## 为什么要分块？

模型的[上下文窗口](/posts/context-engineering/)和嵌入模型能接收的[词元](https://outcomeschool.com/blog/tokenization-in-llms)都有上限。发送大段无关文本会增加成本和延迟，也可能使关键信息被[淹没在中间](/posts/lost-in-the-middle-problem-in-llms/)。较小且主题明确的片段也能给检索器提供更具体的匹配目标。

```text
Every employee gets 24 paid leave days in the first year.
Leave days do not carry forward to the next year.
Sick leave is counted separately and is limited to 12 days.
```

[语义检索](/posts/how-does-semantic-search-work/)通常先用[嵌入模型](/posts/what-are-embeddings/)编码每个片段，并存入[向量数据库](/posts/how-does-a-vector-database-work/)。查询也被转成向量，系统查找接近的片段，必要时用[重排序器](/posts/how-does-a-reranker-work/)重排，再送给模型。

## 切错边界会怎样？

以下是原文的请假申请规则：

```text
Every employee gets 24 paid leave days in the first year. To apply,
open the HR portal and submit the request at least 7 days in advance.
```

如果切在这里，第一块包含申请请假的主题，却缺少提前多少天的答案：

```text
Every employee gets 24 paid leave days in the first year. To apply,
open the HR portal and submit the request at least
```

第二块有实际期限，却失去「请假」等语义线索，可能不会被检索到：

```text
7 days in advance.
```

## 定长分块

每隔固定字符数或词元数切一块。做法快、大小可预测，可能切断单词、句子或完整条件。

```python
def fixed_size_chunks(text, size=500):
    chunks = []
    for i in range(0, len(text), size):
        chunks.append(text[i:i + size])
    return chunks
```

## 按句分块

先找句子边界，再把相邻几句组成一块。句子可以完整保留，块长度会随句长变化，分组也可能跨过主题边界。

```python
import re

def sentence_chunks(text, sentences_per_chunk=5):
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    for i in range(0, len(sentences), sentences_per_chunk):
        group = sentences[i:i + sentences_per_chunk]
        chunks.append(" ".join(group))
    return chunks
```

## 递归分块

先尝试段落等较强的边界。某块仍超限时，再试换行、句号或空格。这能在控制大小的同时尽量保留自然结构。以下是原文的简化实现，生产实现通常还会合并相邻的过短片段，并对无自然边界的超长字符串另作处理。

```python
def recursive_chunks(text, size=500, separators=["\n\n", "\n", ". ", " "]):
    if len(text) <= size or not separators:
        return [text]

    separator = separators[0]
    parts = text.split(separator)

    chunks = []
    for part in parts:
        if len(part) <= size:
            chunks.append(part)
        else:
            # still too big, so try the next weaker separator
            chunks.extend(recursive_chunks(part, size, separators[1:]))
    return chunks
```

## 按文档结构分块

利用 Markdown 标题、HTML 章节、表格和代码块的结构。为块保存标题路径，即使单独检索也知道其所属章节。

```markdown
# Leave Policy

## Paid Leave

Every employee gets 24 paid leave days in the first year.

## Sick Leave

Sick leave is limited to 12 days and needs a doctor note after 3 days.
```

给内容补上标题路径后，可以得到这种可独立理解的块：

```text
Leave Policy > Sick Leave
Sick leave is limited to 12 days and needs a doctor note after 3 days.
```

没有标题的转录文本需要别的策略，过长章节也需要再细分。

## 语义分块

把相邻的句子或窗口向量化，根据相似度下降的位置判断主题变化，在那里切开。这样适合没有显式标题但主题不断变化的材料。代价是额外的嵌入计算，边界也依赖模型和阈值。

```text
1. Every employee gets 24 paid leave days in the first year.
2. These days do not carry forward to the next year.
3. The office cafeteria is open from 8 AM to 6 PM.
4. It serves breakfast, lunch, and evening snacks.
```

## 上下文分块

先按其他策略分块，再为每块补一段简短背景，写明它属于哪个文档、章节、对象或时期。这是[上下文检索](/posts/how-does-contextual-retrieval-work/)的基础。对包含代词和引用的段落尤其有用。

```text
The limit was raised to 18 days from April, and the doctor note
requirement was removed.
```

补足上下文后，片段可以独立参与检索：

```text
From the Employee Handbook, Leave Policy section, about sick leave:
The limit was raised to 18 days from April, and the doctor note
requirement was removed.
```

## 小块检索、大块生成

索引短小的子块，同时保存它们与较大父块的关系。查询用子块提高定位精度，返回给生成模型时换成父块或附带附近内容，恢复完整上下文。

```text
Parent chunk: The full "Sick Leave" section, 12 sentences long.

Child chunks stored for search:
  - "Sick leave is limited to 12 days."      -> parent: Sick Leave
  - "A doctor note is needed after 3 days."  -> parent: Sick Leave
  - "The limit was raised to 18 days."       -> parent: Sick Leave
```

## 智能体分块

让模型阅读文档并判断新片段的边界或主题，再决定是追加到已有组还是建立新组。这适合少量重要且结构混乱的材料，需承担较多模型调用和输出波动。运行时需要多轮找证据时，则可以参考[智能体 RAG](/posts/agentic-rag/)。

```text
Read the document below. Split it into pieces where each piece
covers exactly one complete idea. Do not break a table or a list
in the middle. Give each piece a one-line title.
```

## 分块重叠

让相邻块共享少量文字，可以减少事实刚好落在边界两侧的问题。先看无重叠的两个片段：

```text
Chunk 1: ... Leave must be applied 7 days in advance.
Chunk 2: Emergency leave is an exception to this rule. ...
```

增加重叠后，第二块可能包含回答所需的条件：

```text
Chunk 1: ... Leave must be applied 7 days in advance.
Chunk 2: Leave must be applied 7 days in advance. Emergency leave
         is an exception to this rule. ...
```

重叠过多会膨胀索引，也可能让检索结果被重复内容占满。

## 选择块大小和策略

根据文档结构、问题粒度、嵌入模型上限和生成模型预算决定大小。用真实问题检查相关块能否进入候选、答案是否完整，再比较成本和延迟。

| 策略 | 切分依据 | 成本 | 适合 |
| --- | --- | --- | --- |
| 定长 | 字符数或词元数 | 很低 | 快速原型、缺少结构的文本 |
| 按句 | 句子边界 | 很低 | 短而规整的文本 |
| 递归 | 从强边界逐级细分 | 低 | 通用起点 |
| 文档结构 | 标题、章节、表格和代码结构 | 低 | 结构化文档 |
| 语义 | 主题变化 | 高 | 转录稿、缺少标题的长文 |
| 上下文 | 为片段增加说明 | 中到高 | 指代和引用较多的文本 |
| 小块检索、大块生成 | 子块命中后返回父块 | 中 | 定位与完整上下文都重要的长文 |
| 智能体 | 让模型决定边界 | 很高 | 少量关键且复杂的文档 |

## 常见失误和问题

- **默认用什么？** 有清晰标题时从结构分块开始，其他文档可先试递归分块。部分任务也可试[无向量 RAG](/posts/vectorless-rag/)。
- **全文能放入窗口，还要分块吗？** 分块仍有助于定位证据、减少无关文本和控制成本。
- **块能比嵌入模型的上限长吗？** 需要按嵌入模型的实际输入限制切块，否则可能截断或报错。
- **调整大小需要重新索引吗？** 改变边界也改变了索引文本，需要重新生成向量并更新索引。
- **表格和代码能直接截断吗？** 尽量保留完整表头、行、代码单元和标题。必要时按结构拆分并补回上下文。
