import type { AgentName, CriticalAgent } from "./constants"

export interface AgentModelStatus {
  name: AgentName
  configured: boolean
  model?: string
  source: "user-config" | "opencode-default" | "none"
}

export interface ProviderStatus {
  id: string
  name: string
  authenticated: boolean
  models: string[]
}

export interface ConfigCheckResult {
  criticalAgentsReady: boolean
  agentStatuses: AgentModelStatus[]
  providers: ProviderStatus[]
  hasAnyProvider: boolean
  needsUserAction: boolean
  firstRun: boolean
}

export interface StartupConfigCheckerOptions {
  skipFirstRunCheck?: boolean
}
