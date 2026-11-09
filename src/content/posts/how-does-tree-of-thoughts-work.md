---
title: "思维树是如何工作的？"
description: "用 24 点游戏说明思维树怎样生成和评估候选路径，结合广度优先或深度优先搜索找到答案。"
publishedAt: "2026-11-09"
readingOrder: 48
originalPublishedAt: "2026-10-07"
tags: ["AI", "LLM", "提示词工程", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/how-does-tree-of-thoughts-work"
draft: false
---

![Outcome School 原文封面](/images/posts/how-does-tree-of-thoughts-work.png)

思维树（Tree of Thoughts，ToT）让大语言模型提出多条推理路径，评价每条路径的进展，再用搜索选择值得继续的分支。Shunyu Yao 等人在 2023 年的论文《Tree of Thoughts: Deliberate Problem Solving with Large Language Models》中提出了这种方法。

## 从思维链到思维树

模型从左到右生成[词元](https://outcomeschool.com/blog/tokenization-in-llms)。[思维链提示](/posts/how-does-chain-of-thought-prompting-work/)让模型先写步骤再回答。例如一家店有 23 个苹果，卖了 20 个又进了 6 个，分步计算是 `23 - 20 = 3`，再算 `3 + 6 = 9`。思维链沿一条路径继续，开头的判断失误可能影响后续每一步。解迷宫或填字时，人通常会尝试多个选项，也会遇到死路就回头。思维树把这个过程写进外层程序。

```text
                     [Problem]
                         ↓
          +--------------+--------------+
          ↓              ↓              ↓
     [Thought A]    [Thought B]    [Thought C]
          ↓              ↓              ↓
     +----+----+        [B1]         dropped
     ↓         ↓         ↓
    [A1]      [A2]      [B2]
     ↓         ↓
  [Answer]  dropped
```

一个“思路”是解决问题的一个中间单位，可以是算式、填进去的词或一份故事提纲。当前状态由原题和这条路径上已经选定的所有思路组成。

## 四个步骤

1. **划分思路**。任务设计者决定每步多大。太细时很难独立评判，太大时不容易提出有意义的备选方案。
2. **生成候选**。可以多次独立采样，适合开放式写作等选择多的任务。也可以在一次调用中要求模型列出多个不同的候选，适合可选操作有限的谜题。
3. **评估状态**。用[大模型评审](/posts/llm-as-a-judge/)估计哪个分支更有希望。可以分别打分，例如“肯定可解”“可能可解”“看起来无解”，也可以同时展示多个分支，让模型投票。重复评估能降低单次判断的波动，仍有可能误剪枝。
4. **搜索**。广度优先搜索一层层生成和评估，每层只保留分数最高的 `b` 个状态，适合步数较少且固定的题。深度优先搜索优先走一条看好的路径，碰到死路回溯，适合填字等路径较长的任务。

## 24 点示例

给定 `4、9、10、13`，每步任选两个数做四则运算，用结果替换这两个数。四个数减少到一个数正好要三步，目标是得到 24。第一层可以提出以下四个候选。

```text
(a) 4 + 9 = 13    left: 10, 13, 13
(b) 10 - 4 = 6    left: 6, 9, 13
(c) 13 - 9 = 4    left: 4, 4, 10
(d) 9 * 4 = 36    left: 10, 13, 36
```

原文用评估器的判断演示保留 `6, 9, 13` 和 `4, 4, 10`，剪掉另外两条分支。这里的评估标签是模型给出的判断。沿 `4, 4, 10` 这条分支，`10 - 4 = 6` 使剩余数字变为 `4, 6`。另一种操作 `4 + 4 = 8` 则留下 `8, 10`，优先级更低。第三层计算 `4 × 6 = 24`，解题路径为：

```text
13 - 9 = 4
10 - 4 = 6
4 * 6 = 24
```

## 广度优先的代码示意

```python
def tree_of_thoughts(problem, steps=3, keep=5):
    states = [problem]                  # level 0: only the problem

    for level in range(steps):
        candidates = []
        for state in states:
            for thought in llm_propose(state):      # Step 2: generate
                candidates.append(state + "\n" + thought)

        scored = [(llm_judge(c), c) for c in candidates]  # Step 3: judge
        scored.sort(reverse=True)                         # best first
        states = [c for score, c in scored[:keep]]        # Step 4: keep best

    return states[0]                    # the best final path
```

每一轮先为所有保留状态生成后继，再对候选打分和排序。`keep` 是保留的路径数，`steps` 是搜索深度。实际实现还要处理没有候选的情况，并对最终解做验证。

## 适用范围

| 方面 | 思维链 | 思维树 |
| --- | --- | --- |
| 路径 | 一条 | 多条 |
| 每步候选 | 一个 | 多个 |
| 评估与回溯 | 通常直接沿当前路径继续 | 可打分、剪枝，也可回溯 |
| 模型调用 | 通常一次 | 生成和评估可能需要多次 |
| 适合的任务 | 过程明确、步骤较短 | 值得试错、比较或回退的复杂任务 |

思维树可以使用现成模型，调节步长、保留宽度和搜索方式。主要成本是额外的推理调用，也可能因为评审错误丢掉可行解。[推理模型](https://outcomeschool.com/blog/large-reasoning-models)能在内部进行一定程度的探索和检查。构建需要显式控制搜索预算、路径数量与评估方式的[智能体](/posts/ai-agent/)时，仍可在应用层使用思维树。
