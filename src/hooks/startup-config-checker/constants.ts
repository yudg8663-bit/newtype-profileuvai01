export const HOOK_NAME = "startup-config-checker"

export const CRITICAL_AGENTS = ["chief", "deputy"] as const
export type CriticalAgent = (typeof CRITICAL_AGENTS)[number]

export const ALL_AGENTS = [
  "chief",
  "deputy",
  "researcher",
  "fact-checker",
  "archivist",
  "extractor",
  "writer",
  "editor",
] as const
export type AgentName = (typeof ALL_AGENTS)[number]

export const CONFIG_FILE_PATH = "~/.config/opencode/newtype-profile.json"

export const FIRST_RUN_MARKER_KEY = "startup-config-checker:first-run-prompted"
