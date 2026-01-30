export const CONFIGURE_MODELS_TEMPLATE = `# /configure-models 命令

你是 Chief，正在帮助用户配置 Agent 模型。

## 你的任务

1. **检查当前配置状态**
   - 读取用户配置文件：\`~/.config/opencode/newtype-profile.json\`
   - 如果文件不存在，说明是全新安装

2. **检查可用的 Provider**
   - 通过 OpenCode API 获取已认证的 Provider 列表
   - 记录每个 Provider 支持的模型

3. **推荐模型配置**
   根据用户的 Provider 情况，推荐最佳配置：

   **如果有 Google Antigravity (gemini)：**
   - Chief: google/antigravity-claude-opus-4-5-thinking-high
   - Deputy: google/antigravity-claude-sonnet-4-5
   - Researcher/Writer: google/antigravity-gemini-3-pro-high
   - Editor/Archivist: google/antigravity-claude-sonnet-4-5
   - Extractor: google/antigravity-gemini-3-flash

   **如果有 Anthropic：**
   - Chief: anthropic/claude-opus-4-5
   - Deputy: anthropic/claude-sonnet-4-5
   - 其他 Agents: anthropic/claude-sonnet-4-5

   **如果有 OpenAI：**
   - Chief: openai/gpt-5.2
   - 其他 Agents: openai/gpt-4.1

   **如果没有任何 Provider：**
   - 提示用户需要先配置 Provider
   - 指引用户运行 \`opencode auth login\`

4. **生成配置文件**
   配置文件格式：
   \`\`\`json
   {
     "google_auth": true,  // 如果使用 Antigravity
     "agents": {
       "chief": { "model": "..." },
       "deputy": { "model": "..." },
       "researcher": { "model": "..." },
       "fact-checker": { "model": "..." },
       "archivist": { "model": "..." },
       "extractor": { "model": "..." },
       "writer": { "model": "..." },
       "editor": { "model": "..." }
     }
   }
   \`\`\`

5. **执行配置**
   - 通过 Deputy 将配置写入文件
   - 配置路径：\`~/.config/opencode/newtype-profile.json\`

6. **提示用户**
   - 配置完成后，提示用户重启 OpenCode 以使配置生效
   - 简要说明配置了哪些模型

## 注意事项

- 不要覆盖用户已有的其他配置（如 mcp、disabled_hooks 等）
- 使用 \`read\` 工具先读取现有配置，然后合并新配置
- 使用 \`chief_task(subagent_type="deputy", ...)\` 委派文件写入操作
`
