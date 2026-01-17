import { describe, test, expect, beforeEach } from "bun:test"
import {
  extractConfidence,
  getRecommendation,
  buildConfidenceDirective,
  analyzeFactCheckOutput,
  analyzeAgentOutput,
  isFactCheckOutput,
  hasConfidenceScore,
  detectAgentType,
  getRewriteAttempts,
  incrementRewriteAttempts,
  clearRewriteAttempts,
  buildEscalateDirective,
  setConfidenceConfig,
  getConfidenceConfig,
} from "./confidence-router"

describe("extractConfidence", () => {
  test("should extract valid confidence score", () => {
    // #given
    const output = "Some analysis...\n---\n**CONFIDENCE: 0.85**"
    // #when
    const result = extractConfidence(output)
    // #then
    expect(result).toBe(0.85)
  })

  test("should handle confidence without decimal", () => {
    // #given
    const output = "**CONFIDENCE: 1**"
    // #when
    const result = extractConfidence(output)
    // #then
    expect(result).toBe(1)
  })

  test("should handle confidence with spaces", () => {
    // #given
    const output = "**CONFIDENCE:  0.72**"
    // #when
    const result = extractConfidence(output)
    // #then
    expect(result).toBe(0.72)
  })

  test("should be case insensitive", () => {
    // #given
    const output = "**confidence: 0.65**"
    // #when
    const result = extractConfidence(output)
    // #then
    expect(result).toBe(0.65)
  })

  test("should return null for missing confidence", () => {
    // #given
    const output = "No confidence score here"
    // #when
    const result = extractConfidence(output)
    // #then
    expect(result).toBeNull()
  })

  test("should return null for out-of-range values", () => {
    // #given
    const output1 = "**CONFIDENCE: 1.5**"
    const output2 = "**CONFIDENCE: -0.5**"
    // #when
    const result1 = extractConfidence(output1)
    const result2 = extractConfidence(output2)
    // #then
    expect(result1).toBeNull()
    expect(result2).toBeNull()
  })

  test("should return null for malformed patterns", () => {
    // #given
    const output = "CONFIDENCE: 0.8" // missing asterisks
    // #when
    const result = extractConfidence(output)
    // #then
    expect(result).toBeNull()
  })
})

describe("getRecommendation", () => {
  test("should return 'pass' for confidence >= 0.8", () => {
    expect(getRecommendation(0.8)).toBe("pass")
    expect(getRecommendation(0.95)).toBe("pass")
    expect(getRecommendation(1.0)).toBe("pass")
  })

  test("should return 'polish' for confidence 0.5-0.79", () => {
    expect(getRecommendation(0.5)).toBe("polish")
    expect(getRecommendation(0.65)).toBe("polish")
    expect(getRecommendation(0.79)).toBe("polish")
  })

  test("should return 'rewrite' for confidence < 0.5", () => {
    expect(getRecommendation(0.49)).toBe("rewrite")
    expect(getRecommendation(0.3)).toBe("rewrite")
    expect(getRecommendation(0)).toBe("rewrite")
  })
})

describe("buildConfidenceDirective", () => {
  test("should build pass directive for high confidence", () => {
    // #given
    const confidence = 0.9
    const sessionId = "ses-123"
    // #when
    const result = buildConfidenceDirective(confidence, sessionId)
    // #then
    expect(result).toContain("[FACT-CHECK PASSED]")
    expect(result).toContain("90%")
    expect(result).toContain("HIGH")
    expect(result).toContain("Ready for delivery")
  })

  test("should build polish directive for medium confidence", () => {
    // #given
    const confidence = 0.65
    const sessionId = "ses-456"
    // #when
    const result = buildConfidenceDirective(confidence, sessionId)
    // #then
    expect(result).toContain("[FACT-CHECK: NEEDS POLISH]")
    expect(result).toContain("65%")
    expect(result).toContain("MEDIUM")
    expect(result).toContain('category="editing"')
    expect(result).toContain(`resume="${sessionId}"`)
  })

  test("should build rewrite directive for low confidence", () => {
    // #given
    const confidence = 0.3
    const sessionId = "ses-789"
    // #when
    const result = buildConfidenceDirective(confidence, sessionId)
    // #then
    expect(result).toContain("[FACT-CHECK: NEEDS REWRITE]")
    expect(result).toContain("30%")
    expect(result).toContain("LOW")
    expect(result).toContain('category="writing"')
  })
})

