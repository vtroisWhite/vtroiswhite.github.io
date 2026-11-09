---
title: "什么是 LLM 裁判？如何用大语言模型评估模型输出"
description: "介绍单答案评分、成对比较、参考答案和评分细则，并给出裁判提示词、偏差处理及人工校准方法。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-05-21"
readingOrder: 24
tags: ["AI", "LLM", "模型评估", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/llm-as-a-judge"
draft: false
---

![什么是 LLM 裁判？如何用大语言模型评估模型输出的原文封面](/images/posts/llm-as-a-judge.png)

LLM 裁判是用大语言模型评估模型输出的一种方法。裁判读取用户输入、待评回答和评分规则，输出分数或判定，并给出理由。它可以用于对话、RAG、提示词迭代和智能体评估。

## 为什么需要 LLM 裁判？

人工能辨别答案的含义、语气和错误，但逐条人工打分难以扩展。BLEU、ROUGE 等规则指标成本较低，面对同义改写和开放式对话时能力有限。LLM 裁判可以按语义和自定义规则批量评分，适合作为[模型评估](/posts/llm-evaluation/)的一个环节。具体评价什么，应由可验证的[完成标准](/posts/ai-is-only-as-good-as-our-definition-of-done/)决定。

## LLM 裁判怎么工作？

把问题、模型回答和评分标准组成提示词，发给裁判模型。然后解析分数和理由，用于比较版本或定位问题。例如：

```text
You are an expert evaluator. Read the user question and the assistant answer below. Rate the answer on a scale of 1 to 5 based on helpfulness.

User question: How do I reset my password?

Assistant answer: To reset your password, click on the Forgot Password link on the login page. Enter your email address. You will receive a reset link in your email.

Give your score as a number from 1 to 5. Also give a short reason for your score.
```

裁判返回的结果可整理成这样的记录：

```text
Score: 5
Reason: The answer is clear, step-by-step, and directly addresses the user question. It tells the user exactly what to do.
```

复杂评估可以拆成多个有明确职责的节点，详见[图工程](/posts/what-is-graph-engineering/)。

## 常见裁判形式

| 类型 | 评估方式 |
| --- | --- |
| 单答案评分 | 评估一个回答，给出分数或通过与否 |
| 成对比较 | 给同一问题的两个回答，选择更好的一项，也可允许平局 |
| 参考答案评估 | 提供标准答案或来源，核对候选输出的事实与覆盖范围 |
| 按评分细则评估 | 用明确的分档分别判断正确性、清晰度、礼貌程度等维度 |

## 怎样构建一个裁判？

1. 确定可判断的评价标准，例如正确、清晰、礼貌。
2. 选择能力足够的裁判模型。
3. 写清任务、输入、待评回答、评分规则和返回格式。
4. 在少量有代表性的样本上试跑。
5. 对照人工评分，检查分歧来自裁判、提示词还是评价标准。
6. 调整规则和示例，再次验证。
7. 确认可靠后扩展到批量评估，并持续抽查。

## 评分提示词模板

模板中保留任务、输入、输出、评分尺度和结构化返回字段。下方为原文示例：

```text
You are an expert evaluator. Your task is to evaluate the response given by an AI assistant to a user question.

Evaluate the response based on the following criteria:

1. Accuracy: Is the response factually correct?
2. Helpfulness: Does the response solve the user's problem?
3. Clarity: Is the response easy to understand?

User question:
{user_question}

Assistant response:
{assistant_response}

Give your evaluation in the following format:

Accuracy score (1-5): <score>
Helpfulness score (1-5): <score>
Clarity score (1-5): <score>
Overall score (1-5): <score>
Reason: <short explanation of your scores>

Be fair and consistent. Base your scores only on the response given above.
```

## 按步骤评分与 G-Eval

[G-Eval 使用思维链提示](/posts/how-does-chain-of-thought-prompting-work/)把笼统的质量要求拆成检查步骤，裁判再根据步骤给分。先检查问题是否被回答，再检查事实和表达质量，可让评分理由更便于复核。

```text
You are an expert evaluator. Your task is to evaluate the response below.

Criterion: Helpfulness

Step 1: Write down the evaluation steps you will use to check if the response is helpful. Think carefully.
Step 2: Apply each step to the response one by one. Write your reasoning for each step.
Step 3: Based on your reasoning, give a final score from 1 to 5.

User question:
{user_question}

Assistant response:
{assistant_response}

Now, follow Step 1, Step 2, and Step 3 in order.
```

## 裁判可能出现哪些偏差？

- **风格偏差。** 偏好看起来专业、整洁或接近自身写作风格的回答。
- **位置偏差。** 两两比较时倾向固定位置。
- **长度偏差。** 冗长回答可能得到比简洁准确答案更高的分。
- **自我偏好。** 裁判可能偏好自己的输出或同一模型系列的输出。
- **偏好泄露。** 答案通过迎合裁判或泄露预期偏好影响评分。
- **权威与从众偏差。** 回答声称来自权威或受到多数认同时，可能影响裁判判断。

## 实践建议

选择足够强的模型，给出明确分档及少量已评分示例，让输出包含可审查的理由。成对比较时交换 A、B 的位置再评估，检查分数是否稳定。重要评估可采用不同模型系列组成裁判组，再汇总结果。标准过多时分开评分，并持续用人工样本校准。

## 实际用途

- 对比模型或[微调](https://outcomeschool.com/blog/how-does-fine-tuning-work)版本，观察提示词改动带来的差异。
- 抽查聊天机器人答复，在生产中追踪质量。
- 辅助审核或评估[大语言模型护栏](/posts/how-do-llm-guardrails-work/)。
- 检查 [RAG](/posts/retrieval-augmented-generation-rag/)回答是否受检索材料支持，是否有[幻觉](/posts/why-do-llms-hallucinate-the-token-level-explanation/)。
- 在[智能体系统](/posts/ai-agent/)中检查工具调用、步骤与最终答案，详见[如何评估 AI 智能体](/posts/ai-agent-evaluation/)。

## 常见问题

- **LLM 裁判和人工评估一样可靠吗？** 可靠性取决于任务和校准效果。重要决策需要人工样本和持续复核。
- **为何不用 BLEU 或 ROUGE？** 它们适合计算词面重叠，较难衡量没有唯一参考答案的表达。
- **同一个模型能生成和打分吗？** 可以，但要留意自我偏好，有条件时选不同模型系列。
- **怎样验证裁判？** 用一批有人工评分的样本衡量一致性，分析失配，再随版本持续跟踪。
- **裁判模型一定要更小吗？** 成本要结合任务衡量，重点是裁判是否具备稳定执行评分规则的能力。
