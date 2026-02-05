import { describe, test, expect } from "bun:test"
import {
  prepareMessagesForSummary,
  formatTranscriptForLLM,
  generateSummaryPrompt,
  parseLLMSummary,
  extractSessionSummaryFallback,
} from "./extractor"

describe("prepareMessagesForSummary", () => {
  test("filters out system instruction messages", () => {
    // #given
    const messages = [
      {
        info: { role: "user", id: "1" },
        parts: [{ type: "text", text: "[search-mode]\nMAXIMIZE SEARCH EFFORT..." }],
      },
      {
        info: { role: "assistant", id: "2" },
        parts: [{ type: "text", text: "I found some results..." }],
      },
      {
        info: { role: "user", id: "3" },
        parts: [{ type: "text", text: "What do you think about AI?" }],
      },
    ]

    // #when
    const result = prepareMessagesForSummary(messages)

    // #then
    expect(result).toHaveLength(2)
    expect(result[0].text).toBe("I found some results...")
    expect(result[1].text).toBe("What do you think about AI?")
  })

  test("filters out analyze-mode messages", () => {
    // #given
    const messages = [
      {
        info: { role: "user", id: "1" },
        parts: [{ type: "text", text: "[analyze-mode]\nANALYSIS MODE. Delegate..." }],
      },
      {
        info: { role: "user", id: "2" },
        parts: [{ type: "text", text: "这个功能的价值是什么？" }],
      },
    ]

    // #when
    const result = prepareMessagesForSummary(messages)

    // #then
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe("这个功能的价值是什么？")
  })

  test("keeps normal user messages", () => {
    // #given
    const messages = [
      {
        info: { role: "user", id: "1" },
        parts: [{ type: "text", text: "黄仁勋的观点有什么问题？" }],
      },
      {
        info: { role: "assistant", id: "2" },
        parts: [{ type: "text", text: "黄仁勋的观点有一半是对的..." }],
      },
    ]

    // #when
    const result = prepareMessagesForSummary(messages)

    // #then
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe("user")
    expect(result[1].role).toBe("assistant")
  })

  test("filters out empty messages", () => {
    // #given
    const messages = [
      {
        info: { role: "user", id: "1" },
        parts: [{ type: "text", text: "" }],
      },
      {
        info: { role: "user", id: "2" },
        parts: [{ type: "text", text: "   " }],
      },
      {
        info: { role: "user", id: "3" },
        parts: [{ type: "text", text: "Real message" }],
      },
    ]

    // #when
    const result = prepareMessagesForSummary(messages)

    // #then
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe("Real message")
  })
})

describe("formatTranscriptForLLM", () => {
  test("formats messages with role headers", () => {
    // #given
    const messages = [
      { role: "user", text: "Hello" },
      { role: "assistant", text: "Hi there" },
    ]

    // #when
    const result = formatTranscriptForLLM(messages)

    // #then
    expect(result).toContain("## USER")
    expect(result).toContain("Hello")
    expect(result).toContain("## ASSISTANT")
    expect(result).toContain("Hi there")
  })
})

describe("generateSummaryPrompt", () => {
  test("includes transcript in prompt", () => {
    // #given
    const transcript = "## USER\nTest message"

    // #when
    const result = generateSummaryPrompt(transcript)

    // #then
    expect(result).toContain("Test message")
    expect(result).toContain("**Topic:**")
    expect(result).toContain("**Key Points:**")
  })
})

describe("parseLLMSummary", () => {
  test("parses valid LLM output", () => {
    // #given
    const llmOutput = `**Topic:** 讨论了 AI 对就业市场的影响

**Key Points:**
- AI 周期与互联网周期的就业对比是对的
- 技术能力正在商品化
- 需要关注人类独特价值

**Decisions:**
- 决定深入研究这个话题

**Tags:**
- #ai
- #career`

    // #when
    const result = parseLLMSummary("ses_123", llmOutput)

    // #then
    expect(result).not.toBeNull()
    expect(result!.keyPoints).toHaveLength(3)
    expect(result!.keyPoints[0]).toContain("AI 周期")
    expect(result!.decisions).toHaveLength(1)
    expect(result!.tags).toContain("#ai")
    expect(result!.tags).toContain("#career")
  })

  test("returns null for NO_VALUABLE_CONTENT", () => {
    // #given
    const llmOutput = "NO_VALUABLE_CONTENT"

    // #when
    const result = parseLLMSummary("ses_123", llmOutput)

    // #then
    expect(result).toBeNull()
  })

  test("returns null for empty output", () => {
    // #when
    const result = parseLLMSummary("ses_123", "")

    // #then
    expect(result).toBeNull()
  })
})

describe("extractSessionSummaryFallback", () => {
  test("extracts basic summary from messages", () => {
    // #given
    const messages = [
      {
        info: { role: "user", id: "1" },
        parts: [{ type: "text", text: "这是一个测试问题" }],
      },
      {
        info: { role: "assistant", id: "2" },
        parts: [{ type: "text", text: "这是一个测试回答" }],
      },
    ]

    // #when
    const result = extractSessionSummaryFallback("ses_123", messages)

    // #then
    expect(result.sessionID).toBe("ses_123")
    expect(result.summary).toContain("这是一个测试问题")
    expect(result.keyPoints.length).toBeGreaterThan(0)
  })

  test("filters system instructions in fallback", () => {
    // #given
    const messages = [
      {
        info: { role: "user", id: "1" },
        parts: [{ type: "text", text: "[search-mode] MAXIMIZE SEARCH..." }],
      },
      {
        info: { role: "user", id: "2" },
        parts: [{ type: "text", text: "实际的用户问题" }],
      },
      {
        info: { role: "assistant", id: "3" },
        parts: [{ type: "text", text: "这是回答" }],
      },
    ]

    // #when
    const result = extractSessionSummaryFallback("ses_123", messages)

    // #then
    expect(result.summary).not.toContain("[search-mode]")
    expect(result.summary).toContain("实际的用户问题")
  })

  test("extracts tags from content", () => {
    // #given
    const messages = [
      {
        info: { role: "user", id: "1" },
        parts: [{ type: "text", text: "讨论 #ai 和 #career 话题" }],
      },
    ]

    // #when
    const result = extractSessionSummaryFallback("ses_123", messages)

    // #then
    expect(result.tags).toContain("#ai")
    expect(result.tags).toContain("#career")
  })
})
