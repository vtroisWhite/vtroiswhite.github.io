---
title: "什么是 AI 智能体可观测性？追踪、跨度与指标详解"
description: "介绍如何为智能体记录每一次模型与工具调用，用日志、指标、追踪和跨度排查生产问题。"
publishedAt: "2026-11-09"
originalPublishedAt: "2026-05-27"
tags: ["AI", "AI 智能体", "可观测性", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/ai-agent-observability"
readingOrder: 62
draft: false
---

![什么是 AI 智能体可观测性？追踪、跨度与指标详解的原文配图](/images/posts/ai-agent-observability.png)

[AI 智能体](/posts/ai-agent/)在返回回答前可能调用模型、查询数据、读取记忆或执行工具。智能体可观测性记录这些可测量的步骤和中间结果，让开发者能够追查它为什么走了某条路径。

## 为什么需要可观测性

只看最终答复，很难知道错误来自模型、上下文、工具还是流程。跟踪单个请求可以找到慢调用、无效重试、异常[工具调用](/posts/how-does-function-calling-work-in-llms/)和高词元消耗。智能体读入网页或邮件时，追踪记录也有助于调查[提示词注入](/posts/prompt-injection-in-llms/)的入口和影响。

传统服务通常重点监控请求、资源和明确错误。智能体还要关注相同输入下路径可能变化、结果看似正常却不准确，以及模型调用、词元、费用和任务质量。

## 日志、指标、追踪

- **日志**是带时间的事件记录，例如一次查询失败。
- **指标**将很多次运行汇总成可比较的数值，例如错误率或 P95 延迟。
- **追踪（Trace）** 关联一次运行中的各项操作。一次独立操作的记录称为 **跨度（Span）**，包括开始和结束时间、状态、属性及父级信息。

规划跨度可以包含模型调用的子跨度，多个跨度连成一棵树。[图工程](/posts/what-is-graph-engineering/)把步骤设计成节点后，可以按节点划分跨度。

```text
TRACE: Book a flight from Delhi to Bangalore
│
├── SPAN: Receive user request
├── SPAN: Plan the task
│       └── SPAN: LLM call (decide to search flights)
├── SPAN: Tool call (flight search)
│       ├── input:  Delhi -> Bangalore, Friday
│       └── output: list of 12 flights
├── SPAN: Pick the cheapest flight
│       └── SPAN: LLM call (choose flight)
├── SPAN: Tool call (booking)
│       └── output: booking confirmed
└── SPAN: Return final confirmation
```

同一段用户会话可以包含多次独立运行。应用可用会话 ID 将各次追踪关联起来。

```text
SESSION  (one full user conversation)
│
├── TRACE 1  (request: "find flights")
│       ├── SPAN: LLM call
│       └── SPAN: tool call (search)
│
└── TRACE 2  (request: "book the first flight")
        ├── SPAN: LLM call
        └── SPAN: tool call (booking)
```

## 记录哪些信息

| 观察位置 | 示例 |
| --- | --- |
| 模型调用 | 模型名、[温度](https://outcomeschool.com/blog/how-does-temperature-control-llm-output)、词元、延迟、错误及经脱敏的输入输出 |
| 工具 | 名称、参数、调用结果、错误和耗时 |
| 规划与调度 | 应用产生的计划、分支选择和下一步 |
| [记忆和上下文](/posts/ai-agent-memory/) | 应用查了什么资料、向记忆写入了什么、哪些信息进入本轮输入 |
| 失败与重试 | 错误类型、尝试次数、回退和终止原因 |
| 最终结果 | 返回状态、任务是否完成、整体时间和成本 |

## 关注哪些指标

端到端延迟及各跨度耗时能帮助定位瓶颈。统计输入和输出词元、每次任务成本、错误率、工具调用成功率和任务成功率，可以观察质量和费用的变化。跟踪每项任务的步数，有助于发现智能体是否[卡在循环中](/posts/ai-agent-loop/)。

## 数据如何从应用进入看板

1. **插桩。** 在模型调用、工具、状态切换等边界创建跨度和事件。
2. **采集。** 记录耗时、结果和允许采集的输入输出。
3. **存储与关联。** 用追踪 ID、跨度 ID 和父跨度 ID 串起各步骤。
4. **可视化。** 在看板上查询任务、查看时间线和跨度树。
5. **告警。** 延迟、错误率或成本超过阈值时通知团队。

```text
AI AGENT  (with instrumentation)
│   records each step
▼
Traces, Spans, and Metrics
│   sent to
▼
OBSERVABILITY PLATFORM
(stores and connects spans into full traces)
│
├───────────────────┐
▼                   ▼
DASHBOARD           ALERTS
(see every step)    (notify us on high
                     cost, errors, slowness)
```

原文举例包括 OpenTelemetry、Langfuse、Arize Phoenix、AgentOps 和由[LangChain](/posts/how-does-langchain-work/)团队提供的 LangSmith。可以先用框架自带的插桩，覆盖不到的应用边界再手动添加。

## 可观测性与评估

可观测性说明一次运行做了什么，[评估](/posts/ai-agent-evaluation/)检查这些行为和结果是否达到标准。评估发现某类回答表现差时，可沿追踪定位出错步骤。追踪暴露频繁失败的分支时，也可以据此补充评估用例。

## 生产中的难点与实践

完整记录提示词和结果会增加存储开销，也可能包含密钥、个人信息或业务数据。采集前做脱敏，设置保留时间和访问控制，对高流量进行采样。跨服务、跨模型或跨[子智能体](/posts/ai-subagents/)时，确保追踪标识一路传递。统一跨度命名和字段，将故障及高风险任务纳入看板和告警。

## 常见问题

- **日志、指标和追踪哪一种最重要？** 指标适合发现异常，日志描述事件，追踪还原一项任务的执行顺序。排查多步任务时，追踪能把前两者连起来。
- **会话与追踪有何区别？** 会话覆盖一次持续的对话，可包含多个请求，每个请求都可以有一条追踪。
- **什么时候接入？** 原文建议尽早为关键边界加插桩，先覆盖模型和工具，再逐步完善。
- **可以保存完整提示词吗？** 应先处理敏感内容，并设置访问与保留规则。
