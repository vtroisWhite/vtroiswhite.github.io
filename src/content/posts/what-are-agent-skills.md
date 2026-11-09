---
title: "什么是智能体技能？"
description: "用周报技能演示 SKILL.md、描述匹配、渐进式加载、可选脚本和与 MCP 的分工。"
publishedAt: "2026-11-09"
readingOrder: 51
originalPublishedAt: "2026-07-30"
tags: ["AI", "AI 智能体", "Agent Skills", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/what-are-agent-skills"
draft: false
---

![Outcome School 原文封面](/images/posts/what-are-agent-skills.png)

智能体技能（Agent Skill）是包含说明的文件夹，还可以附带脚本、模板或参考资料。[AI 智能体](/posts/ai-agent/)在任务需要时加载相关技能。Anthropic 于 2025 年 10 月推出了这种开放格式。

## 为什么要用技能

团队知道周报该怎么写、上线前要检查哪些内容、品牌有哪些用词约束，通用智能体却不能凭空知道。每次在对话中重写八条规则成本很高。把所有流程一次性放进模型输入又会占用有限的[上下文窗口](https://outcomeschool.com/blog/context-window)。技能像团队手册中的章节，需要哪一章就打开哪一章。这也是[上下文工程](/posts/context-engineering/)的一种做法。

## 技能目录里有什么

每个技能包含一个 `SKILL.md`。文件顶部的 YAML 元数据提供 `name` 和 `description`，其下是步骤与规则。名称使用小写单词和连字符，例如 `weekly-report`。描述要明确指出这个技能会做什么、何时适用。

```markdown
---
name: weekly-report
description: Creates the weekly team report in our company format. Use this whenever the user asks for a weekly report or a team update.
---

# Weekly report

Follow these steps.

First, collect all the tasks finished in the last seven days.
Then, group them under three headings: Shipped, In Progress, and Blocked.
After that, write one short line for each task. Never write more than one line.
Finally, put the total count at the top.

Never include internal ticket numbers in the final report.
```

“周报助手”这样笼统的描述只说了一个名字。明确写出“按团队格式生成周报，用户要求周报或团队进展更新时使用”，智能体就更容易从请求中判断何时加载。

## 渐进式披露

1. **发现**。会话开始时读取各技能名称和描述。它们类似手册的目录。
2. **激活**。用户请求匹配到某项技能时，再读取该 `SKILL.md` 的正文。
3. **补充**。正文指向模板、脚本或参考资料时，按当前步骤需要读取或执行。

原文举例，假设一个技能的元数据约占 100 个词元，50 个技能的元数据约占 5000 个词元，相当于一个较长技能的正文。实际用量随内容和客户端而变，分层加载的价值在于控制每次进入模型的信息量。

## 脚本与目录

需要判断的工作可以写成自然语言步骤。需要准确重复执行的操作可以放进脚本，比如把导出的任务统一整理成表格。技能正文说明何时调用脚本、如何提供输入和检查输出，避免智能体每次临时生成不同实现。

在 [Claude Code](https://outcomeschool.com/blog/how-does-claude-code-work) 的例子中，`~/.claude/skills/` 用于个人技能，项目的 `.claude/skills/` 用于随仓库共享的技能。创建周报技能时，在项目技能目录下建 `weekly-report` 文件夹，放入 `SKILL.md`，写上名称、匹配描述和周报规则。

```text
   our-project/
     .claude/
       skills/
         weekly-report/
           SKILL.md
```

用户说“准备本周团队进展”时，智能体用这句请求匹配技能描述，再加载完整正文。它随后收集工作事项，按已交付、进行中和受阻分组，每项写一行，总数放在开头，并省略内部工单号。用户只需提出任务，格式由技能提供。

## 与 MCP 的分工

| 方面 | 智能体技能 | MCP |
| --- | --- | --- |
| 提供什么 | 流程、格式和团队工作方法 | 到外部工具与数据的标准连接 |
| 主要载体 | 说明目录，可带脚本 | 暴露能力的服务端 |
| 用法 | 规定如何整理周报 | 提供查询工单或项目数据的工具 |

[模型上下文协议](/posts/what-is-mcp-model-context-protocol/)可以让智能体读取问题跟踪系统，技能告诉它如何组织报告。[开放知识格式（OKF）](/posts/what-is-okf-open-knowledge-format/)则可以通过 Markdown 记录表、字段和数据本身的含义。

技能可随项目共享，也可以在一次任务中组合使用。每个技能宜聚焦一项工作，描述写清触发条件，正文只放团队特有的规则。技能可能附带可执行脚本，采用第三方技能之前应阅读相关说明与脚本。
