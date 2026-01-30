import { describe, test, expect } from "bun:test"
import { createBuiltinAgents } from "./utils"
import type { AgentConfig } from "@opencode-ai/sdk"

describe("createBuiltinAgents with model overrides", () => {
  test("chief without model when no override", () => {
    // #given - no overrides

    // #when
    const agents = createBuiltinAgents()

    // #then - model is undefined, OpenCode will use global default
    expect(agents.chief.model).toBeUndefined()
  })

  test("chief with GPT model override", () => {
    // #given
    const overrides = {
      chief: { model: "openai/gpt-5.2" },
    }

    // #when
    const agents = createBuiltinAgents([], overrides)

    // #then
    expect(agents.chief.model).toBe("openai/gpt-5.2")
  })

  test("chief with systemDefaultModel GPT", () => {
    // #given
    const systemDefaultModel = "openai/gpt-5.2"

    // #when
    const agents = createBuiltinAgents([], {}, undefined, systemDefaultModel)

    // #then
    expect(agents.chief.model).toBe("openai/gpt-5.2")
  })

  test("researcher without model when no override", () => {
    // #given - no overrides

    // #when
    const agents = createBuiltinAgents()

    // #then - model is undefined, OpenCode will use global default
    expect(agents.researcher.model).toBeUndefined()
  })

  test("researcher with Claude model override", () => {
    // #given
    const overrides = {
      researcher: { model: "anthropic/claude-sonnet-4" },
    }

    // #when
    const agents = createBuiltinAgents([], overrides)

    // #then
    expect(agents.researcher.model).toBe("anthropic/claude-sonnet-4")
  })

  test("non-model overrides are still applied after factory rebuild", () => {
    // #given
    const overrides = {
      chief: { model: "openai/gpt-5.2", temperature: 0.5 },
    }

    // #when
    const agents = createBuiltinAgents([], overrides)

    // #then
    expect(agents.chief.model).toBe("openai/gpt-5.2")
    expect(agents.chief.temperature).toBe(0.5)
  })
})

describe("buildAgent with category and skills", () => {
  const { buildAgent } = require("./utils")

  test("agent with category inherits category settings", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          category: "research",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"])

    // #then - model is undefined (uses OpenCode default), only temperature from category
    expect(agent.model).toBeUndefined()
    expect(agent.temperature).toBe(0.5)
  })

  test("agent with category and existing model keeps existing model", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          category: "research",
          model: "custom/model",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"])

    // #then
    expect(agent.model).toBe("custom/model")
    expect(agent.temperature).toBe(0.5)
  })

  test("agent with skills has content prepended to prompt", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          skills: ["playwright"],
          prompt: "Original prompt content",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"])

    // #then
    expect(agent.prompt).toContain("Playwright Browser Automation")
    expect(agent.prompt).toContain("Original prompt content")
    expect(agent.prompt).toMatch(/Playwright[\s\S]*Original prompt content/s)
  })

  test("agent with multiple skills has all content prepended", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          skills: ["playwright"],
          prompt: "Agent prompt",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"])

    // #then
    expect(agent.prompt).toContain("Playwright Browser Automation")
    expect(agent.prompt).toContain("Agent prompt")
  })

  test("agent without category or skills works as before", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          model: "custom/model",
          temperature: 0.5,
          prompt: "Base prompt",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"])

    // #then
    expect(agent.model).toBe("custom/model")
    expect(agent.temperature).toBe(0.5)
    expect(agent.prompt).toBe("Base prompt")
  })

  test("agent with category and skills applies both", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          category: "writing",
          skills: ["playwright"],
          prompt: "Task description",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"])

    // #then - model is undefined (uses OpenCode default), temperature from category
    expect(agent.model).toBeUndefined()
    expect(agent.temperature).toBe(0.7)
    expect(agent.prompt).toContain("Playwright Browser Automation")
    expect(agent.prompt).toContain("Task description")
  })

  test("agent with non-existent category has no effect", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          category: "non-existent",
          prompt: "Base prompt",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"])

    // #then
    expect(agent.model).toBeUndefined()
    expect(agent.prompt).toBe("Base prompt")
  })

  test("agent with non-existent skills only prepends found ones", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          skills: ["playwright", "non-existent-skill"],
          prompt: "Base prompt",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"])

    // #then
    expect(agent.prompt).toContain("Playwright Browser Automation")
    expect(agent.prompt).toContain("Base prompt")
  })

  test("agent with empty skills array keeps original prompt", () => {
    // #given
    const source = {
      "test-agent": () =>
        ({
          description: "Test agent",
          skills: [],
          prompt: "Base prompt",
        }) as AgentConfig,
    }

    // #when
    const agent = buildAgent(source["test-agent"])

    // #then
    expect(agent.prompt).toBe("Base prompt")
  })
})
