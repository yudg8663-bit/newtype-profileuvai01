import { describe, test, expect, beforeEach } from "bun:test"
import {
  parseArtifacts,
  addArtifact,
  buildContextSummary,
  getContext,
  clearContext,
  hasArtifacts,
  getAllSources,
  getAllFindings,
  getArtifactDetails,
} from "./shared-context"

describe("shared-context", () => {
  beforeEach(() => {
    clearContext("test-session")
  })

  describe("parseArtifacts", () => {
    test("parses valid ARTIFACTS block with sources", () => {
      // #given
      const output = `Some analysis text...

**ARTIFACTS:**
\`\`\`json
{
  "sources": [
    {"title": "OpenAI Blog", "type": "official", "credibility": "high"},
    {"title": "Tech News", "type": "news", "credibility": "medium"}
  ],
  "findings": [
    {"claim": "GPT-4 released in 2023", "confidence": 0.95, "sourceRefs": ["OpenAI Blog"]}
  ]
}
\`\`\`

More text after...`

      // #when
      const result = parseArtifacts(output, "researcher", "Research AI trends")

      // #then
      expect(result).not.toBeNull()
      expect(result!.agentType).toBe("researcher")
      expect(result!.sources).toHaveLength(2)
      expect(result!.sources![0].title).toBe("OpenAI Blog")
      expect(result!.findings).toHaveLength(1)
      expect(result!.findings![0].claim).toBe("GPT-4 released in 2023")
    })

    test("returns null when no ARTIFACTS block", () => {
      // #given
      const output = "Just regular output without artifacts"

      // #when
      const result = parseArtifacts(output, "researcher", "Some task")

      // #then
      expect(result).toBeNull()
    })

    test("returns null for invalid JSON", () => {
      // #given
      const output = `**ARTIFACTS:**
\`\`\`json
{invalid json}
\`\`\``

      // #when
      const result = parseArtifacts(output, "researcher", "Some task")

      // #then
      expect(result).toBeNull()
    })

    test("parses writer content artifact", () => {
      // #given
      const output = `**ARTIFACTS:**
\`\`\`json
{
  "content": "# Draft Article\\n\\nThis is the opening paragraph..."
}
\`\`\``

      // #when
      const result = parseArtifacts(output, "writer", "Write article")

      // #then
      expect(result).not.toBeNull()
      expect(result!.content).toContain("Draft Article")
    })

    test("parses fact-checker issues", () => {
      // #given
      const output = `**ARTIFACTS:**
\`\`\`json
{
  "issues": [
    {"type": "factual", "severity": "critical", "description": "Date is incorrect"},
    {"type": "source", "severity": "major", "description": "Source not found"}
  ]
}
\`\`\``

      // #when
      const result = parseArtifacts(output, "fact-checker", "Verify claims")

      // #then
      expect(result).not.toBeNull()
      expect(result!.issues).toHaveLength(2)
      expect(result!.issues![0].severity).toBe("critical")
    })
  })

  describe("addArtifact", () => {
    test("adds artifact and generates sequential ID", () => {
      // #given
      const artifact1 = { agentType: "researcher" as const, taskDescription: "Task 1" }
      const artifact2 = { agentType: "researcher" as const, taskDescription: "Task 2" }

      // #when
      const id1 = addArtifact("test-session", artifact1)
      const id2 = addArtifact("test-session", artifact2)

      // #then
      expect(id1).toBe("researcher_000")
      expect(id2).toBe("researcher_001")
    })

    test("context is created on first artifact", () => {
      // #given
      expect(getContext("new-session")).toBeUndefined()

      // #when
      addArtifact("new-session", { agentType: "writer" as const, taskDescription: "Write" })

      // #then
      const ctx = getContext("new-session")
      expect(ctx).not.toBeUndefined()
      expect(ctx!.artifacts).toHaveLength(1)
      
      clearContext("new-session")
    })
  })

  describe("buildContextSummary", () => {
    test("returns null for empty context", () => {
      // #given - empty session

      // #when
      const summary = buildContextSummary("test-session")

      // #then
      expect(summary).toBeNull()
    })

    test("builds summary with sources and findings", () => {
      // #given
      addArtifact("test-session", {
        agentType: "researcher",
        taskDescription: "Research topic X",
        sources: [
          { title: "Source A", type: "official", credibility: "high" },
          { title: "Source B", type: "news", credibility: "medium" },
        ],
        findings: [
          { claim: "Finding 1", confidence: 0.9, sourceRefs: ["Source A"] },
        ],
      })

      // #when
      const summary = buildContextSummary("test-session")

      // #then
      expect(summary).not.toBeNull()
      expect(summary).toContain("<shared-context>")
      expect(summary).toContain("</shared-context>")
      expect(summary).toContain("Researcher")
      expect(summary).toContain("Research topic X")
      expect(summary).toContain("2 sources")
      expect(summary).toContain("Source A")
      expect(summary).toContain("1 key findings")
    })

    test("groups multiple artifacts by agent type", () => {
      // #given
      addArtifact("test-session", { agentType: "researcher", taskDescription: "Task 1" })
      addArtifact("test-session", { agentType: "researcher", taskDescription: "Task 2" })
      addArtifact("test-session", { agentType: "writer", taskDescription: "Write draft" })

      // #when
      const summary = buildContextSummary("test-session")

      // #then
      expect(summary).toContain("Researcher (2 tasks)")
      expect(summary).toContain("Writer (1 task)")
    })

    test("includes issues summary for fact-checker", () => {
      // #given
      addArtifact("test-session", {
        agentType: "fact-checker",
        taskDescription: "Verify article",
        issues: [
          { type: "factual", severity: "critical", description: "Wrong date" },
          { type: "source", severity: "major", description: "Missing citation" },
          { type: "clarity", severity: "minor", description: "Unclear wording" },
        ],
      })

      // #when
      const summary = buildContextSummary("test-session")

      // #then
      expect(summary).toContain("3 issues")
      expect(summary).toContain("1 critical")
      expect(summary).toContain("1 major")
    })

    test("includes content preview for writer", () => {
      // #given
      addArtifact("test-session", {
        agentType: "writer",
        taskDescription: "Draft intro",
        content: "This is the beginning of a very long article that goes on and on...",
      })

      // #when
      const summary = buildContextSummary("test-session")

      // #then
      expect(summary).toContain("Draft:")
      expect(summary).toContain("beginning of a very long")
    })
  })

  describe("hasArtifacts", () => {
    test("returns true when ARTIFACTS block present", () => {
      expect(hasArtifacts("**ARTIFACTS:**\n```json\n{}```")).toBe(true)
      expect(hasArtifacts("Some text **ARTIFACTS:** more")).toBe(true)
    })

    test("returns false when no ARTIFACTS block", () => {
      expect(hasArtifacts("Regular output")).toBe(false)
      expect(hasArtifacts("ARTIFACTS without markers")).toBe(false)
    })
  })

  describe("getAllSources", () => {
    test("collects sources from all artifacts", () => {
      // #given
      addArtifact("test-session", {
        agentType: "researcher",
        taskDescription: "Task 1",
        sources: [{ title: "Source 1", type: "official" }],
      })
      addArtifact("test-session", {
        agentType: "fact-checker",
        taskDescription: "Task 2",
        sources: [{ title: "Source 2", type: "academic" }],
      })

      // #when
      const sources = getAllSources("test-session")

      // #then
      expect(sources).toHaveLength(2)
      expect(sources.map(s => s.title)).toEqual(["Source 1", "Source 2"])
    })
  })

  describe("getAllFindings", () => {
    test("collects findings from all artifacts", () => {
      // #given
      addArtifact("test-session", {
        agentType: "researcher",
        taskDescription: "Task 1",
        findings: [{ claim: "Claim 1", confidence: 0.8, sourceRefs: [] }],
      })
      addArtifact("test-session", {
        agentType: "archivist",
        taskDescription: "Task 2",
        findings: [{ claim: "Claim 2", confidence: 0.9, sourceRefs: [] }],
      })

      // #when
      const findings = getAllFindings("test-session")

      // #then
      expect(findings).toHaveLength(2)
      expect(findings.map(f => f.claim)).toEqual(["Claim 1", "Claim 2"])
    })
  })

  describe("getArtifactDetails", () => {
    test("returns specific artifacts by ID", () => {
      // #given
      addArtifact("test-session", { agentType: "researcher", taskDescription: "Task 1" })
      addArtifact("test-session", { agentType: "researcher", taskDescription: "Task 2" })
      addArtifact("test-session", { agentType: "writer", taskDescription: "Task 3" })

      // #when - IDs are sequential: researcher_000, researcher_001, writer_002
      const details = getArtifactDetails("test-session", ["researcher_000", "writer_002"])

      // #then
      expect(details).toHaveLength(2)
      expect(details[0].taskDescription).toBe("Task 1")
      expect(details[1].taskDescription).toBe("Task 3")
    })
  })
})
