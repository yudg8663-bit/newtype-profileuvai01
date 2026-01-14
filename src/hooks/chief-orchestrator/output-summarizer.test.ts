import { describe, test, expect } from "bun:test"
import {
  extractSessionId,
  extractAgent,
  extractDuration,
  extractMainContent,
  smartTruncate,
  summarizeOutput,
  formatSummarizedOutput,
} from "./output-summarizer"

describe("output-summarizer", () => {
  describe("extractSessionId", () => {
    test("extracts session ID from standard output", () => {
      // #given
      const output = `Task completed in 12s.

Agent: researcher
Session ID: ses_abc123def

---

Some content here`
      // #when
      const result = extractSessionId(output)
      // #then
      expect(result).toBe("ses_abc123def")
    })

    test("returns empty string when no session ID found", () => {
      // #given
      const output = "No session info here"
      // #when
      const result = extractSessionId(output)
      // #then
      expect(result).toBe("")
    })
  })

  describe("extractAgent", () => {
    test("extracts agent name without category", () => {
      // #given
      const output = "Agent: researcher\nSession ID: ses_123"
      // #when
      const result = extractAgent(output)
      // #then
      expect(result).toBe("researcher")
    })

    test("extracts category when present", () => {
      // #given
      const output = "Agent: deputy (category: research)\nSession ID: ses_123"
      // #when
      const result = extractAgent(output)
      // #then
      expect(result).toBe("research")
    })

    test("returns unknown when no agent found", () => {
      // #given
      const output = "No agent info"
      // #when
      const result = extractAgent(output)
      // #then
      expect(result).toBe("unknown")
    })
  })

  describe("extractDuration", () => {
    test("extracts duration with seconds", () => {
      // #given
      const output = "Task completed in 12s."
      // #when
      const result = extractDuration(output)
      // #then
      expect(result).toBe("12s")
    })

    test("extracts duration with minutes and seconds", () => {
      // #given
      const output = "Task completed in 2m 30s."
      // #when
      const result = extractDuration(output)
      // #then
      expect(result).toBe("2m 30s")
    })

    test("returns empty string when no duration found", () => {
      // #given
      const output = "No duration here"
      // #when
      const result = extractDuration(output)
      // #then
      expect(result).toBe("")
    })
  })

  describe("extractMainContent", () => {
    test("extracts content after separator", () => {
      // #given
      const output = `Task completed in 12s.

Agent: researcher
Session ID: ses_123

---

This is the main content.
With multiple lines.`
      // #when
      const result = extractMainContent(output)
      // #then
      expect(result).toBe("This is the main content.\nWith multiple lines.")
    })

    test("returns full output when no separator", () => {
      // #given
      const output = "Just some content without separator"
      // #when
      const result = extractMainContent(output)
      // #then
      expect(result).toBe("Just some content without separator")
    })
  })

  describe("smartTruncate", () => {
    test("returns original text when under limit", () => {
      // #given
      const text = "Short text"
      // #when
      const result = smartTruncate(text, 100)
      // #then
      expect(result.text).toBe("Short text")
      expect(result.wasTruncated).toBe(false)
    })

    test("truncates at paragraph boundary", () => {
      // #given
      const text = "First paragraph.\n\nSecond paragraph that is much longer and should be cut off."
      // #when
      const result = smartTruncate(text, 30)
      // #then
      expect(result.text).toContain("First paragraph.")
      expect(result.wasTruncated).toBe(true)
      expect(result.text).toContain("[... output truncated")
    })

    test("truncates at sentence boundary when no paragraph break", () => {
      // #given
      const text = "First sentence. Second sentence that is much longer and should be cut off here definitely."
      // #when
      const result = smartTruncate(text, 50)
      // #then
      expect(result.text).toContain("First sentence.")
      expect(result.wasTruncated).toBe(true)
    })
  })

  describe("summarizeOutput", () => {
    test("summarizes standard chief_task output", () => {
      // #given
      const output = `Task completed in 15s.

Agent: deputy (category: research)
Session ID: ses_xyz789

---

## Research Findings

Here are the key findings from the research task.
Multiple paragraphs of content follow.`
      // #when
      const result = summarizeOutput(output, { category: "research" })
      // #then
      expect(result.sessionId).toBe("ses_xyz789")
      expect(result.agent).toBe("research")
      expect(result.duration).toBe("15s")
      expect(result.summary).toContain("Research Findings")
    })

    test("respects category-based max length", () => {
      // #given
      const longContent = "x".repeat(2000)
      const output = `Task completed in 5s.

Agent: researcher
Session ID: ses_123

---

${longContent}`
      // #when
      const researchResult = summarizeOutput(output, { category: "research" })
      const quickResult = summarizeOutput(output, { category: "quick" })
      // #then
      expect(researchResult.summary.length).toBeGreaterThan(quickResult.summary.length)
    })
  })

  describe("formatSummarizedOutput", () => {
    test("formats summarized output correctly", () => {
      // #given
      const result = {
        summary: "This is the summary content",
        sessionId: "ses_abc123",
        agent: "researcher",
        duration: "12s",
        wasTruncated: false,
        originalLength: 100,
      }
      // #when
      const formatted = formatSummarizedOutput(result)
      // #then
      expect(formatted).toContain("## Subagent Result: researcher")
      expect(formatted).toContain("**Duration:** 12s")
      expect(formatted).toContain("`ses_abc123`")
      expect(formatted).toContain("This is the summary content")
      expect(formatted).not.toContain("truncated")
    })

    test("includes truncation notice when output was truncated", () => {
      // #given
      const result = {
        summary: "Truncated content...",
        sessionId: "ses_abc123",
        agent: "writer",
        duration: "30s",
        wasTruncated: true,
        originalLength: 5000,
      }
      // #when
      const formatted = formatSummarizedOutput(result)
      // #then
      expect(formatted).toContain("truncated")
      expect(formatted).toContain("5000")
    })
  })
})
