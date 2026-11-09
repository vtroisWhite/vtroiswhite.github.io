---
title: "什么是大语言模型中的“迷失在中间”问题？如何解决？"
description: "通过 U 形位置曲线和大海捞针实验理解长上下文的中部信息损失，并比较五种应对思路。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-08-19"
tags: ["AI","LLM","上下文工程","转载","翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/lost-in-the-middle-problem-in-llms"
readingOrder: 8
draft: false
---

![Outcome School 文章封面](/images/posts/lost-in-the-middle-problem-in-llms.png)

大语言模型能接收很长的输入，却可能更擅长使用开头和结尾的信息。关键事实在输入中部时，回答准确率往往下降。这就是“迷失在中间”（Lost in the Middle）问题。

## 能装下多少与能用好多少

[上下文窗口](https://outcomeschool.com/blog/context-window)限制了模型一次可处理的输入和输出规模，通常以[词元](https://outcomeschool.com/blog/tokenization-in-llms)计算。窗口容量说明材料是否能送进去，检索到其中关键信息则是另一项能力。

假设把 20 份公司文件和“退款政策是什么？”一起发给模型。退款条款在第 2 份时，模型能正确作答。只把同一份文件移到第 10 位，模型却说找不到退款政策。再移动到第 19 位，回答可能恢复正确。材料和问题都没变，只有相关文件的位置变了。

把关键信息从开头依次移动到结尾，并记录准确率，常会看到两端高、中间低的 U 形曲线。不同模型、材料和上下文长度的曲线会不同。

## 为什么中间容易被忽视

[注意力机制](https://outcomeschool.com/blog/self-attention-in-transformers)决定模型在生成时从不同位置吸收多少信息，[位置编码](https://outcomeschool.com/blog/math-behind-rope-rotary-position-embedding)让模型区分先后顺序。靠后的信息离生成位置近，开头经常是训练中要求模型遵守的指令，部分最前面的词元还可能成为[注意力汇点](https://outcomeschool.com/blog/how-do-attention-sinks-work)。中间材料可能同时缺少这些优势。

## 对实际系统的影响

- **检索增强生成。** [RAG](/posts/retrieval-augmented-generation-rag/)将文档切成[分块](/posts/chunking-strategies-for-rag/)，通过[语义检索](/posts/how-does-semantic-search-work/)找到候选材料。如果有用的块位于提示中部，即使检索正确，生成也可能失败。
- **长对话。** 起初反复使用的约束随历史增长移到中间，助手可能忘记。这也是系统进行[上下文压缩](https://outcomeschool.com/blog/how-does-context-compaction-work)的原因之一。
- **智能体。** [AI 智能体](/posts/ai-agent/)持续追加工具结果，早前的关键信息可能淹没在新旧输出之间。

## 用大海捞针实验定位问题

拿一段与问题无关的长文本当作“草堆”，再写一个唯一事实当作“针”。例如，把“孟买办公室的代号是 BLUE-4471”放在文本的 10% 处，要求模型找出代号。之后在 0%、10%、20% 等不同深度重复，并改变输入总长度。用“长度 × 插入深度”的网格记录正确率，就能看到自家模型和提示模板在哪些位置容易漏掉信息。

## 怎样改进

1. **控制上下文长度。** 把全部材料塞进大窗口是最直接的办法，但会增加成本和延迟，仍需测量中部准确率。
2. **筛选更相关的材料。** 用[重排序器](/posts/how-does-a-reranker-work/)给检索结果评分，从 50 块缩到最相关的 5 块。答案跨多个文档时，需要保留足够证据。
3. **调整材料顺序。** 如果相关性排名是 1 至 7，可以按 `1、3、5、7、6、4、2` 摆放，让最有用的证据靠近两端。把问题放在末尾，关键约束可以在首尾各提醒一次。[上下文工程](/posts/context-engineering/)
4. **分段处理再合并。** 每次只传一份文档，抽取局部答案，最后汇总。这样会增加调用次数，但每份材料都能在短上下文中得到单独处理。[递归语言模型](https://outcomeschool.com/blog/recursive-language-models)可以把拆分决策交给模型。
5. **先抽取证据，再回答。** 先让模型列出相关原句和文档编号，再只基于摘录回答。这也是一种[提示词链](/posts/how-does-prompt-chaining-work/)。

遇到长输入中答案缺失时，可以同时检查材料有没有进入窗口，以及模型在材料当前的位置能否稳定使用它。
