export const SWITCH_PLUGIN_TEMPLATE = `Switch OpenCode plugin configuration.

## USAGE

\`/switch <plugin-name>\`

**Available presets:**
- \`newtype\` - Switch to newtype-profile (this plugin)
- \`omo\` - Switch to oh-my-opencode
- \`none\` - Disable all plugins

**Arguments:**
$ARGUMENTS

## WHAT TO DO

1. **Parse the argument** to determine which plugin preset to use:
   - "newtype" or "newtype-profile" → ["newtype-profile"]
   - "omo" or "oh-my-opencode" → ["oh-my-opencode"]
   - "none" or "disable" or "off" → []

2. **Read current config** at \`~/.config/opencode/opencode.json\`

3. **Update the plugin field** in the config JSON:
   \`\`\`json
   {
     "plugin": ["newtype-profile"]  // or ["oh-my-opencode"] or []
   }
   \`\`\`

4. **Write the updated config** back to the file

5. **Inform the user** that they need to restart OpenCode for changes to take effect

## IMPLEMENTATION

Use the bash tool to read, modify, and write the config file:

\`\`\`bash
# Read current config
cat ~/.config/opencode/opencode.json

# The config structure looks like:
# {
#   "plugin": ["newtype-profile"],
#   "model": {...},
#   ...
# }
\`\`\`

After reading, use a script or jq to update the plugin field, then write back.

Example with jq (if available):
\`\`\`bash
# For newtype-profile
jq '.plugin = ["newtype-profile"]' ~/.config/opencode/opencode.json > /tmp/opencode.json.tmp && mv /tmp/opencode.json.tmp ~/.config/opencode/opencode.json

# For oh-my-opencode
jq '.plugin = ["oh-my-opencode"]' ~/.config/opencode/opencode.json > /tmp/opencode.json.tmp && mv /tmp/opencode.json.tmp ~/.config/opencode/opencode.json

# For none
jq '.plugin = []' ~/.config/opencode/opencode.json > /tmp/opencode.json.tmp && mv /tmp/opencode.json.tmp ~/.config/opencode/opencode.json
\`\`\`

If jq is not available, use node/bun inline script:
\`\`\`bash
node -e "
const fs = require('fs');
const path = require('os').homedir() + '/.config/opencode/opencode.json';
const config = JSON.parse(fs.readFileSync(path, 'utf-8'));
config.plugin = ['newtype-profile'];  // or the appropriate value
fs.writeFileSync(path, JSON.stringify(config, null, 2));
console.log('Plugin switched to: ' + config.plugin.join(', ') || 'none');
"
\`\`\`

## OUTPUT FORMAT

After successful switch:
\`\`\`
✅ Plugin switched to: {plugin-name}

⚠️  Please restart OpenCode for changes to take effect:
    1. Press Ctrl+C to exit
    2. Run \`opencode\` to start again

Current plugin configuration:
{
  "plugin": ["{plugin-name}"]
}
\`\`\`

If argument is invalid:
\`\`\`
❌ Unknown plugin: {argument}

Available options:
  - newtype (newtype-profile)
  - omo (oh-my-opencode)
  - none (disable plugins)

Usage: /switch <plugin-name>
\`\`\`

## IMPORTANT

- OpenCode does NOT support hot-reloading plugins
- The user MUST restart OpenCode after switching
- Always preserve other fields in opencode.json (model, auth, etc.)
- If opencode.json doesn't exist, create it with just the plugin field
`