describe("analyzeFactCheckOutput", () => {
  test("should return full result for valid output", () => {
    // #given
    const output = "Analysis complete.\n---\n**CONFIDENCE: 0.75**"
    const sessionId = "ses-test"
    // #when
    const result = analyzeFactCheckOutput(output, sessionId)
    // #then
    expect(result.confidence).toBe(0.75)
    expect(result.recommendation).toBe("polish")
    expect(result.directive).toContain("[FACT-CHECK: NEEDS POLISH]")
  })

  test("should return nulls for output without confidence", () => {
    // #given
    const output = "Analysis without confidence score"
    const sessionId = "ses-test"
    // #when
    const result = analyzeFactCheckOutput(output, sessionId)
    // #then
    expect(result.confidence).toBeNull()
    expect(result.recommendation).toBeNull()
    expect(result.directive).toBeNull()
  })
})

describe("isFactCheckOutput", () => {
  test("should detect CONFIDENCE marker", () => {
    expect(isFactCheckOutput("**CONFIDENCE: 0.8**")).toBe(true)
  })

  test("should detect fact-check keyword", () => {
    expect(isFactCheckOutput("This is a fact-check report")).toBe(true)
  })

  test("should detect Chinese verification keyword", () => {
    expect(isFactCheckOutput("信息核查结果")).toBe(true)
  })

  test("should detect verification keyword", () => {
    expect(isFactCheckOutput("Source verification complete")).toBe(true)
  })

  test("should return false for unrelated output", () => {
    expect(isFactCheckOutput("Just a regular message")).toBe(false)
  })
})

describe("rewrite attempt tracking", () => {
  beforeEach(() => {
    // #given - clean state for each test
    clearRewriteAttempts("test-session")
    clearRewriteAttempts("other-session")
  })

  test("should start at 0 attempts for any agent", () => {
    // #when
    const attempts = getRewriteAttempts("test-session", "fact-checker")
    // #then
    expect(attempts).toBe(0)
  })

  test("should increment attempts per agent type", () => {
    // #when
    const first = incrementRewriteAttempts("test-session", "fact-checker")
    const second = incrementRewriteAttempts("test-session", "fact-checker")
    // #then
    expect(first).toBe(1)
    expect(second).toBe(2)
  })

  test("should track sessions independently", () => {
    // #when
    incrementRewriteAttempts("test-session", "fact-checker")
    incrementRewriteAttempts("test-session", "fact-checker")
    incrementRewriteAttempts("other-session", "fact-checker")
    // #then
    expect(getRewriteAttempts("test-session", "fact-checker")).toBe(2)
    expect(getRewriteAttempts("other-session", "fact-checker")).toBe(1)
  })

  test("should track agent types independently within same session", () => {
    // #when
    incrementRewriteAttempts("test-session", "fact-checker")
    incrementRewriteAttempts("test-session", "fact-checker")
    incrementRewriteAttempts("test-session", "writer")
    // #then
    expect(getRewriteAttempts("test-session", "fact-checker")).toBe(2)
    expect(getRewriteAttempts("test-session", "writer")).toBe(1)
    expect(getRewriteAttempts("test-session", "researcher")).toBe(0)
  })

  test("should clear all agent attempts for a session", () => {
    // #given
    incrementRewriteAttempts("test-session", "fact-checker")
    incrementRewriteAttempts("test-session", "writer")
    incrementRewriteAttempts("test-session", "researcher")
    // #when
    clearRewriteAttempts("test-session")
    // #then
    expect(getRewriteAttempts("test-session", "fact-checker")).toBe(0)
    expect(getRewriteAttempts("test-session", "writer")).toBe(0)
    expect(getRewriteAttempts("test-session", "researcher")).toBe(0)
  })
})

