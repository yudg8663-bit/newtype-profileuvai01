import type { PluginInput } from "@opencode-ai/plugin"
import type { AgentModelStatus, ProviderStatus, ConfigCheckResult } from "./types"
import { ALL_AGENTS, CRITICAL_AGENTS, type AgentName } from "./constants"
import type { OhMyOpenCodeConfig } from "../../config"
import { log } from "../../shared"

export async function checkAgentModelStatus(
  pluginConfig: OhMyOpenCodeConfig,
  opencodeDefaultModel: string | undefined
): Promise<AgentModelStatus[]> {
  const results: AgentModelStatus[] = []

  for (const agentName of ALL_AGENTS) {
    const agentConfig = pluginConfig.agents?.[agentName as keyof typeof pluginConfig.agents]
    const configuredModel = agentConfig?.model

    let status: AgentModelStatus

    if (configuredModel) {
      status = {
        name: agentName,
        configured: true,
        model: configuredModel,
        source: "user-config",
      }
    } else if (opencodeDefaultModel) {
      status = {
        name: agentName,
        configured: true,
        model: opencodeDefaultModel,
        source: "opencode-default",
      }
    } else {
      status = {
        name: agentName,
        configured: false,
        source: "none",
      }
    }

    results.push(status)
  }

  return results
}

export async function checkProviderStatus(
  client: PluginInput["client"]
): Promise<ProviderStatus[]> {
  const results: ProviderStatus[] = []

  try {
    const providersResponse = await client.config.providers()
    const responseData = providersResponse.data
    const providers = responseData?.providers ?? []

    for (const provider of providers) {
      const modelIds = provider.models ? Object.keys(provider.models) : []
      const providerInfo: ProviderStatus = {
        id: provider.id,
        name: provider.name ?? provider.id,
        authenticated: provider.key !== undefined,
        models: modelIds,
      }
      results.push(providerInfo)
    }
  } catch (error) {
    log(`[startup-config-checker] Failed to fetch providers:`, error)
  }

  return results
}

export function checkCriticalAgentsReady(
  agentStatuses: AgentModelStatus[]
): boolean {
  for (const criticalAgent of CRITICAL_AGENTS) {
    const status = agentStatuses.find((s) => s.name === criticalAgent)
    if (!status?.configured) {
      return false
    }
  }
  return true
}

export function generateConfigStatusMessage(result: ConfigCheckResult): string {
  const lines: string[] = []

  lines.push("## Agent 模型配置状态\n")

  const criticalSection: string[] = []
  const otherSection: string[] = []

  for (const status of result.agentStatuses) {
    const isCritical = CRITICAL_AGENTS.includes(status.name as typeof CRITICAL_AGENTS[number])
    const icon = status.configured ? "✅" : "❌"
    const modelInfo = status.model
      ? `\`${status.model}\` (${status.source === "user-config" ? "用户配置" : "OpenCode 默认"})`
      : "未配置"

    const line = `- ${icon} **${status.name}**: ${modelInfo}`

    if (isCritical) {
      criticalSection.push(line)
    } else {
      otherSection.push(line)
    }
  }

  if (criticalSection.length > 0) {
    lines.push("### 核心 Agent（必须）")
    lines.push(...criticalSection)
    lines.push("")
  }

  if (otherSection.length > 0) {
    lines.push("### 专业 Agent（可选）")
    lines.push(...otherSection)
    lines.push("")
  }

  if (result.providers.length > 0) {
    lines.push("## 可用的模型提供商\n")
    for (const provider of result.providers) {
      const authIcon = provider.authenticated ? "🔑" : "🔒"
      const modelCount = provider.models.length
      lines.push(`- ${authIcon} **${provider.name}**: ${modelCount} 个模型${provider.authenticated ? "" : " (未认证)"}`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

export function generateUserPrompt(result: ConfigCheckResult): string {
  const statusMessage = generateConfigStatusMessage(result)

  const promptLines = [
    "[SYSTEM CONTEXT - 首次启动配置检查]\n",
    statusMessage,
  ]

  if (!result.criticalAgentsReady) {
    promptLines.push("⚠️ **警告**: Chief 和 Deputy 没有可用的模型配置。")
    promptLines.push("这可能会导致无法正常工作。\n")
  }

  promptLines.push("请询问用户想如何处理模型配置：")
  promptLines.push("1. **自动配置** - 你根据可用的 Provider 自动决定并配置")
  promptLines.push("2. **手动配置** - 告诉用户配置文件路径，让用户自己编辑")
  promptLines.push("3. **暂时跳过** - 使用当前配置继续（可能使用 OpenCode 默认模型）")
  promptLines.push("")
  promptLines.push("用自然、友好的方式向用户说明情况并询问。")

  return promptLines.join("\n")
}
