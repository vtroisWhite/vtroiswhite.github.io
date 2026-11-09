---
title: "什么是 Sakana Fugu？技术报告解读"
description: "解读 Sakana Fugu 与 Fugu-Ultra 的模型选择、训练方法、工作流与基准成绩。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-06-22"
tags: ["AI", "LLM", "AI 智能体", "多模型编排", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/decoding-sakana-fugu"
readingOrder: 64
draft: false
---

![什么是 Sakana Fugu？技术报告解读的原文配图](/images/posts/decoding-sakana-fugu.png)

Sakana Fugu 是一系列由 Sakana AI 开发的编排模型。用户提交问题，Fugu 选择适合处理问题的模型。需要多个模型时，编排器安排协作方式并汇总答案。Sakana AI 在[技术报告](https://arxiv.org/abs/2606.21228)中介绍了这套方法。该团队的创始人之一 Llion Jones 也是最初[Transformer](/posts/decoding-transformer-architecture/)论文的作者之一。

## 为什么要编排多个模型

报告观察到，参与测试的 GPT、Claude Opus 和 Gemini 各有强项。GPT 擅长数学和综合规划，Opus 在软件工程与安全调试上表现突出，Gemini 擅长实现已有算法，以及部分科学问题。只用一种模型，就会继承它在不同任务中的强弱项。Fugu 把[AI 编排](/posts/ai-orchestration/)作为可学习的能力，为每个问题选择模型或工作流。

```text
                  +-----------------------+
   "Write me      |    Fugu Orchestrator  |
    binary    --> |  (reads the question, | --> picks the right worker(s)
    search"       |    builds a plan)     |
                  +-----------------------+
                       |       |       |
                       v       v       v
                   +------+ +------+ +------+
                   | GPT  | | Opus | |Gemini|   <- pool of frontier workers
                   +------+ +------+ +------+
                       |       |       |
                       +-------+-------+
                               |
                               v
                          Final Answer
```

团队称这种方式为集体智能。每个模型像一个专家，协作能让团队处理单个成员不擅长的部分。模型池可以按访问权限、政策或服务状态筛选，某个模型不可用时可以改用其他模型。报告也讨论了加入新模型时复用编排策略的灵活性。

## Fugu 和 Fugu-Ultra

| 维度 | Fugu | Fugu-Ultra |
| --- | --- | --- |
| 优先目标 | 在速度和效果之间取得平衡 | 提高困难任务的回答质量 |
| 执行方式 | 为输入选择一个执行模型 | 为输入设计多个执行模型参加的计划 |
| 延迟 | 接近调用一个模型 | 取决于工作流，通常更长 |
| 前序研究 | Trinity | Conductor |
| 场景 | 日常聊天、编程 | 复杂、多步任务 |

与简单[模型路由](https://outcomeschool.com/blog/llm-routing)相比，Fugu 系列关注在真实任务中何时换用模型，以及多模型怎样交接信息。Fugu 的快速选择和 Fugu-Ultra 的计划生成采用不同的机制。

## Fugu 如何用轻量选择头挑模型

一个[预训练](https://outcomeschool.com/blog/llm-pretraining)语言模型作为骨干，从问题生成隐藏状态 `h`。语言模型原有的 LM Head 用于预测词元。Fugu 另加一个小型选择头，从同一状态得到一组[原始分数 logits](https://outcomeschool.com/blog/logits-in-machine-learning)。模型池有 `L` 个候选，就输出 `L` 个分数，最高分对应本次使用的执行模型。

```text
  Question --> [ Language Model backbone ] --> hidden state h
                                                  |
                            +---------------------+---------------------+
                            |                                           |
                       [ LM Head ]                        [ Lightweight Selection Head ]
                    (writes normal text)                              |
                                                          L scores, one per worker model
                                                                      |
                                                          pick the highest -> dispatch
```

选择头在序列靠前的位置读取隐藏状态，用分数即可作决定，无须先生成文字解释。前序研究 Trinity 同时为模型选择思考、执行或验证等角色，Fugu 将选中的模型直接作为执行者，缩小了决策空间。训练只调整少量参数。用于选择可调整部分的数学工具是奇异值分解（SVD），沿用了 Sakana AI 的 Transformer-squared 研究。

## 先做监督微调

第一阶段是[监督微调（SFT）](https://outcomeschool.com/blog/how-does-fine-tuning-work)。对答案已知的题目，让模型池里每个模型运行多次，再计算平均奖励。假设数学题上 GPT、Opus、Gemini 的平均分是 0.9、0.6、0.3。如果只把 GPT 当成标签，就会丢失其他模型之间的差距。训练用[Softmax](https://outcomeschool.com/blog/softmax-function)把奖励变成软目标分布。

```text
p(j) = exp(r_j / T) / sum over all j' of exp(r_j' / T)
```

这里的 `r_j` 是模型的平均奖励，`T` 是控制分布锐利程度的[温度](https://outcomeschool.com/blog/how-does-temperature-control-llm-output)。取 `T = 1`，三个指数值约为 2.460、1.822、1.350，总和约 5.632。除以总和后，得到约 `(0.437, 0.324, 0.240)`。温度越低，分布越偏向分数最高的模型。

将选择头的预测也转成概率，用[KL 散度](https://outcomeschool.com/blog/kl-divergence)衡量它和目标分布的差距。

```text
L_SFT = average over all questions of D_KL( p( . ) || pi( . | q ) )
```

```text
D_KL = sum over all j of p(j) * ln( p(j) / pi(j) )
```

如果预测分布是 `(0.5, 0.3, 0.2)`，三项贡献约为 −0.059、0.025、0.044，总和约为 0.010。训练把预测推向软目标，两个分布相同时散度为零。公式中的 `pi` 表示选择头的预测分布。

## 用进化策略适应端到端任务

第一阶段可单独评估每个执行者。实际编程任务会读取项目、修改文件、执行工具再按错误反馈重试。往往直到结束才知道是否成功，难以把这个离散结果转成逐步[梯度](https://outcomeschool.com/blog/math-behind-gradient-descent)。报告使用可分离的协方差矩阵适应进化策略（sep-CMA-ES），从当前参数生成随机扰动，在端到端任务上评估候选，再按表现好的候选更新参数。

例如，当前值为 0，步长为 1，随机扰动为 0.5、−0.3、1.0、−0.8。四个候选的适应度分别是 0.8、0.5、0.9、0.2。取最佳两个，对对应扰动以 0.7 和 0.3 加权，新值就是 `0 + 0.7 × 1.0 + 0.3 × 0.5 = 0.85`。多轮之后，参数往完成率更高的方向移动。

```text
theta_k   = theta_t + sigma_t * D_t * z_k,   with z_k drawn from a normal distribution
theta_next = theta_t + sigma_t * D_t * sum over j of ( w_j * z_j )
```

`theta_t` 是当前参数，`sigma_t` 是搜索步长，`D_t` 是对角矩阵，`z_k` 是从正态分布取出的扰动。可分离版本用对角项调整每个方向的探索范围，避免保存所有参数两两之间的协方差。

## Fugu-Ultra 用 Conductor 生成工作流

Fugu-Ultra 为多个[智能体](/posts/ai-agent/)生成工作流。计划中的每一步包含三项信息。

1. **子任务。** 写给执行模型的自然语言指令。
2. **执行者 ID。** 指定哪个模型来处理。
3. **访问列表。** 规定执行者能读取哪些前置任务的结果。

这样可以组织串行流程，也可以让多个模型独立解题，再由另一个模型筛选和汇总。技术报告给出一例冷门知识题，Gemini 和 GPT 各自尝试，随后由另一次 Gemini 调用读取两份部分正确的答案并合成正确结果。遇到难数学题，汇总环节可以改用 GPT。

```text
        Subtask: "answer this hard question"
                   /              \
            (leaf)                  (leaf)
        Gemini attempt           GPT attempt
                   \              /
                    v            v
                Gemini aggregator
            (reads both through the access list,
             keeps the correct parts of each)
                        |
                        v
                   Final Answer
```

## 用 GRPO 学习如何编排

Fugu-Ultra 使用[强化学习](https://outcomeschool.com/blog/reinforcement-learning)中的[组相对策略优化（GRPO）](https://outcomeschool.com/blog/group-relative-policy-optimization-grpo)。每个问题生成一组计划。计划格式有误得 0 分，计划能运行但答案错得 0.5 分，运行且答案正确得 1 分。组内的相对优势值如下。

```text
A_i = ( r_i - mean(r_1, ..., r_G) ) / std(r_1, ..., r_G)
```

例如四个计划得分为 `(1, 0.5, 0.5, 0)`，平均数为 0.5，标准差约为 0.354，得到的优势约为 `(1.41, 0, 0, -1.41)`。训练强化高于组均值的计划，降低较差计划的概率。GRPO 的完整目标还有用于限制更新幅度的裁剪项，并可包含 KL 项。报告指出 Fugu-Ultra 的训练没有使用 KL 项。

## 工作流内隔离，会话间共享

多个智能体可调用[工具](/posts/how-does-function-calling-work-in-llms/)执行代码、搜索或读取文件。如果它们都看到第一位执行者的全部过程，容易重复同一路线，失去独立解题的价值。工作流内，执行者只看自己的历史和访问列表授权的材料。

在较长对话中，完全隔离又会让角色重复查询。因此跨工作流保留一份过去工具调用的[共享记忆](/posts/ai-agent-memory/)。这样既能维持单个任务内部的探索独立性，也能复用先前已经取得的信息。

```text
   Workflow (one question)
   +-------------------------------------------+
   |  Agent A lane   Agent B lane   Agent C lane |
   |     |              |              |          |
   |  isolated      isolated      isolated        |   <- inside a workflow:
   |  (see others only via the access list)       |      stay independent
   +-------------------------------------------+
                        |
                        v
            +---------------------------+
            |  Persistent shared memory  |   <- across the conversation:
            |  (past tool calls, facts)  |      share useful background
            +---------------------------+
```

## 报告中的评测

| 基准 | Fugu-Ultra | Fugu | Claude Opus 4.8 | Gemini 3.1 | GPT-5.5 |
| --- | ---: | ---: | ---: | ---: | ---: |
| SWE Bench Pro | 73.7 | 59.0 | 69.2 | 54.2 | 58.6 |
| Terminal Bench 2.1 | 82.1 | 80.2 | 74.6 | 70.3 | 78.2 |
| GPQA Diamond | 95.5 | 95.5 | 92.0 | 94.3 | 93.6 |
| Humanity’s Last Exam | 50.0 | 47.2 | 49.8 | 44.4 | 41.4 |

这些数字对应报告中的测试版本。例如，Fugu-Ultra 在 SWE Bench Pro 的得分高于报告中列出的各个执行模型。报告还测试了编写魔方求解器、盲棋、股票交易模拟、[自主 AI 研究](https://outcomeschool.com/blog/what-is-recursive-self-improvement-rsi)、日本古典手稿阅读和 CAD 零件生成。原文列出的结果包括通过 300 个魔方测试、四场盲棋获胜，以及 50 周交易模拟中从 10,000 美元到 11,943 美元。

## 训练中出现的协作策略

- **独立尝试后汇总。** 让多个模型分别作答，再选适合当前问题的汇总者。
- **先实现，再排查。** 编程任务可由 GPT 搭建服务，Opus 在关键节点找出错误或安全漏洞，之后把发现交回修复。
- **按需调用专家。** 密码分析可以先用擅长安全的 Opus 找切入点，再用 GPT 推导所需数学细节。

## 常见问题

- **用户面对的是几个模型？** 应用给用户一个统一入口，由编排模型在后台选执行者。
- **模型不可用怎么办？** 可以从模型池中停用它，并将请求分配给仍可用的模型。
- **团队一定比单个模型强吗？** 报告显示部分基准有收益，结果取决于任务、工作流及模型池。