describe("buildEscalateDirective", () => {
  test("should include escalation message", () => {
    // #given
    const confidence = 0.3
    const attempts = 3
    // #when
    const result = buildEscalateDirective(confidence, attempts)
    // #then
    expect(result).toContain("[FACT-CHECK: ESCALATE TO USER]")
    expect(result).toContain("30%")
    expect(result).toContain("3/2")
    expect(result).toContain("LIMIT REACHED")
    expect(result).toContain("AUTOMATIC REWRITING HAS FAILED")
  })
})

describe("analyzeFactCheckOutput with rewrite limits", () => {
  beforeEach(() => {
    // #given - clean state
    clearRewriteAttempts("ses-limit-test")
  })

  test("should return rewrite on first low confidence", () => {
    // #given
    const output = "**CONFIDENCE: 0.3**"
    // #when
    const result = analyzeFactCheckOutput(output, "ses-limit-test")
    // #then
    expect(result.recommendation).toBe("rewrite")
    expect(result.directive).toContain("Rewrite attempt: 1/2")
  })

  test("should return rewrite on second low confidence", () => {
    // #given
    const output = "**CONFIDENCE: 0.3**"
    analyzeFactCheckOutput(output, "ses-limit-test")
    // #when
    const result = analyzeFactCheckOutput(output, "ses-limit-test")
    // #then
    expect(result.recommendation).toBe("rewrite")
    expect(result.directive).toContain("Rewrite attempt: 2/2")
  })

  test("should escalate on third low confidence", () => {
    // #given
    const output = "**CONFIDENCE: 0.3**"
    analyzeFactCheckOutput(output, "ses-limit-test")
    analyzeFactCheckOutput(output, "ses-limit-test")
    // #when
    const result = analyzeFactCheckOutput(output, "ses-limit-test")
    // #then
    expect(result.recommendation).toBe("escalate")
    expect(result.directive).toContain("[FACT-CHECK: ESCALATE TO USER]")
    expect(result.directive).toContain("3/2")
  })

  test("should not increment counter for pass/polish", () => {
    // #given
    const passOutput = "**CONFIDENCE: 0.9**"
    const polishOutput = "**CONFIDENCE: 0.6**"
    // #when
    analyzeFactCheckOutput(passOutput, "ses-limit-test")
    analyzeFactCheckOutput(polishOutput, "ses-limit-test")
    // #then
    expect(getRewriteAttempts("ses-limit-test", "fact-checker")).toBe(0)
  })
})

