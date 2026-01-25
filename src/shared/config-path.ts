import * as path from "path"
import * as os from "os"
import * as fs from "fs"

/**
 * Returns the user-level config directory based on the OS.
 * - Linux/macOS: XDG_CONFIG_HOME or ~/.config
 * - Windows: Checks ~/.config first (cross-platform), then %APPDATA% (fallback)
 *
 * On Windows, prioritizes ~/.config for cross-platform consistency.
 * Falls back to %APPDATA% for backward compatibility with existing installations.
 */
export function getUserConfigDir(): string {
  if (process.platform === "win32") {
    const crossPlatformDir = path.join(os.homedir(), ".config")
    const crossPlatformConfigPath = path.join(crossPlatformDir, "opencode", "newtype-profile.json")

    const appdataDir = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming")
    const appdataConfigPath = path.join(appdataDir, "opencode", "newtype-profile.json")

    if (fs.existsSync(crossPlatformConfigPath)) {
      return crossPlatformDir
    }

    if (fs.existsSync(appdataConfigPath)) {
      return appdataDir
    }

    return crossPlatformDir
  }

  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config")
}

/**
 * Returns the full path to the user-level newtype-profile config file.
 */
export function getUserConfigPath(): string {
  return path.join(getUserConfigDir(), "opencode", "newtype-profile.json")
}

/**
 * Returns the full path to the project-level newtype-profile config file.
 */
export function getProjectConfigPath(directory: string): string {
  return path.join(directory, ".opencode", "newtype-profile.json")
}
