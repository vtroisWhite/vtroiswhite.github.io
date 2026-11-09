---
title: "提示词缓存是如何工作的？"
description: "理解提示词缓存如何通过精确前缀匹配复用 KV 缓存，以及怎样组织提示词来提升缓存命中率。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-06-09"
tags: ["AI","LLM","提示词工程","转载","翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-does-prompt-caching-work"
readingOrder: 7
draft: false
---

![Outcome School 文章封面](/images/posts/how-does-prompt-caching-work.png)

提示词缓存（Prompt Caching）把模型处理过的提示词前缀保存下来。后续请求从相同的前缀开始时，可以复用这段计算结果，只处理新内容。不同问题仍然各自生成答案。相比之下，[语义缓存](https://outcomeschool.com/blog/how-does-semantic-caching-work)会在问题含义足够相近时返回已有答案。

## 模型怎样处理提示词

模型先通过[词元化](https://outcomeschool.com/blog/tokenization-in-llms)将文本分成小片段。[字节对编码（BPE）](https://outcomeschool.com/blog/bpe-in-llms)是实现这种切分的一种方法。

模型在[预填充](https://outcomeschool.com/blog/prefill-vs-decode-llm-inference-optimization)阶段读取整段提示，并为各词元计算注意力需要的键和值。这些值保存在 [KV 缓存](https://outcomeschool.com/blog/kv-cache-in-llms)中。生成后续词元时，模型可以读取已经算出的值。提示词缓存把这种复用延伸到具有相同开头的请求之间。

## 复用 5,000 个词元的例子

假设固定指令和参考文档一共 5,000 个词元，每位用户的问题约 50 个词元。

1. 首个请求要处理全部 5,050 个词元。引擎保存固定部分的 KV 缓存。
2. 后续请求使用同一套指令和文档。引擎加载前 5,000 个词元的缓存，只为新的问题做预填充。
3. 模型接着按当前问题生成答案。

```text
首次请求：固定指令 + 文档 [计算并写入缓存] → 问题 A [计算] → 答案 A
后续请求：固定指令 + 文档 [读取缓存]       → 问题 B [计算] → 答案 B
```

## 前缀必须完全匹配

可以复用的部分从提示词开头算起。旧提示写着“退货期限为 30 天”，新提示改成“退货期限为 45 天”，引擎可以复用共同的前缀，从第一个不同的词元开始重新处理。空格、时间戳、请求 ID、工具定义的顺序发生变化，都可能使缓存提前失效。具体能复用到哪里，也取决于引擎的缓存分块和服务商规则。

把固定的系统指令、示例、工具定义和重复资料放在前面，把用户问题、时间和其他动态信息放在后面。这也是[上下文工程](/posts/context-engineering/)中输入编排的一部分。

## 缓存写入、读取和有效期

第一次计算并保存叫缓存写入，后续复用叫缓存读取。以原文给出的示例费率，写入可能按普通输入价格的约 1.25 倍计费，读取约为十分之一。这些数值用于说明机制，实际费率随服务商、模型和缓存配置而异。

有效期（TTL）规定缓存可以保留多久。缓存过期后，新请求需要重新建立缓存。如果前缀很少复用、长期不访问，或经常发生变化，写入开销可能抵消节省的成本。可以查看响应使用量中的缓存读取与写入词元、首次响应延迟和实际费用，确认收益。

## 在哪些场景中使用

- **文档问答。** [RAG](/posts/retrieval-augmented-generation-rag/)可以复用固定指令和重复出现的参考资料。[上下文检索](/posts/how-does-contextual-retrieval-work/)为各分块生成说明时，也会反复传入同一篇全文。检索侧可使用[嵌入缓存](https://outcomeschool.com/blog/how-does-an-embedding-cache-work)减少重复计算。
- **智能体。** [AI 智能体](/posts/ai-agent/)的多次调用往往共享系统指令、工具定义和历史消息，前缀可能随轮次逐步增长。
- **推理服务。** [vLLM](https://outcomeschool.com/blog/how-does-vllm-work)、[SGLang](https://outcomeschool.com/blog/how-does-sglang-work) 和 [TensorRT-LLM](https://outcomeschool.com/blog/how-does-tensorrt-llm-work)都提供前缀复用机制，具体管理方式有所不同。

缓存命中减少的是已经做过的预填充工作。输入相同时，这种复用保留了模型原本生成答案所依据的上下文。
