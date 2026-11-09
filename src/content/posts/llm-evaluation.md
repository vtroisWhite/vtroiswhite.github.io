---
title: "什么是大语言模型评估？指标、基准测试和方法详解"
description: "比较自动指标、公开基准、人工评估和 LLM 裁判，并说明如何评估 RAG、智能体、安全性和生产质量。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-05-24"
readingOrder: 23
tags: ["AI", "LLM", "模型评估", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/llm-evaluation"
draft: false
---

![什么是大语言模型评估？指标、基准测试和方法详解的原文封面](/images/posts/llm-evaluation.png)

大语言模型评估衡量模型在目标任务上的表现。给模型一组输入，检查输出是否正确、有帮助、安全，以及是否适合产品场景。以客服聊天机器人为例，评估可以回答它是否说对了、是否得体，以及改版后表现是否提升。

## 为什么要评估？

评估可以比较候选模型，也可以衡量同一模型在改提示词或[微调](https://outcomeschool.com/blog/how-does-fine-tuning-work)后的变化。它能揭示常见错误、罕见边界情况和[幻觉](/posts/why-do-llms-hallucinate-the-token-level-explanation/)，帮助团队持续追踪质量和安全表现。

## 四类评估方法

1. **自动指标。** 根据规则或参考答案计算分数。
2. **公开基准。** 在统一测试集上比较模型的指定能力。
3. **人工评估。** 由人阅读输出，按标准评分或标注错误。
4. **LLM 裁判。** 用一个模型评估另一个模型的输出。

## 自动指标

| 指标 | 衡量方式 |
| --- | --- |
| BLEU | 比较输出和参考译文的词组重叠，常用于机器翻译 |
| ROUGE | 衡量参考文本中的词或词组在输出中的覆盖程度，常用于摘要 |
| BERTScore | 使用上下文向量匹配词元，能识别部分不同措辞下的语义相似性 |
| METEOR | 结合词形、同义词和匹配顺序，对翻译打分 |
| 困惑度 | 衡量模型对真实序列的预测难度。给真实的[下一个词元更高概率](https://outcomeschool.com/blog/logprobs-in-llms)通常会降低困惑度 |
| Exact Match | 判断输出是否和标准答案完全相同 |

自动评分速度快、成本低，同样的输入会得到同样的分数。使用词面重叠的指标时，正确的同义改写也可能低分。开放式聊天、创作和复杂问题通常还需要其他方法。

## 公开基准

- **通识。** MMLU 覆盖 57 个学科，MMLU-Pro 增加选项并考查更复杂的[推理](/posts/how-does-chain-of-thought-prompting-work/)。
- **常识。** HellaSwag 让模型挑选最合理的情节续写。
- **编程。** HumanEval 测小型函数编写，SWE-bench Verified 取自真实 GitHub 议题。LiveCodeBench 随时间纳入新题，降低与模型训练数据重叠的风险。
- **数学。** GSM8K 是小学数学应用题，MATH 和 AIME 更接近竞赛题。
- **高难度推理。** GPQA-Diamond 和 Humanity's Last Exam 包含专业领域难题。
- **工具使用。** BFCL 评估函数调用和工具选择。
- **长上下文。** RULER 测试模型能有效利用的[上下文长度](/posts/lost-in-the-middle-problem-in-llms/)。
- **真实性和对话。** TruthfulQA 检查模型是否会复述流行的错误观点。Chatbot Arena 让用户匿名比较两个模型的输出。

统一数据集便于横向比较。基准接近饱和时，分数难以区分更强的模型。模型也可能在训练中见过测试题，造成数据污染。旧基准仍可作为基本门槛，产品是否好用要靠与真实场景相符的测试集验证。

## 人工评估

常见方式包括按 1–5 分评价、两两比较答案，以及逐条标注错误。人工评估适合核查含义、语气和开放式质量，[InstructGPT](https://outcomeschool.com/blog/decoding-instructgpt)也使用了人类偏好数据。人工评分耗时昂贵，评价者之间还可能存在分歧，因此适合选择有代表性的样本深入检查。

## LLM 裁判

[LLM 裁判](/posts/llm-as-a-judge/)接收问题、待评答案和评分标准，给出分数和理由。它适合批量处理开放式输出。以下是原文的评分提示词示例：

```text
You are an expert evaluator. Read the user question and the assistant reply.
Rate the reply on a scale of 1 to 5 for helpfulness and politeness.
Give a short reason for your rating.

User question: {question}
Assistant reply: {reply}
```

裁判可能偏好某种风格、长回答、固定位置或和自己同系列模型的输出。先在少量样本上对比人类评分，再决定是否放大规模。

## 按任务设计评估

| 场景 | 可以测量的指标 |
| --- | --- |
| [RAG](/posts/retrieval-augmented-generation-rag/) | 检索到的[分块](/posts/chunking-strategies-for-rag/)里有多少相关，相关分块有多少被召回，答案有没有证据支持，是否回应了问题 |
| 智能体 | 是否选对工具、传入正确参数、完成任务，以及用了多少步。可参考 τ-bench 和 SWE-bench Verified |
| 代码生成 | 代码能否编译，通过多少测试，有无安全缺陷 |
| 客服 | 回答的正确性、语气、问题解决率和升级人工的情况 |

可结合[精确率与召回率](https://outcomeschool.com/blog/precision-vs-recall)评价检索，用工具参数准确性检查[函数调用](/posts/how-does-function-calling-work-in-llms/)。

## 安全评估与红队测试

用有害请求、[越狱攻击](/posts/jailbreaking-in-llms/)和[提示词注入](/posts/prompt-injection-in-llms/)主动测试模型会不会泄露隐私、绕开政策或生成不当内容。HarmBench、AdvBench 和 TrustLLM 分别提供不同方面的测试。还可单独验证[安全护栏](/posts/how-do-llm-guardrails-work/)的漏报和误报。

## 挑战和实践

开放式答案没有唯一标准答案，公开数据可能污染，人工及强模型评估成本较高，裁判会有偏差，模型和数据也会随时间变化。构建贴近实际业务的小型高质量评估集，加入困难、罕见和对抗样本。自动分数用于快速回归，LLM 裁判用于扩大规模，人类抽样用于校准和复核。每次调整提示词、模型或流程都重新运行评估，同时跟踪成本和延迟。

| 方法 | 速度 | 成本 | 适用场景 |
| --- | --- | --- | --- |
| 自动指标 | 很快 | 很低 | 译文、摘要和有明确答案的任务 |
| 公开基准 | 快 | 低 | 对比模型的通用能力 |
| 人工评估 | 慢 | 高 | 开放任务的细致检查和最终验收 |
| LLM 裁判 | 快 | 中等 | 批量评价对话、RAG 和智能体 |

## 常见问题

- **BLEU 和 BERTScore 有何区别？** 前者侧重词组重叠，后者比较上下文语义向量。
- **基准高分能证明产品效果吗？** 产品需要用自己的任务、数据和用户输入验证。
- **什么是数据污染？** 模型训练时接触过测试题或答案，导致分数偏高。
- **评估应该什么时候做？** 上线前做基线评估，发布后持续监测，每次关键修改重跑。
- **还应该测哪些东西？** 除答案质量外，还要测延迟、成本、安全和任务成功率。
