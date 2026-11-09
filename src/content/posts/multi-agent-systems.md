---
title: "什么是多智能体系统？什么时候应该使用它？"
description: "从角色分工、消息传递和任务协调入手，了解多智能体系统的运行方式、代价与适用条件。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-04-29"
tags: ["AI", "AI 智能体", "多智能体系统", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/multi-agent-systems"
readingOrder: 54
draft: false
---

![什么是多智能体系统？什么时候应该使用它？的原文配图](/images/posts/multi-agent-systems.png)

多智能体系统由两个或更多基于大语言模型的[AI 智能体](/posts/ai-agent/)协作完成一项任务。每个智能体有自己的提示词和工具，有时也使用不同的模型。协调层决定任务分配和执行顺序，就像电影制作中导演、摄影师、演员和剪辑师各有分工，并按拍摄流程交接。

## 多智能体系统的三个支柱

- **专业分工。** 调研、写作和审查交给不同角色，每个角色的系统提示词和工具集更容易保持集中。
- **通信。** 智能体通过结构化消息、共享状态或交接共享信息，后续角色才能接续前一步的结果。
- **协调。** 系统需要决定谁先运行、谁等待，以及何时结束。可以用固定工作流、路由规则或专门的协调者实现。[AI 编排](/posts/ai-orchestration/)介绍了连接模型、工具和步骤的模式。

## 常见角色

| 角色 | 职责 |
| --- | --- |
| 协调者（Orchestrator） | 接收请求、拆解任务、分派工作并合并结果。 |
| 执行者（Worker） | 完成研究、写作、编程、分析等专门工作。受主智能体调度的执行者也称为[子智能体](/posts/ai-subagents/)。 |
| 路由器（Router） | 判断哪一个执行者适合当前输入。 |
| 规划者（Planner） | 产出行动步骤，交由执行者落实。参见[规划与执行智能体](/posts/plan-and-execute-agent/)。 |
| 审查者（Critic） | 根据明确的质量、安全和正确性标准检查结果，有问题时要求修订。审查者需要能查独立来源或调用核验工具。这与[以大模型为裁判](/posts/llm-as-a-judge/)相近，只是这里的审查发生在执行过程中。 |
| 工具专家 | 封装特定工具或数据源的使用细节，例如熟悉表结构的数据库智能体。 |

### 例子：处理一封售后邮件

客户收到破损商品，发邮件要求退款。协调者把订单、退货政策和客户历史的查询交给调研员，再把材料交给写作者。审查者按语气、事实和政策要求检查草稿，有问题就退回。协调者在审查通过后才发出回复。

```text
Customer Email
    |
    v
Orchestrator
    |
    v
Researcher --> notes
    |
    v
Writer --> draft
    |
    v
Critic --> approve or revise
    |
    v
Final Reply
```

第一轮，协调者说明要查哪些材料，调研员返回订单和政策等事实。

```json
{
  "task": "look up order details, return policy, and customer history",
  "order_id": "4521"
}
```

```json
{
  "notes": {
    "order": {
      "id": "4521",
      "item": "blue running shoes",
      "status": "delivered",
      "delivered_on": "2026-04-10"
    },
    "policy": "Damaged items can be returned within 30 days for a full refund.",
    "customer": {
      "name": "Alex",
      "tier": "regular",
      "past_returns": 1
    }
  }
}
```

第二轮，写作者拿到资料和语气要求，生成个性化的草稿。

```json
{
  "notes": { "...": "the notes from Round 1" },
  "customer_name": "Alex",
  "tone": "warm and clear"
}
```

```json
{
  "draft": "Hi Alex, I am sorry to hear your blue running shoes arrived damaged..."
}
```

第三轮，审查者收到草稿与检查项，返回判断及需要修改的问题。

```json
{
  "draft": "Hi Alex, I am sorry to hear your blue running shoes arrived damaged...",
  "check_for": ["tone", "accuracy", "policy compliance"]
}
```

```json
{
  "verdict": "needs revision",
  "issues": ["The reply does not mention the 30-day return window."]
}
```

协调者把意见反馈给写作者。为每轮消息约定字段，可以明确责任和输入。简单系统可能只需一个协调者和两个执行者，出现明确需求时再增加角色。

## 智能体怎样通信

[智能体之间的通信](/posts/how-ai-agents-communicate/)有以下三种常见做法。

```text
Message Passing:    A <--msg--> B    (point-to-point between any agent pair)

Shared State:        A     B     C
                      \    |    /
                       v   v   v
                    +-------------+
                    |  Blackboard |   (all agents read and write)
                    +-------------+

Handoffs:           A --(work + context)--> B --(work + context)--> C
```

1. **传递消息。** 消息包含任务、背景和必要的输入。少量智能体之间的点对点传递清晰直接，参与者一多就更难管理。
2. **共享状态。** 各智能体从同一个「黑板」读取所需数据，再写回结果。系统需要约定读写规则。
3. **交接。** 一个智能体完成自己的工作，把任务材料和控制权一起交给下一个，然后退出当前循环，像接力赛交棒一样。

同一个系统可以用交接维持主流程、用消息进行旁路查询、用共享状态保存公共背景。可以共享全部[记忆](/posts/ai-agent-memory/)，也可以只共享摘要或让各智能体分别保留自己的记忆。选择取决于上下文信息量与词元成本。

## 智能体怎样协调

```text
Sequential:    A -> B -> C -> D

Parallel:      Request
                 |
             +---+---+
             |   |   |
             A   B   C
             |   |   |
             +---+---+
                 |
              Merge -> Response

Router:        Request -> Router -> (A or B or C)

Hierarchical:       Orchestrator
                    /     |     \
                   A      B      C

Graph:          A <--> B
                ^      ^
                v      v
                C <--> D
                (any agent can call any other)
```

- **串行。** 后一步依赖前一步的输出。易于理解和调试。
- **并行。** 独立任务同时执行，最后汇总。存在依赖时需要先完成前置步骤。
- **路由。** 路由器根据请求类别选择执行者。
- **分层。** 协调者分派工作，执行者可以继续向下委派，适合嵌套任务。
- **图或网络。** 智能体根据执行中得到的信息动态选择后续角色，灵活性较高，排查问题也更费力。参见[图工程](/posts/what-is-graph-engineering/)。

## 单智能体与多智能体系统的取舍

| 方面 | 单智能体 | 多智能体系统 |
| --- | --- | --- |
| 提示词与工具 | 集中到同一处，容易随任务变长 | 按角色拆分，单个提示词较聚焦 |
| 并行 | 一轮内可以并行调用工具 | 独立工作天然可并行 |
| 调试 | 主要检查一个循环 | 要追踪多个循环、交接和中间状态 |
| 延迟和成本 | 简单任务开销较小 | 多次交接增加延迟，独立工作并行可缩短等待 |
| 复杂任务 | 工具、职责增多时容易影响质量 | 分工清晰时更容易扩展 |
| 故障 | 单个执行过程出错 | 可能局部出错，也可能沿任务链传播 |

常见的折中是一位主智能体配一两个辅助角色。例如，将读取不可信网页的能力与高权限工具分给不同的角色，有助于限制[提示词注入](/posts/prompt-injection-in-llms/)的影响范围。

## 常见错误及处理

1. **对话多于工作。** 设置最大轮次和明确的交接条件，避免无目标的互相询问。
2. **职责重叠。** 在系统提示词中写清楚各角色的范围，让协调者统一路由。
3. **错误沿链传播。** 一条错误事实可能被改写成看似可靠的文章。对关键中间结果做有独立依据的检查。
4. **协调开销过高。** 优先采用能满足要求的最简单流程，减少自由对话。
5. **同一输入下路径变化。** 降低协调步骤的[温度](https://outcomeschool.com/blog/how-does-temperature-control-llm-output)，并固定工作流结构。即使温度为零，底层实现也可能引入变化。
6. **系统难以解释。** 新角色应有明确职责。逐步增加角色，保留跟踪记录、重试和词元预算。
7. **审查循环不收敛。** 给审查者明确的通过条件和修订轮次上限。反馈反复重复时按预先设好的规则结束。

## 何时值得使用

任务天然分为调查、写作和核对等专门工作，或存在可并行的独立子任务时，分工容易体现价值。也可以用快速的[小模型](https://outcomeschool.com/blog/small-language-models-slms)做[路由](https://outcomeschool.com/blog/llm-routing)、较强模型完成写作，或者在质量要求较高时增加一位审查者。单智能体已经能稳定完成的工作、各步强依赖同一上下文的工作，以及调试资源有限的系统，更适合从简单架构出发。[LangGraph](/posts/how-does-langgraph-work/) 和 AutoGen 可以承担部分连接与调度工作。

## 常见问题

- **几个相互独立的智能体算一个系统吗？** 需要通信和协调，才能围绕同一任务形成协作。
- **适合做编程任务吗？** 可以为范围明确的搜索、测试或审查设置独立角色。逐步修改同一段代码时，保留共享上下文通常更重要。
- **把温度设为零能保证每次结果相同吗？** 这可以减少采样差异，服务端及浮点实现仍可能带来变化。
