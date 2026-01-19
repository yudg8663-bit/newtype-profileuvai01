import { supportsNewPermissionSystem } from "./opencode-version"

export type PermissionValue = "ask" | "allow" | "deny"

export interface LegacyToolsFormat {
  tools: Record<string, boolean>
}

export interface NewPermissionFormat {
  permission: Record<string, PermissionValue>
}

export type VersionAwareRestrictions = LegacyToolsFormat | NewPermissionFormat

/**
 * 创建工具黑名单限制 — 指定的工具被禁止使用
 */
export function createAgentToolRestrictions(
  denyTools: string[]
): VersionAwareRestrictions {
  if (supportsNewPermissionSystem()) {
    return {
      permission: Object.fromEntries(
        denyTools.map((tool) => [tool, "deny" as const])
      ),
    }
  }

  return {
    tools: Object.fromEntries(denyTools.map((tool) => [tool, false])),
  }
}

/**
 * 创建工具白名单限制 — 只有指定的工具被允许使用
 *
 * 使用 `*: deny` 作为默认规则，然后显式允许白名单中的工具
 * 这样可以阻止任何未在白名单中的工具，包括用户安装的 MCP
 */
export function createAgentToolAllowlist(
  allowTools: string[]
): VersionAwareRestrictions {
  if (supportsNewPermissionSystem()) {
    return {
      permission: {
        // 默认拒绝所有工具
        "*": "deny" as const,
        // 显式允许白名单中的工具
        ...Object.fromEntries(
          allowTools.map((tool) => [tool, "allow" as const])
        ),
      },
    }
  }

  // 旧版本不支持 "*" 通配符，只能用黑名单模式
  // 这种情况下无法完美实现白名单，记录警告
  console.warn(
    "[permission-compat] Old OpenCode version detected. Allowlist mode may not work as expected. Consider upgrading OpenCode."
  )
  return {
    tools: Object.fromEntries(allowTools.map((tool) => [tool, true])),
  }
}

export function migrateToolsToPermission(
  tools: Record<string, boolean>
): Record<string, PermissionValue> {
  return Object.fromEntries(
    Object.entries(tools).map(([key, value]) => [
      key,
      value ? ("allow" as const) : ("deny" as const),
    ])
  )
}

export function migratePermissionToTools(
  permission: Record<string, PermissionValue>
): Record<string, boolean> {
  return Object.fromEntries(
    Object.entries(permission)
      .filter(([, value]) => value !== "ask")
      .map(([key, value]) => [key, value === "allow"])
  )
}

export function migrateAgentConfig(
  config: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...config }

  if (supportsNewPermissionSystem()) {
    if (result.tools && typeof result.tools === "object") {
      const existingPermission =
        (result.permission as Record<string, PermissionValue>) || {}
      const migratedPermission = migrateToolsToPermission(
        result.tools as Record<string, boolean>
      )
      result.permission = { ...migratedPermission, ...existingPermission }
      delete result.tools
    }
  } else {
    if (result.permission && typeof result.permission === "object") {
      const existingTools = (result.tools as Record<string, boolean>) || {}
      const migratedTools = migratePermissionToTools(
        result.permission as Record<string, PermissionValue>
      )
      result.tools = { ...migratedTools, ...existingTools }
      delete result.permission
    }
  }

  return result
}
