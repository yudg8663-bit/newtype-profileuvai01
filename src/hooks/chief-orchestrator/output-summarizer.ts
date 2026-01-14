/**
 * Output summarizer for chief_task results
 *
 * Extracts key information and truncates verbose output to reduce
 * context window consumption while preserving actionable insights.
 */

export interface SummaryConfig {
  /** Max characters for summary (default: 800) */
  maxLength?: number
  /** Category of the task (affects max length) */
  category?: string
}

export interface SummarizedOutput {
  /** Truncated summary of the output */
  summary: string
  /** Session ID for follow-up queries */
  sessionId: string
  /** Agent that executed the task */
  agent: string
  /** Duration of the task */
  duration: string
  /** Whether output was truncated */
  wasTruncated: boolean
  /** Original character count */
  originalLength: number
}

// Categories that typically produce longer outputs and need more space
const VERBOSE_CATEGORIES = ["research", "archive", "writing"]
const DEFAULT_MAX_LENGTH = 800
const VERBOSE_MAX_LENGTH = 1500

/**
 * Extract session ID from chief_task output
 */
export function extractSessionId(output: string): string {
  const match = output.match(/Session ID:\s*(ses_[a-zA-Z0-9]+)/)
  return match?.[1] ?? ""
}

/**
 * Extract agent name from chief_task output
 */
export function extractAgent(output: string): string {
  // Pattern: "Agent: researcher" or "Agent: deputy (category: research)"
  const match = output.match(/Agent:\s*(\w+)(?:\s*\(category:\s*(\w+)\))?/)
  if (match) {
    // If category is present, use it as the agent name for clarity
    return match[2] ?? match[1]
  }
  return "unknown"
}

/**
 * Extract duration from chief_task output
 */
export function extractDuration(output: string): string {
  const match = output.match(/completed in\s+([\d\w\s]+)\./i)
  return match?.[1]?.trim() ?? ""
}

/**
 * Extract the main content from chief_task output (after the --- separator)
 */
export function extractMainContent(output: string): string {
  const separatorIndex = output.indexOf("---")
  if (separatorIndex === -1) return output

  // Get content after the separator
  const content = output.slice(separatorIndex + 3).trim()
  return content
}

/**
 * Intelligently truncate text while preserving structure
 *
 * - Tries to break at paragraph boundaries
 * - Preserves markdown headers
 * - Adds truncation indicator
 */
export function smartTruncate(text: string, maxLength: number): { text: string; wasTruncated: boolean } {
  if (text.length <= maxLength) {
    return { text, wasTruncated: false }
  }

  // Find a good break point (paragraph, sentence, or word boundary)
  let breakPoint = maxLength

  // Try to break at a paragraph (double newline)
  const paragraphBreak = text.lastIndexOf("\n\n", maxLength)
  if (paragraphBreak > maxLength * 0.6) {
    breakPoint = paragraphBreak
  } else {
    // Try to break at a sentence (. followed by space or newline)
    const sentenceBreak = text.lastIndexOf(". ", maxLength)
    if (sentenceBreak > maxLength * 0.7) {
      breakPoint = sentenceBreak + 1 // Include the period
    } else {
      // Break at word boundary
      const wordBreak = text.lastIndexOf(" ", maxLength)
      if (wordBreak > maxLength * 0.8) {
        breakPoint = wordBreak
      }
    }
  }

  const truncated = text.slice(0, breakPoint).trim()
  return {
    text: truncated + "\n\n[... output truncated, use `resume` with session_id for full details]",
    wasTruncated: true,
  }
}

/**
 * Summarize chief_task output to reduce context window consumption
 */
export function summarizeOutput(output: string, config?: SummaryConfig): SummarizedOutput {
  const category = config?.category
  const maxLength = config?.maxLength ??
    (category && VERBOSE_CATEGORIES.includes(category) ? VERBOSE_MAX_LENGTH : DEFAULT_MAX_LENGTH)

  const sessionId = extractSessionId(output)
  const agent = extractAgent(output)
  const duration = extractDuration(output)
  const mainContent = extractMainContent(output)

  const { text: summary, wasTruncated } = smartTruncate(mainContent, maxLength)

  return {
    summary,
    sessionId,
    agent,
    duration,
    wasTruncated,
    originalLength: mainContent.length,
  }
}

/**
 * Format summarized output for Chief's context
 */
export function formatSummarizedOutput(result: SummarizedOutput): string {
  const header = `## Subagent Result: ${result.agent}`
  const meta = [
    `**Duration:** ${result.duration || "N/A"}`,
    `**Session:** \`${result.sessionId || "N/A"}\``,
    result.wasTruncated
      ? `**Note:** Output truncated (${result.originalLength} → ${result.summary.length} chars)`
      : null,
  ].filter(Boolean).join(" | ")

  return `${header}\n${meta}\n\n${result.summary}`
}