describe("multi-agent confidence routing", () => {
  beforeEach(() => {
    // #given - clean state
    clearRewriteAttempts("ses-multi-agent")
  })

  test("should build researcher directive with correct labels", () => {
    // #given
    const confidence = 0.85
    const sessionId = "ses-research"
    // #when
    const result = buildConfidenceDirective(confidence, sessionId, "researcher")
    // #then
    expect(result).toContain("[RESEARCH PASSED]")
    expect(result).toContain("Proceed to writing")
  })

  test("should build writer directive with correct labels", () => {
    // #given
    const confidence = 0.6
    const sessionId = "ses-writer"
    // #when
    const result = buildConfidenceDirective(confidence, sessionId, "writer")
    // #then
    expect(result).toContain("[DRAFT: NEEDS POLISH]")
    expect(result).toContain('category="writing"')
  })

  test("should build editor directive with correct labels", () => {
    // #given
    const confidence = 0.3
    const sessionId = "ses-editor"
    // #when
    const result = buildConfidenceDirective(confidence, sessionId, "editor")
    // #then
    expect(result).toContain("[EDIT: NEEDS REWRITE]")
    expect(result).toContain('category="writing"')
  })

  test("analyzeAgentOutput should include agentType in result", () => {
    // #given
    const output = "Research complete.\\n**CONFIDENCE: 0.85**"
    // #when
    const result = analyzeAgentOutput(output, "ses-multi-agent", "researcher")
    // #then
    expect(result.agentType).toBe("researcher")
    expect(result.recommendation).toBe("pass")
  })

  test("should track rewrite attempts per agent type independently", () => {
    // #given - fact-checker fails twice
    const lowOutput = "**CONFIDENCE: 0.3**"
    analyzeAgentOutput(lowOutput, "ses-multi-agent", "fact-checker")
    analyzeAgentOutput(lowOutput, "ses-multi-agent", "fact-checker")
    
    // #when - writer fails once (should not be affected by fact-checker's count)
    const writerResult = analyzeAgentOutput(lowOutput, "ses-multi-agent", "writer")
    
    // #then - writer should still be on attempt 1, not escalated
    expect(writerResult.recommendation).toBe("rewrite")
    expect(writerResult.directive).toContain("Rewrite attempt: 1/2")
    expect(getRewriteAttempts("ses-multi-agent", "fact-checker")).toBe(2)
    expect(getRewriteAttempts("ses-multi-agent", "writer")).toBe(1)
  })

  test("should escalate each agent independently", () => {
    // #given - fact-checker exhausts retries
    const lowOutput = "**CONFIDENCE: 0.3**"
    analyzeAgentOutput(lowOutput, "ses-multi-agent", "fact-checker")
    analyzeAgentOutput(lowOutput, "ses-multi-agent", "fact-checker")
    const factCheckerResult = analyzeAgentOutput(lowOutput, "ses-multi-agent", "fact-checker")
    
    // #when - researcher fails (should start fresh)
    const researcherResult = analyzeAgentOutput(lowOutput, "ses-multi-agent", "researcher")
    
    // #then
    expect(factCheckerResult.recommendation).toBe("escalate")
    expect(researcherResult.recommendation).toBe("rewrite")
    expect(researcherResult.directive).toContain("Rewrite attempt: 1/2")
  })
})

describe("detectAgentType", () => {
  test("should detect from category parameter", () => {
    expect(detectAgentType("any output", "fact-check")).toBe("fact-checker")
    expect(detectAgentType("any output", "research")).toBe("researcher")
    expect(detectAgentType("any output", "writing")).toBe("writer")
    expect(detectAgentType("any output", "editing")).toBe("editor")
  })

  test("should detect fact-checker from output content", () => {
    expect(detectAgentType("This is a fact-check report")).toBe("fact-checker")
    expect(detectAgentType("Verification complete")).toBe("fact-checker")
    expect(detectAgentType("信息核查结果")).toBe("fact-checker")
  })

  test("should detect researcher from output content", () => {
    expect(detectAgentType("Research findings below")).toBe("researcher")
    expect(detectAgentType("Sources found: 5")).toBe("researcher")
  })

  test("should detect writer from output content", () => {
    expect(detectAgentType("Draft complete")).toBe("writer")
    expect(detectAgentType("I wrote the article")).toBe("writer")
  })

  test("should detect editor from output content", () => {
    expect(detectAgentType("I edited the content")).toBe("editor")
    expect(detectAgentType("Polished the draft")).toBe("editor")
  })

  test("should return null for unknown content", () => {
    expect(detectAgentType("Random text here")).toBeNull()
  })
})

describe("hasConfidenceScore", () => {
  test("should return true for output with confidence", () => {
    expect(hasConfidenceScore("**CONFIDENCE: 0.85**")).toBe(true)
  })

  test("should return false for output without confidence", () => {
    expect(hasConfidenceScore("No confidence here")).toBe(false)
  })
})

