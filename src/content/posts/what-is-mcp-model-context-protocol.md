---
title: "什么是 MCP（模型上下文协议）？"
description: "用 GitHub 工单和天气查询解释 MCP 的主机、客户端、服务端、消息传输及安全边界。"
publishedAt: "2026-11-09"
readingOrder: 50
originalPublishedAt: "2026-07-28"
tags: ["AI", "MCP", "AI 智能体", "转载", "翻译"]
kind: "reprint"
author: "Amit Shekhar"
translator: "Codex"
sourceName: "Outcome School（英文原文）"
sourceUrl: "https://outcomeschool.com/blog/what-is-mcp-model-context-protocol"
draft: false
---

![Outcome School 原文封面](/images/posts/what-is-mcp-model-context-protocol.png)

MCP（Model Context Protocol，模型上下文协议）规定 AI 应用怎样接入外部工具和数据。Anthropic 在 2024 年 11 月开放了这项标准。应用实现一次协议接口，就可以接入遵守该协议的多种服务。

## MCP 解决什么问题

假设 5 个应用都要接入 GitHub、数据库等 10 个系统。分别写集成需要维护 `5 × 10 = 50` 条连接。使用共同协议后，5 个应用各实现一套客户端能力，10 个系统各提供一个服务端，理想化的工作量变成 `5 + 10 = 15` 个实现。原文用 USB-C 打比方，共同接口减少了重复适配。

名称中的模型是理解请求和生成回答的组件。上下文包括模型需要的文件、数据和工具。协议是双方遵守的消息约定。MCP 服务端可以调用原有 API。它还提供可发现的工具定义，客户端可列出工具名称、用途和参数。

## 主机、客户端和服务端

- **主机（Host）** 是用户直接操作的 AI 应用，例如 [Claude Code](https://outcomeschool.com/blog/how-does-claude-code-work) 或 [Cursor](https://outcomeschool.com/blog/how-does-cursor-work)。它管理会话、连接和权限。
- **客户端（Client）** 位于主机内部，每个客户端维护到一个服务端的会话。
- **服务端（Server）** 暴露特定系统的工具、资源等能力，例如读取仓库问题或查询数据库。

```text
                 HOST (the AI application we use)
                 holds the AI model
                        |
        +---------------+---------------+
        |               |               |
     Client 1        Client 2        Client 3
        |               |               |
     Server          Server          Server
    (GitHub)        (Database)       (Files)
```

## 用 MCP 查 GitHub 工单

用户要求查看并汇总 GitHub 上尚未关闭的工单。主机先建立到 GitHub MCP 服务端的连接。客户端与服务端交换协议版本和能力，再读取工具列表，例如 `list_issues`、`create_issue` 和 `add_comment`。主机把适用的定义连同问题交给模型。

模型选中 `list_issues`。客户端把经主机批准的调用请求发给服务端，由后者访问 GitHub。工具结果原路返回，模型再根据真实的工单内容写摘要。

本地服务端通常通过标准输入输出（stdio）与客户端通信。远程服务端可通过 Streamable HTTP 接入。两种传输均使用 JSON-RPC 消息。使用本地 stdio 只表示客户端和服务端之间经由本机管道通信，工具本身仍可能访问网络。

## 天气工具的定义与调用

下面的简化定义包含工具名、用途和 `inputSchema`。这里要求调用者提供城市名。

```json
{
  "name": "get_weather",
  "description": "Get the current weather for a city",
  "inputSchema": {
    "type": "object",
    "properties": {
      "city": { "type": "string", "description": "The city name" }
    },
    "required": ["city"]
  }
}
```

用户问德里的天气时，模型会形成类似下面的请求。客户端把请求交给服务端执行，实际的 MCP 调用再按协议封装。

```json
{
  "name": "get_weather",
  "arguments": { "city": "Delhi" }
}
```

识别工具并生成参数属于[函数调用](/posts/how-does-function-calling-work-in-llms/)。MCP 负责让应用发现和连接这些能力。[AI 智能体](/posts/ai-agent/)可以通过同一机制访问仓库、团队消息或业务数据，再用新信息完成任务。

## 安全边界

服务端返回的工单、邮件或网页可能含有[提示词注入](/posts/prompt-injection-in-llms/)。这些内容是供模型处理的数据，调用侧仍需按用户授予的权限审核动作。安装本地服务端相当于运行第三方程序，要核对来源和权限。主机决定有哪些服务可连接、哪些请求可执行，以及哪些敏感动作需要用户批准。
