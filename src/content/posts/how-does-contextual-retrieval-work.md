---
title: "上下文检索是如何工作的？"
description: "用财报片段解释上下文检索如何增强嵌入与 BM25，以及重排序和提示词缓存的作用。"
publishedAt: "2026-11-09"
readingOrder: 35
originalPublishedAt: "2026-10-06"
tags: ["AI", "RAG", "检索", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-does-contextual-retrieval-work"
draft: false
---

![Outcome School 原文封面](/images/posts/how-does-contextual-retrieval-work.png)

上下文检索（Contextual Retrieval）在给文档块建立索引之前，用模型生成一段简短说明，交代这个块来自哪篇文档、哪个章节，以及代词或简称指什么。将说明加到块前，语义和关键词检索都可以利用原本缺失的信息。

## 普通检索为什么会漏掉相关块

[RAG](/posts/retrieval-augmented-generation-rag/)先把长文档[切分](/posts/chunking-strategies-for-rag/)，再从索引里找出相关块交给生成模型。[嵌入模型](/posts/what-are-embeddings/)把文本转为向量，[语义搜索](/posts/how-does-semantic-search-work/)用相似度找意思相近的段落。BM25 侧重查询词与文档的实际匹配，尤其是罕见词。两者可以融合成[混合搜索](/posts/how-does-hybrid-search-work/)。

假设某个财报块只说“公司营收环比增长 3%”。单独看这个块，既不知道公司名，也不知道是哪一季。用户搜索“ACME 2023 年第二季度营收”时，向量和关键词索引都可能错过它。生成说明后，同一段原文就能带上公司和时间：

```text
This chunk is from an SEC filing on ACME Corp's performance in Q2 2023;
the previous quarter's revenue was $314 million.
The company's revenue grew by 3% over the previous quarter.
```

## 建立上下文索引

1. 按照既定规则切分文档。
2. 将完整文档和其中一个块交给模型，请它只输出用于定位这个块的短说明。
3. 把说明放在原始块前，得到带上下文的块。
4. 用带上下文的块计算向量，也可用同一文本建立 BM25 索引。
5. 提问时照常检索和生成答案，索引中已有说明，因此无需在查询时再生成一次。

```text
<document>
{{WHOLE_DOCUMENT}}
</document>
Here is the chunk we want to situate within the whole document
<chunk>
{{CHUNK_CONTENT}}
</chunk>
Please give a short succinct context to situate this chunk within the
overall document for the purposes of improving search retrieval of the
chunk. Answer only with the succinct context and nothing else.
```

**上下文嵌入**为带说明的文本生成向量，尽量让块的语义指向明确。**上下文 BM25**为同一份文本添加关键词索引，让检索能匹配原块里没有出现的名字、日期和章节。合并两路候选后，还可以用[重排序器](/posts/how-does-a-reranker-work/)逐个评估候选与问题的匹配程度，只把靠前结果交给生成模型。

## 原文引用的实验

下表是原文转述的 Anthropic 检索实验，指标是正确块未出现在前 20 个结果中的比率。降幅相对于普通嵌入的基线。

| 方案 | 前 20 名检索失败率 | 失败率相对降幅 |
| --- | --- | --- |
| 普通嵌入 | 5.7% | 基线 |
| 上下文嵌入 | 3.7% | 35% |
| 上下文嵌入与上下文 BM25 | 2.9% | 49% |
| 上述方案加重排序 | 1.9% | 67% |

## 成本与实现示例

同一文档的多个块共用一个很长的文档前缀。[提示词缓存](/posts/how-does-prompt-caching-work/)可以复用这个前缀的处理结果，减少重复索引成本。把文档放在提示词稳定的前半部分，再放每块不同的内容。文档变更时重新生成受影响的说明和索引，未变化文档可复用已有结果。

```python
PROMPT = """<document>
{doc}
</document>
Here is the chunk we want to situate within the whole document
<chunk>
{chunk}
</chunk>
Please give a short succinct context to situate this chunk within the
overall document for the purposes of improving search retrieval of the
chunk. Answer only with the succinct context and nothing else."""

def contextualize(document, chunks):
    result = []
    for chunk in chunks:
        note = call_llm(PROMPT.format(doc=document, chunk=chunk))
        result.append(note + "\n" + chunk)
    return result
```

```python
contextual_chunks = contextualize(document, chunks)

vectors = embed_model.embed(contextual_chunks)  # Contextual Embeddings
vector_db.add(vectors, contextual_chunks)

bm25_index.add(contextual_chunks)               # Contextual BM25
```

示例的 `call_llm`、`embed_model`、[向量数据库](/posts/how-does-a-vector-database-work/)和关键词索引由实际应用提供。

## 何时适用

财报、同一产品的多个版本、或频繁使用“本公司”“上述方法”等表达的文档最容易受益。问答块本身已经完整时收益可能较小。为每块增加一次模型调用也会延长索引时间，模型补充的说明还可能出错。可用真实查询验证召回改善，并保留原文供核对。

上下文检索改的是文档一侧。[查询重写与多路查询检索](/posts/how-do-query-rewriting-and-multi-query-retrieval-work/)调整查询一侧。[HyDE](https://outcomeschool.com/blog/how-does-hyde-work)则先生成假设性答案，再用它检索。两侧的技术可以组合。