describe("configurable thresholds", () => {
  beforeEach(() => {
    setConfidenceConfig(undefined)
    clearRewriteAttempts("ses-config-test")
  })

  test("should use default thresholds when no config", () => {
    // #given
    setConfidenceConfig(undefined)
    // #when & #then
    expect(getRecommendation(0.8)).toBe("pass")
    expect(getRecommendation(0.79)).toBe("polish")
    expect(getRecommendation(0.5)).toBe("polish")
    expect(getRecommendation(0.49)).toBe("rewrite")
  })

  test("should use custom default thresholds", () => {
    // #given
    setConfidenceConfig({
      default: { pass: 0.9, polish: 0.6 },
    })
    // #when & #then
    expect(getRecommendation(0.9)).toBe("pass")
    expect(getRecommendation(0.89)).toBe("polish")
    expect(getRecommendation(0.6)).toBe("polish")
    expect(getRecommendation(0.59)).toBe("rewrite")
  })

  test("should use agent-specific thresholds", () => {
    // #given
    setConfidenceConfig({
      default: { pass: 0.8, polish: 0.5 },
      by_agent: {
        "fact-checker": { pass: 0.95, polish: 0.7 },
        writer: { pass: 0.7, polish: 0.4 },
      },
    })
    // #when & #then
    expect(getRecommendation(0.95, "fact-checker")).toBe("pass")
    expect(getRecommendation(0.94, "fact-checker")).toBe("polish")
    expect(getRecommendation(0.7, "fact-checker")).toBe("polish")
    expect(getRecommendation(0.69, "fact-checker")).toBe("rewrite")

    expect(getRecommendation(0.7, "writer")).toBe("pass")
    expect(getRecommendation(0.69, "writer")).toBe("polish")
    expect(getRecommendation(0.4, "writer")).toBe("polish")
    expect(getRecommendation(0.39, "writer")).toBe("rewrite")

    expect(getRecommendation(0.8, "researcher")).toBe("pass")
    expect(getRecommendation(0.79, "researcher")).toBe("polish")
  })

  test("should apply agent-specific thresholds in analyzeAgentOutput", () => {
    // #given
    setConfidenceConfig({
      by_agent: {
        "fact-checker": { pass: 0.95, polish: 0.7 },
      },
    })
    const output = "Verification done. **CONFIDENCE: 0.85**"
    // #when
    const result = analyzeAgentOutput(output, "ses-config-test", "fact-checker")
    // #then - 0.85 is below 0.95 pass threshold for fact-checker
    expect(result.recommendation).toBe("polish")
  })

  test("should use configurable max_rewrite_attempts", () => {
    // #given
    setConfidenceConfig({
      max_rewrite_attempts: 5,
    })
    const lowOutput = "**CONFIDENCE: 0.3**"
    
    // #when - fail 5 times
    for (let i = 0; i < 5; i++) {
      const result = analyzeAgentOutput(lowOutput, "ses-config-test", "fact-checker")
      expect(result.recommendation).toBe("rewrite")
      expect(result.directive).toContain(`Rewrite attempt: ${i + 1}/5`)
    }
    
    // #then - 6th attempt should escalate
    const finalResult = analyzeAgentOutput(lowOutput, "ses-config-test", "fact-checker")
    expect(finalResult.recommendation).toBe("escalate")
  })

  test("should fall back to default when agent threshold partially defined", () => {
    // #given
    setConfidenceConfig({
      default: { pass: 0.8, polish: 0.5 },
      by_agent: {
        writer: { pass: 0.7 },
      },
    })
    // #when & #then - polish should fall back to default (0.5)
    expect(getRecommendation(0.5, "writer")).toBe("polish")
    expect(getRecommendation(0.49, "writer")).toBe("rewrite")
  })

  test("getConfidenceConfig should return current config", () => {
    // #given
    const config = { default: { pass: 0.9, polish: 0.6 } }
    setConfidenceConfig(config)
    // #when
    const result = getConfidenceConfig()
    // #then
    expect(result).toEqual(config)
  })
})

