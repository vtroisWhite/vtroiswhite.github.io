---
title: "Jev 与 System One 模型详解"
description: "通过客服分流示例，了解 Jev 如何并行返回类型化决策、校准概率，以及它与生成式模型如何配合。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-09-17"
tags: ["AI", "LLM", "模型路由", "决策模型", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/jev-and-system-one-models-explained"
readingOrder: 65
draft: false
---

![Jev 与 System One 模型详解的原文配图](/images/posts/jev-and-system-one-models-explained.png)

Jev 是 TypeSafe AI 于 2026 年 9 月 15 日发布的首个系统一模型（System One Model）。应用给它一段状态和几个类型明确的问题，它从允许的选项中选出答案，并返回各项决策的概率，供代码直接使用。

## 系统一与系统二

丹尼尔·卡尼曼用两类思考方式解释人的判断。系统一快速、自动，例如看到熟人立即认出对方。系统二需要更多时间和注意力，例如一步步计算 17 乘以 24。TypeSafe 用「系统一」为快速、重复的决策任务命名。

邮件分类、支持工单分流或合规检查经常只需要从有限类别里选一个。传统生成模型使用[自回归](https://outcomeschool.com/blog/autoregressive-models)机制逐个预测[词元](https://outcomeschool.com/blog/tokenization-in-llms)。[推理模型](https://outcomeschool.com/blog/large-reasoning-models)还能在较复杂任务上做多步推理，这些能力适合开放任务，也会给简单决策带来额外耗时。

## 用 LLM 做工单分流会遇到什么问题

假设客服系统要求模型把工单放入账单、技术或账号队列。

```python
prompt = """
Classify this support ticket into one of: billing, technical, account.
Reply with only the category name.

Ticket: My card was charged twice.
"""

response = llm.generate(prompt)
category = response.text.strip()
```

即使提示词要求只返回类别，模型也可能带上句子、标点，或输出列表外的标签。应用要解析文本、检查类别是否合法，同时可能得不到可用于阈值判断的置信度。调用规模大时，逐词元生成的延迟和费用也会累积。

## Jev 怎样工作

原文把输入分成两部分。

- **状态。** 用文本、文本列表或 JSON 组织当前判断所需的信息。例如工单内容、交易记录和退款政策。
- **问题和允许的答案。** 例如「应该交给哪个团队」允许 `billing`、`technical`、`account`。

输出包括每个问题的类型化答案和对应的概率。下面是原文中的调用示意。

```python
result = jev.decide(
    state={
        "message": "My card was charged twice.",
        "recent_transactions": ["$49 on Sep 10", "$49 on Sep 10"]
    },
    questions={
        "team": ["billing", "technical", "account"],
        "is_urgent": "yes_no",
        "frustration": {"min": 0, "max": 2}
    }
)
```

```text
{
  "team": { "answer": "billing", "probability": 0.97 },
  "is_urgent": { "answer": true, "probability": 0.88 },
  "frustration": { "answer": 1, "probability": 0.74 }
}
```

Jev 一次读取状态，并行处理多个问题，像同时为表格勾选多项。按 [TypeSafe 的发布公告](https://typesafe.ai/blog/introducing-system-one-models-and-jev)，原文所述的测试延迟约为 70 至 500 毫秒。在该公司的任务和对照设置中，相比部分生成模型的速度优势可达几十倍，个别对照可达约 193 倍。发布时的价格为每百万输入词元 0.042 美元，输出不另计费。

## 三种类型化答案

| 类型 | 约束 | 示例 |
| --- | --- | --- |
| Choice | 从固定列表中选一项，原文版本每个列表最多 255 项 | 账单、技术或账号 |
| Score | 从定义好的分值范围取值 | 质量从 1 到 5 分 |
| Yes/No | 判断一个陈述是否成立 | 工单是否紧急 |

选择题可理解为给每个候选选项分配概率，然后返回分数最高的一项。候选集由应用在调用前提供，答案域也随之确定。生成模型按文本格式输出 JSON 时，应用则需要解析结果并检查是否符合约定。

## 概率校准与 RLCD

如果一批结果都标为「约有 90% 把握」，在校准良好的情况下，其中大约 90% 应该正确。语言模型生成一句「我很确定」，没有直接表达同样的统计含义。[基于人类反馈的强化学习](https://outcomeschool.com/blog/reinforcement-learning-from-human-feedback-rlhf)可以用于改善生成结果，Jev 的训练则专门针对决策和概率校准。

TypeSafe 将这一做法称为「用于校准决策的强化学习」（RLCD）。原文用[强化学习](https://outcomeschool.com/blog/reinforcement-learning)的奖励来解释其目标。高置信的正确判断获得较高奖励，高置信的错误判断受到较大惩罚。应用据此可以将低置信案例交给人处理。

```python
if result["team"]["probability"] > 0.9:
    route_to(result["team"]["answer"])
else:
    send_to_human()
```

置信度是批量统计意义上的量，分到 `0.9` 的单条工单仍可能被错误归类。

## 「不会产生幻觉」指的是什么

自由生成可能出现[大模型幻觉](/posts/why-do-llms-hallucinate-the-token-level-explanation/)，如编造函数名或不存在的类别。对分类系统来说，要分别考虑输出越界和分类不正确。Jev 的固定选项结构约束了第一类错误，例如账单、技术、账号的三选一不会返回第四个类别。模型仍可能在三个合法选项里选错。可以结合概率阈值、人工核验和验证集控制业务风险。

## 适用场景和局限

Jev 适合按固定范围进行垃圾邮件判断、[模型与任务路由](https://outcomeschool.com/blog/llm-routing)、相关性和质量打分，也可作为[以模型评分](/posts/llm-as-a-judge/)或[安全护栏](/posts/how-do-llm-guardrails-work/)的组成部分。应用还可以在大量记录上重复执行相同判定。原文讨论的是发布时的文本输入版本，有固定候选数量限制。生成邮件、代码、摘要或详细解释，以及需要开放式多步推理的任务，由生成模型承担。

在客服系统中，Jev 可以先确定团队、紧急程度和能否自动回复。满足条件后让大模型起草回复，再用决策模型判断回复是否符合规则。这是[AI 编排](/posts/ai-orchestration/)中的分工方式。

## 常见问题

- **一次能判断多个问题吗？** 可以。它并行处理同一状态上的多项问题，为各项返回各自的概率。
- **概率经过校准就可以直接相信吗？** 还要结合具体任务的数据分布，验证阈值下的表现。
- **Jev 与要求语言模型返回 JSON 有何区别？** Jev 的回答类型和允许选项在运行前就已定义。
