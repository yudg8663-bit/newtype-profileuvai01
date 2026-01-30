import type { PluginInput } from "@opencode-ai/plugin"
import type { OhMyOpenCodeConfig } from "../../config"
import type { ConfigCheckResult, StartupConfigCheckerOptions } from "./types"
import { HOOK_NAME, CONFIG_FILE_PATH, FIRST_RUN_MARKER_KEY } from "./constants"
import {
  checkAgentModelStatus,
  checkProviderStatus,
  checkCriticalAgentsReady,
  generateUserPrompt,
} from "./utils"
import { log } from "../../shared"

interface SessionState {
  hasPromptedThisSession: boolean
}

const sessionStates = new Map<string, SessionState>()

function getOrCreateSessionState(sessionID: string): SessionState {
  let state = sessionStates.get(sessionID)
  if (!state) {
    state = { hasPromptedThisSession: false }
    sessionStates.set(sessionID, state)
  }
  return state
}

export function createStartupConfigCheckerHook(
  ctx: PluginInput,
  pluginConfig: OhMyOpenCodeConfig,
  options: StartupConfigCheckerOptions = {}
) {
  let configCheckResult: ConfigCheckResult | null = null
  let hasCheckedThisInstance = false

  const performConfigCheck = async (
    opencodeDefaultModel: string | undefined
  ): Promise<ConfigCheckResult> => {
    const agentStatuses = await checkAgentModelStatus(pluginConfig, opencodeDefaultModel)
    const providers = await checkProviderStatus(ctx.client)
    const criticalAgentsReady = checkCriticalAgentsReady(agentStatuses)
    const hasAnyProvider = providers.some((p) => p.authenticated && p.models.length > 0)

    const unconfiguredAgents = agentStatuses.filter((s) => !s.configured)
    const needsUserAction = !criticalAgentsReady || unconfiguredAgents.length > 0

    return {
      criticalAgentsReady,
      agentStatuses,
      providers,
      hasAnyProvider,
      needsUserAction,
      firstRun: !options.skipFirstRunCheck,
    }
  }

  return {
    event: async ({ event }: { event: { type: string; properties?: unknown } }) => {
      if (event.type !== "session.created") return
      if (hasCheckedThisInstance) return

      const props = event.properties as { info?: { parentID?: string; id?: string } } | undefined
      if (props?.info?.parentID) return

      hasCheckedThisInstance = true

      try {
        const configResponse = await ctx.client.config.get()
        const opencodeDefaultModel = configResponse.data?.model as string | undefined

        configCheckResult = await performConfigCheck(opencodeDefaultModel)

        log(`[${HOOK_NAME}] Config check result:`, {
          criticalAgentsReady: configCheckResult.criticalAgentsReady,
          providersCount: configCheckResult.providers.length,
          needsUserAction: configCheckResult.needsUserAction,
        })

        if (configCheckResult.needsUserAction) {
          await ctx.client.tui.showToast({
            body: {
              title: "Agent 配置检查",
              message: configCheckResult.criticalAgentsReady
                ? "部分 Agent 未配置模型，将使用默认配置"
                : "Chief/Deputy 未配置模型，可能影响使用",
              variant: configCheckResult.criticalAgentsReady ? "info" : "warning",
              duration: 5000,
            },
          })
        }
      } catch (error) {
        log(`[${HOOK_NAME}] Error during config check:`, error)
      }
    },

    "experimental.chat.system.transform": async (
      input: { sessionID?: string },
      output: { system: string[] }
    ) => {
      if (!configCheckResult?.needsUserAction) return

      const sessionID = input.sessionID
      if (!sessionID) return

      const state = getOrCreateSessionState(sessionID)
      if (state.hasPromptedThisSession) return

      state.hasPromptedThisSession = true

      const userPrompt = generateUserPrompt(configCheckResult)
      output.system.push(userPrompt)

      log(`[${HOOK_NAME}] Injected config check prompt for session:`, sessionID)
    },
  }
}

export { HOOK_NAME }
