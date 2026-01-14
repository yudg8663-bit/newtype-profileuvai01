export type TaskStatus = "pending" | "running" | "completed" | "failed"

export interface TaskProgress {
  id: string
  agent: string
  category?: string
  description: string
  status: TaskStatus
  startTime: Date
  endTime?: Date
  duration?: string
  sessionId?: string
}

export interface TaskProgressTracker {
  addTask(task: Omit<TaskProgress, "status" | "startTime">): void
  completeTask(id: string, sessionId?: string): void
  failTask(id: string, error?: string): void
  getProgress(): TaskProgress[]
  formatProgress(): string
  clear(): void
}

function formatDuration(startTime: Date, endTime?: Date): string {
  const duration = (endTime ?? new Date()).getTime() - startTime.getTime()
  const seconds = Math.floor(duration / 1000)
  const minutes = Math.floor(seconds / 60)

  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export function createTaskProgressTracker(): TaskProgressTracker {
  const tasks: Map<string, TaskProgress> = new Map()

  return {
    addTask(task) {
      tasks.set(task.id, {
        ...task,
        status: "running",
        startTime: new Date(),
      })
    },

    completeTask(id, sessionId) {
      const task = tasks.get(id)
      if (task) {
        task.status = "completed"
        task.endTime = new Date()
        task.duration = formatDuration(task.startTime, task.endTime)
        if (sessionId) {
          task.sessionId = sessionId
        }
      }
    },

    failTask(id, error) {
      const task = tasks.get(id)
      if (task) {
        task.status = "failed"
        task.endTime = new Date()
        task.duration = formatDuration(task.startTime, task.endTime)
        if (error) {
          task.description = `${task.description} (${error})`
        }
      }
    },

    getProgress() {
      return Array.from(tasks.values())
    },

    formatProgress() {
      const taskList = Array.from(tasks.values())
      if (taskList.length === 0) return ""

      const lines = ["## 📋 Task Progress"]

      for (const task of taskList) {
        const icon = task.status === "completed" ? "✅"
          : task.status === "failed" ? "❌"
          : "⏳"
        const agentLabel = task.category ?? task.agent
        const durationStr = task.duration ? ` (${task.duration})` : ""

        lines.push(`- ${icon} **${agentLabel}**: ${task.description}${durationStr}`)
      }

      return lines.join("\n")
    },

    clear() {
      tasks.clear()
    },
  }
}

const sessionTrackers = new Map<string, TaskProgressTracker>()

export function getTrackerForSession(sessionId: string): TaskProgressTracker {
  let tracker = sessionTrackers.get(sessionId)
  if (!tracker) {
    tracker = createTaskProgressTracker()
    sessionTrackers.set(sessionId, tracker)
  }
  return tracker
}

export function clearTrackerForSession(sessionId: string): void {
  sessionTrackers.delete(sessionId)
}
