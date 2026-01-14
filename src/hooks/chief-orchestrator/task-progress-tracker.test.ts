import { describe, test, expect, beforeEach } from "bun:test"
import {
  createTaskProgressTracker,
  getTrackerForSession,
  clearTrackerForSession,
} from "./task-progress-tracker"

describe("task-progress-tracker", () => {
  describe("createTaskProgressTracker", () => {
    test("starts empty", () => {
      // #given
      const tracker = createTaskProgressTracker()
      // #when
      const progress = tracker.getProgress()
      // #then
      expect(progress).toHaveLength(0)
    })

    test("adds task with running status", () => {
      // #given
      const tracker = createTaskProgressTracker()
      // #when
      tracker.addTask({
        id: "task-1",
        agent: "researcher",
        description: "Research AI trends",
      })
      const progress = tracker.getProgress()
      // #then
      expect(progress).toHaveLength(1)
      expect(progress[0].status).toBe("running")
      expect(progress[0].agent).toBe("researcher")
    })

    test("completes task with duration", async () => {
      // #given
      const tracker = createTaskProgressTracker()
      tracker.addTask({
        id: "task-1",
        agent: "researcher",
        description: "Research AI trends",
      })
      // #when
      await new Promise(resolve => setTimeout(resolve, 50))
      tracker.completeTask("task-1", "ses_abc123")
      const progress = tracker.getProgress()
      // #then
      expect(progress[0].status).toBe("completed")
      expect(progress[0].sessionId).toBe("ses_abc123")
      expect(progress[0].duration).toBeDefined()
    })

    test("fails task with error message", () => {
      // #given
      const tracker = createTaskProgressTracker()
      tracker.addTask({
        id: "task-1",
        agent: "fact-checker",
        description: "Verify sources",
      })
      // #when
      tracker.failTask("task-1", "timeout")
      const progress = tracker.getProgress()
      // #then
      expect(progress[0].status).toBe("failed")
      expect(progress[0].description).toContain("timeout")
    })

    test("formats progress as markdown", () => {
      // #given
      const tracker = createTaskProgressTracker()
      tracker.addTask({
        id: "task-1",
        agent: "researcher",
        description: "Research trends",
      })
      tracker.completeTask("task-1")
      tracker.addTask({
        id: "task-2",
        agent: "writer",
        category: "writing",
        description: "Draft article",
      })
      // #when
      const formatted = tracker.formatProgress()
      // #then
      expect(formatted).toContain("## 📋 Task Progress")
      expect(formatted).toContain("✅ **researcher**")
      expect(formatted).toContain("⏳ **writing**")
    })

    test("clears all tasks", () => {
      // #given
      const tracker = createTaskProgressTracker()
      tracker.addTask({
        id: "task-1",
        agent: "researcher",
        description: "Research",
      })
      // #when
      tracker.clear()
      const progress = tracker.getProgress()
      // #then
      expect(progress).toHaveLength(0)
    })
  })

  describe("session tracker management", () => {
    beforeEach(() => {
      clearTrackerForSession("test-session")
    })

    test("creates new tracker for session", () => {
      // #given
      const sessionId = "test-session"
      // #when
      const tracker = getTrackerForSession(sessionId)
      // #then
      expect(tracker).toBeDefined()
      expect(tracker.getProgress()).toHaveLength(0)
    })

    test("returns same tracker for same session", () => {
      // #given
      const sessionId = "test-session"
      const tracker1 = getTrackerForSession(sessionId)
      tracker1.addTask({ id: "t1", agent: "a", description: "d" })
      // #when
      const tracker2 = getTrackerForSession(sessionId)
      // #then
      expect(tracker2.getProgress()).toHaveLength(1)
    })

    test("clears tracker for session", () => {
      // #given
      const sessionId = "test-session"
      const tracker1 = getTrackerForSession(sessionId)
      tracker1.addTask({ id: "t1", agent: "a", description: "d" })
      // #when
      clearTrackerForSession(sessionId)
      const tracker2 = getTrackerForSession(sessionId)
      // #then
      expect(tracker2.getProgress()).toHaveLength(0)
    })
  })
})
