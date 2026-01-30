import { describe, test, expect, beforeEach, mock } from "bun:test"
import { createStartupConfigCheckerHook } from "./index"
import type { OhMyOpenCodeConfig } from "../../config"

describe("startup-config-checker", () => {
  let mockClient: {
    config: { get: ReturnType<typeof mock>; providers: ReturnType<typeof mock> }
    tui: { showToast: ReturnType<typeof mock> }
  }
  let mockCtx: { client: typeof mockClient; directory: string }

  beforeEach(() => {
    mockClient = {
      config: {
        get: mock(() =>
          Promise.resolve({ data: { model: "anthropic/claude-sonnet-4-5" } })
        ),
        providers: mock(() =>
          Promise.resolve({
            data: {
              providers: [
                {
                  id: "anthropic",
                  name: "Anthropic",
                  key: "sk-xxx",
                  models: { "claude-sonnet-4-5": {}, "claude-opus-4-5": {} },
                },
              ],
            },
          })
        ),
      },
      tui: {
        showToast: mock(() => Promise.resolve()),
      },
    }
    mockCtx = {
      client: mockClient,
      directory: "/test/project",
    }
  })

  describe("event handler", () => {
    test("should not trigger on non-session.created events", async () => {
      // #given
      const pluginConfig: OhMyOpenCodeConfig = {}
      const hook = createStartupConfigCheckerHook(
        mockCtx as never,
        pluginConfig
      )

      // #when
      await hook.event({ event: { type: "session.deleted" } })

      // #then
      expect(mockClient.config.get).not.toHaveBeenCalled()
    })

    test("should not trigger on subagent sessions", async () => {
      // #given
      const pluginConfig: OhMyOpenCodeConfig = {}
      const hook = createStartupConfigCheckerHook(
        mockCtx as never,
        pluginConfig
      )

      // #when
      await hook.event({
        event: {
          type: "session.created",
          properties: { info: { id: "sub-1", parentID: "main-1" } },
        },
      })

      // #then
      expect(mockClient.config.get).not.toHaveBeenCalled()
    })

    test("should check config on main session creation", async () => {
      // #given
      const pluginConfig: OhMyOpenCodeConfig = {}
      const hook = createStartupConfigCheckerHook(
        mockCtx as never,
        pluginConfig
      )

      // #when
      await hook.event({
        event: {
          type: "session.created",
          properties: { info: { id: "main-1" } },
        },
      })

      // #then
      expect(mockClient.config.get).toHaveBeenCalled()
      expect(mockClient.config.providers).toHaveBeenCalled()
    })

    test("should only check once per instance", async () => {
      // #given
      const pluginConfig: OhMyOpenCodeConfig = {}
      const hook = createStartupConfigCheckerHook(
        mockCtx as never,
        pluginConfig
      )

      // #when
      await hook.event({
        event: {
          type: "session.created",
          properties: { info: { id: "main-1" } },
        },
      })
      await hook.event({
        event: {
          type: "session.created",
          properties: { info: { id: "main-2" } },
        },
      })

      // #then
      expect(mockClient.config.get).toHaveBeenCalledTimes(1)
    })

    test("should show warning toast when critical agents have no model", async () => {
      // #given
      mockClient.config.get = mock(() =>
        Promise.resolve({ data: { model: undefined } })
      )
      mockClient.config.providers = mock(() =>
        Promise.resolve({ data: { providers: [] } })
      )
      const pluginConfig: OhMyOpenCodeConfig = {}
      const hook = createStartupConfigCheckerHook(
        mockCtx as never,
        pluginConfig
      )

      // #when
      await hook.event({
        event: {
          type: "session.created",
          properties: { info: { id: "main-1" } },
        },
      })

      // #then
      expect(mockClient.tui.showToast).toHaveBeenCalled()
      const toastCall = mockClient.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.variant).toBe("warning")
    })

    test("should not show toast when default model covers all agents", async () => {
      // #given - has default model so ALL agents are considered configured (source: "opencode-default")
      const pluginConfig: OhMyOpenCodeConfig = {}
      const hook = createStartupConfigCheckerHook(
        mockCtx as never,
        pluginConfig
      )

      // #when
      await hook.event({
        event: {
          type: "session.created",
          properties: { info: { id: "main-1" } },
        },
      })

      // #then - with default model, needsUserAction=false, so no toast
      expect(mockClient.tui.showToast).not.toHaveBeenCalled()
    })
  })

  describe("system transform", () => {
    test("should inject prompt only once per session", async () => {
      // #given
      mockClient.config.get = mock(() =>
        Promise.resolve({ data: { model: undefined } })
      )
      mockClient.config.providers = mock(() =>
        Promise.resolve({ data: { providers: [] } })
      )
      const pluginConfig: OhMyOpenCodeConfig = {}
      const hook = createStartupConfigCheckerHook(
        mockCtx as never,
        pluginConfig
      )

      await hook.event({
        event: {
          type: "session.created",
          properties: { info: { id: "main-1" } },
        },
      })

      const output1 = { system: [] as string[] }
      const output2 = { system: [] as string[] }

      // #when
      await hook["experimental.chat.system.transform"]?.(
        { sessionID: "main-1" },
        output1
      )
      await hook["experimental.chat.system.transform"]?.(
        { sessionID: "main-1" },
        output2
      )

      // #then
      expect(output1.system.length).toBe(1)
      expect(output2.system.length).toBe(0)
    })

    test("should not inject prompt when all agents are configured via default model", async () => {
      // #given - has OpenCode default model, so all agents are configured
      const pluginConfig: OhMyOpenCodeConfig = {}
      const hook = createStartupConfigCheckerHook(
        mockCtx as never,
        pluginConfig
      )

      await hook.event({
        event: {
          type: "session.created",
          properties: { info: { id: "main-1" } },
        },
      })

      const output = { system: [] as string[] }

      // #when
      await hook["experimental.chat.system.transform"]?.(
        { sessionID: "main-1" },
        output
      )

      // #then - with default model, needsUserAction=false, so no prompt injected
      expect(output.system.length).toBe(0)
    })
  })
})
