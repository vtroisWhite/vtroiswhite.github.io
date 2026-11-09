---
title: "什么是 OKF（开放知识格式）？"
description: "通过订单统计示例介绍 OKF 知识包、YAML 元数据、概念链接及其与 MCP 和智能体技能的分工。"
publishedAt: "2026-11-09"
readingOrder: 40
originalPublishedAt: "2026-07-26"
tags: ["AI", "AI 智能体", "数据工程", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/what-is-okf-open-knowledge-format"
draft: false
---

![Outcome School 原文封面](/images/posts/what-is-okf-open-knowledge-format.png)

OKF（Open Knowledge Format，开放知识格式）用一组普通 Markdown 文件记录组织对数据和系统的理解，让人、工具和[智能体](/posts/ai-agent/)能按同一格式阅读。原文介绍的是 Google Cloud Data Cloud 团队于 2026 年 6 月 13 日发布的 0.1 版。

## 为什么列出表和字段还不够

假设新人要从 `orders` 表计算上周的销售量。表有状态、金额和国家等字段，但正确统计还需要知道哪些是测试订单、怎样识别退款、哪些国家存在重复记录以及哪段历史数据不可用。假如这些规则分散在维基、代码注释、表格和同事的经验里，智能体只看到字段名，就只能猜测口径。

[上下文工程](/posts/context-engineering/)关心怎样把正确的背景带给智能体。OKF 将概念含义、计算口径、数据来源和限制写成可共享的资料，实际订单仍保存在数据系统中。

## 知识包怎样组织

一组 OKF 文件叫知识包（bundle）。原则是一个概念一个文件，例如分别记录订单表、客户表和周活跃用户指标。文件路径就是概念的标识。可选的 `index.md` 概括目录内容，`log.md` 可记录带日期的变化。

```text
   sales/
   ├── index.md
   ├── datasets/
   │   ├── index.md
   │   └── orders_db.md
   ├── tables/
   │   ├── index.md
   │   ├── orders.md
   │   └── customers.md
   └── metrics/
       ├── index.md
       └── weekly_active_users.md
```

普通 Markdown 便于人直接阅读，也能和代码一起版本管理。智能体按需打开相同的文件，知识可以随着项目迁移或分发。

## YAML 元数据和正文

文件顶部是 YAML 元数据，下方是 Markdown 正文。原文中的订单表示例为：

```yaml
---
type: BigQuery Table
title: Orders
description: One row per order. Only completed ones count as a sale.
resource: https://console.cloud.google.com/bigquery?p=acme&d=sales&t=orders
tags: [sales, revenue]
timestamp: 2026-05-28T14:30:00Z
---
```

其中 `type` 是唯一必填字段，可以用 BigQuery Table、Dataset、Metric、API 或 Runbook 等值。`title` 是便于阅读的名称，`description` 是简述，`resource` 指向真实资源，`tags` 用于分组，`timestamp` 记录信息对应的时间。正文可以继续说明每天何时导入订单、取消订单如何处理，以及数据何时可能缺失。

## 链接把文件连成图

在订单表的正文里，可以用普通 Markdown 链接从客户编号跳到客户表的定义。按同样的方式，指标文档可以连到订单表，订单表可以连到数据集。智能体从当前概念沿链接继续了解所需信息。

```text
| `customer_id` | STRING | FK to [customers](/tables/customers.md). |
```

## 怎样使用这份知识

用户问上周有多少销售。智能体先从索引找到 `tables/orders.md`，读取“一行是一笔订单，只有已完成的订单才计为销售”的口径。涉及客户时，再打开客户表说明。它还可以顺着 `resource` 定位实际的 BigQuery 表，最后通过已接入的查询工具计算。这样，统计依据来自可追溯的说明和实际数据。

原文还介绍了随规范发布的两种工具：补充知识的智能体可以浏览现有数据、生成 OKF 草稿供人校对。可视化工具把知识包转成展示概念和链接的网页。

## OKF、MCP 和智能体技能

| 组件 | 提供什么 | 销售报告中的用途 |
| --- | --- | --- |
| OKF | 数据和系统的含义、定义与关系 | 记录哪些订单计入销售 |
| [MCP](/posts/what-is-mcp-model-context-protocol/) | 到外部工具或数据的连接 | 执行数据库查询 |
| [智能体技能](/posts/what-are-agent-skills/) | 团队的工作步骤、格式与检查要求 | 按规定格式写报告 |

[Claude Code](https://outcomeschool.com/blog/how-does-claude-code-work)读取项目里的技能说明，体现了类似的按需加载方式。OKF 将团队已有的知识笔记整理为一致的格式，使不同工具能理解同一套数据和概念。