describe("archivist and extractor support", () => {
  beforeEach(() => {
    setConfidenceConfig(undefined)
    clearRewriteAttempts("ses-archive-test")
  })

  test("detectAgentType should detect archivist from category", () => {
    expect(detectAgentType("any output", "archive")).toBe("archivist")
  })

  test("detectAgentType should detect extractor from category", () => {
    expect(detectAgentType("any output", "extraction")).toBe("extractor")
  })

  test("detectAgentType should detect archivist from output content", () => {
    expect(detectAgentType("Retrieval complete. Found: 5 items")).toBe("archivist")
    expect(detectAgentType("Searching the knowledge base...")).toBe("archivist")
    expect(detectAgentType("Archive search results")).toBe("archivist")
  })

  test("detectAgentType should detect extractor from output content", () => {
    expect(detectAgentType("Extracted content from PDF")).toBe("extractor")
    expect(detectAgentType("Extraction complete")).toBe("extractor")
    expect(detectAgentType("Document conversion finished")).toBe("extractor")
  })

  test("buildConfidenceDirective should work for archivist", () => {
    // #given
    const confidence = 0.85
    const sessionId = "ses-archive"
    // #when
    const result = buildConfidenceDirective(confidence, sessionId, "archivist")
    // #then
    expect(result).toContain("[ARCHIVE PASSED]")
    expect(result).toContain("85%")
    expect(result).toContain("Materials ready for use")
  })

  test("buildConfidenceDirective should work for extractor", () => {
    // #given
    const confidence = 0.65
    const sessionId = "ses-extract"
    // #when
    const result = buildConfidenceDirective(confidence, sessionId, "extractor")
    // #then
    expect(result).toContain("[EXTRACTION: NEEDS POLISH]")
    expect(result).toContain("65%")
    expect(result).toContain('category="extraction"')
  })

  test("analyzeAgentOutput should route archivist correctly", () => {
    // #given
    const output = "Retrieval complete. Found: 3 items.\\n**CONFIDENCE: 0.75**"
    // #when
    const result = analyzeAgentOutput(output, "ses-archive-test", "archivist")
    // #then
    expect(result.agentType).toBe("archivist")
    expect(result.recommendation).toBe("polish")
  })

  test("analyzeAgentOutput should route extractor correctly", () => {
    // #given
    const output = "Extraction complete.\\n**CONFIDENCE: 0.92**"
    // #when
    const result = analyzeAgentOutput(output, "ses-archive-test", "extractor")
    // #then
    expect(result.agentType).toBe("extractor")
    expect(result.recommendation).toBe("pass")
  })

  test("archivist rewrite should suggest external research", () => {
    // #given
    const confidence = 0.3
    const sessionId = "ses-archive"
    // #when
    const result = buildConfidenceDirective(confidence, sessionId, "archivist")
    // #then
    expect(result).toContain("[ARCHIVE: NEEDS REWRITE]")
    expect(result).toContain('category="research"')
  })

  test("extractor low confidence should suggest different approach", () => {
    // #given
    const confidence = 0.25
    const sessionId = "ses-extract"
    // #when
    const result = buildConfidenceDirective(confidence, sessionId, "extractor")
    // #then
    expect(result).toContain("[EXTRACTION: NEEDS REWRITE]")
    expect(result).toContain('category="extraction"')
  })

  test("configurable thresholds should work for archivist", () => {
    // #given
    setConfidenceConfig({
      by_agent: {
        archivist: { pass: 0.9, polish: 0.6 },
      },
    })
    // #when & #then
    expect(getRecommendation(0.9, "archivist")).toBe("pass")
    expect(getRecommendation(0.89, "archivist")).toBe("polish")
    expect(getRecommendation(0.59, "archivist")).toBe("rewrite")
  })

  test("configurable thresholds should work for extractor", () => {
    // #given
    setConfidenceConfig({
      by_agent: {
        extractor: { pass: 0.85, polish: 0.5 },
      },
    })
    // #when & #then
    expect(getRecommendation(0.85, "extractor")).toBe("pass")
    expect(getRecommendation(0.84, "extractor")).toBe("polish")
    expect(getRecommendation(0.49, "extractor")).toBe("rewrite")
  })
})
