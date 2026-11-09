---
title: "查询重写与多路查询检索是如何工作的？"
description: "通过退款追问、手机游戏体验和 RRF 示例，解释怎样改写或拆分查询并合并检索结果。"
publishedAt: "2026-11-09"
readingOrder: 36
originalPublishedAt: "2026-10-08"
tags: ["AI", "RAG", "检索", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-do-query-rewriting-and-multi-query-retrieval-work"
draft: false
---

![Outcome School 原文封面](/images/posts/how-do-query-rewriting-and-multi-query-retrieval-work.png)

用户的问题未必适合直接交给检索器。[RAG](/posts/retrieval-augmented-generation-rag/)需要先选出相关[文档块](/posts/chunking-strategies-for-rag/)，然后交给模型生成答案。查询重写把原问题变成更容易检索的一条查询，多路查询检索则从多个角度分别搜索。

## 查询重写

用户先问“专业版的退款政策是什么？”，随后追问“那基础版呢？”。单独检索追问会丢掉“退款政策”这个约束。系统把对话历史和当前问题送给模型，请它只返回独立查询。得到“基础版的退款政策”之后，检索器搜索这条查询，生成模型再根据找到的原文回答用户。

常见改写方式包括：

- **补全追问**。把历史中的对象、时间或主题带回当前查询。
- **清理噪声**。去掉寒暄、修正错字，把“我经理问一年有几天假”整理为“年假政策 天数”。
- **扩展词汇**。把“怎么把钱拿回来”补成文档里更常用的“退款流程”。
- **退一步找背景**。从“孟买的 4521 号订单为什么延迟”生成“订单配送延迟原因”，以便查找一般规则。原订单号等关键条件仍可在原始查询或后续查询中保留。

[HyDE](https://outcomeschool.com/blog/how-does-hyde-work)会生成一份假设性答案来检索，而查询重写生成的是查询本身。

```python
def rewrite_query(chat_history, question):
    prompt = f"""Given the conversation and the latest question, rewrite the
latest question as a standalone search query. Return only the query.

Conversation:
{chat_history}

Latest question: {question}"""
    return call_llm(prompt).strip()

def answer(chat_history, question):
    search_query = rewrite_query(chat_history, question)
    chunks = retriever.search(search_query, top_k=5)
    return call_llm(f"Context:\n{chunks}\n\nQuestion: {question}\nAnswer:")
```

## 多路查询检索

“这款新手机适合打游戏吗？”涉及处理器、屏幕刷新率、发热和续航。一个改写后的查询仍可能只覆盖其中一面。可以让模型生成分别关注性能、显示和长时间游戏续航的查询，独立检索后合并结果。同一文档块重复出现时只保留一份，原始问题也可以作为一路查询，以保留直接搜索能够找到的材料。

```text
Query 1: new phone processor and graphics performance
Query 2: new phone display refresh rate and touch response
Query 3: new phone heating and battery life during heavy use
```

```text
                     /--> Query 1 -> Retriever -> results 1 \
User question -> LLM ---> Query 2 -> Retriever -> results 2 --> Merge -> LLM -> Answer
                     \--> Query 3 -> Retriever -> results 3 /
```

## 用倒数排名融合合并结果

只做并集时，来自不同列表的候选没有统一顺序。倒数排名融合（Reciprocal Rank Fusion，RRF）让文档块在每张列表按 `1 / (k + rank)` 得分，然后把各列表得分相加。`rank` 从 1 开始，`k` 常取 60。未出现在某一路的块，从该路获得 0 分。

```text
Query 1 -> [D2, D5, D1]
Query 2 -> [D5, D3, D2]
Query 3 -> [D5, D2, D4]
```

例如 D5 在三张列表中排第 2、1、1，总分约为 0.0489。RRF 只用名次，不要求各检索器的原始分数处在同一量纲，因此也能用于合并关键词和向量结果，见[混合搜索](/posts/how-does-hybrid-search-work/)。

```python
def generate_queries(question, n=3):
    prompt = f"""Write {n} different search queries for the question below.
Each query must look at the question from a different angle.
Return one query per line.

Question: {question}"""
    lines = call_llm(prompt).strip().split("\n")
    return [question] + [line.strip() for line in lines if line.strip()]

def rrf_merge(result_lists, k=60):
    scores = {}
    for results in result_lists:
        for rank, chunk_id in enumerate(results, start=1):
            scores[chunk_id] = scores.get(chunk_id, 0) + 1 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)

def multi_query_search(question, top_k=5):
    queries = generate_queries(question)
    result_lists = [retriever.search(q, top_k=top_k) for q in queries]
    return rrf_merge(result_lists)[:top_k]
```

这段骨架先生成不同查询，再逐一检索，将相同 ID 的得分汇总并按融合分数取前 `top_k`。彼此独立的查询也可以并行提交。

## 怎样选择

| 方面 | 查询重写 | 多路查询检索 |
| --- | --- | --- |
| 生成结果 | 一条更明确的查询 | 多条互补查询 |
| 检索次数 | 一次 | 每条一次 |
| 主要价值 | 补齐省略信息、对齐术语 | 找到散落在不同材料里的信息 |
| 适用场景 | 对话追问、模糊问法 | 范围大或包含多个条件的问题 |
| 额外工作 | 验证改写是否保留原意 | 合并、去重及排序 |

两者可以先后使用。在[智能体 RAG](/posts/agentic-rag/)中，智能体还能在证据不足时自行决定是否改写并再次搜索。两种方法都可配合关键词或[向量检索](/posts/how-does-a-vector-database-work/)。多查几路通常可以提高[召回率](https://outcomeschool.com/blog/precision-vs-recall)，也可能把更多无关内容带入上下文。可以在合并后使用[重排序器](/posts/how-does-a-reranker-work/)，并对保留日期、版本等约束的能力做评估。

这两种方法都改进问题一侧。[上下文检索](/posts/how-does-contextual-retrieval-work/)从文档侧补足语境，适合一并使用。
