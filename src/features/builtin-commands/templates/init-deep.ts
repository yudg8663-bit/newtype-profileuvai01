export const INIT_DEEP_TEMPLATE = `# /init-deep

Generate hierarchical AGENTS.md files. Root + complexity-scored subdirectories.

## Usage

\`\`\`
/init-deep                      # Update mode: modify existing + create new where warranted
/init-deep --create-new         # Read existing → remove all → regenerate from scratch
/init-deep --max-depth=2        # Limit directory depth (default: 3)
\`\`\`

---

## Workflow (High-Level)

1. **Discovery + Analysis** (concurrent)
   - Delegate to Deputy for codebase exploration
   - Main session: bash structure + LSP codemap + read existing AGENTS.md
2. **Score & Decide** - Determine AGENTS.md locations from merged findings
3. **Generate** - Root first, then subdirs in parallel
4. **Review** - Deduplicate, trim, validate

<critical>
**TodoWrite ALL phases. Mark in_progress → completed in real-time.**
\`\`\`
TodoWrite([
  { id: "discovery", content: "Delegate to Deputy for exploration + LSP codemap + read existing", status: "pending", priority: "high" },
  { id: "scoring", content: "Score directories, determine locations", status: "pending", priority: "high" },
  { id: "generate", content: "Generate AGENTS.md files (root + subdirs)", status: "pending", priority: "high" },
  { id: "review", content: "Deduplicate, validate, trim", status: "pending", priority: "medium" }
])
\`\`\`
</critical>

---

## Phase 1: Discovery + Analysis (Concurrent)

**Mark "discovery" as in_progress.**

### Delegate Exploration to Deputy

Delegate comprehensive codebase analysis to Deputy:

\`\`\`
chief_task(
  subagent_type="deputy",
  prompt="Analyze codebase for AGENTS.md generation. Research:
  1. Project structure: standard patterns vs deviations
  2. Entry points: main files and non-standard organization
  3. Conventions: config files (.eslintrc, pyproject.toml, .editorconfig)
  4. Anti-patterns: 'DO NOT', 'NEVER', 'ALWAYS', 'DEPRECATED' comments
  5. Build/CI: .github/workflows, Makefile patterns
  6. Test patterns: test configs and structure
  
  Return structured findings for documentation generation.",
  run_in_background=true,
  skills=[]
)
\`\`\`

<dynamic-analysis>
**DYNAMIC DEPTH**: For large projects, Deputy will automatically dispatch multiple researcher tasks:

| Factor | Threshold | Deputy Action |
|--------|-----------|---------------|
| **Total files** | >100 | More thorough file analysis |
| **Directory depth** | ≥4 | Deep module exploration |
| **Large files (>500 lines)** | >10 files | Complexity hotspot analysis |
| **Monorepo** | detected | Per-package analysis |

\`\`\`bash
# Measure project scale first (optional - Deputy will assess)
total_files=$(find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' | wc -l)
max_depth=$(find . -type d -not -path '*/node_modules/*' -not -path '*/.git/*' | awk -F/ '{print NF}' | sort -rn | head -1)
\`\`\`

For very large projects, send additional Deputy tasks:
\`\`\`
chief_task(
  subagent_type="deputy",
  prompt="Deep analysis for large codebase: Find files >500 lines, complexity hotspots, cross-cutting concerns.",
  run_in_background=true,
  skills=[]
)
\`\`\`
</dynamic-analysis>

### Main Session: Concurrent Analysis

**While background agents run**, main session does:

#### 1. Bash Structural Analysis
\`\`\`bash
# Directory depth + file counts
find . -type d -not -path '*/\\.*' -not -path '*/node_modules/*' -not -path '*/venv/*' -not -path '*/dist/*' -not -path '*/build/*' | awk -F/ '{print NF-1}' | sort -n | uniq -c

# Files per directory (top 30)
find . -type f -not -path '*/\\.*' -not -path '*/node_modules/*' | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn | head -30

# Code concentration by extension
find . -type f \\( -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.go" -o -name "*.rs" \\) -not -path '*/node_modules/*' | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn | head -20

# Existing AGENTS.md / CLAUDE.md
find . -type f \\( -name "AGENTS.md" -o -name "CLAUDE.md" \\) -not -path '*/node_modules/*' 2>/dev/null
\`\`\`

#### 2. Read Existing AGENTS.md
\`\`\`
For each existing file found:
  Read(filePath=file)
  Extract: key insights, conventions, anti-patterns
  Store in EXISTING_AGENTS map
\`\`\`

If \`--create-new\`: Read all existing first (preserve context) → then delete all → regenerate.

#### 3. LSP Codemap (if available)
\`\`\`
lsp_servers()  # Check availability

# Entry points (parallel)
lsp_document_symbols(filePath="src/index.ts")
lsp_document_symbols(filePath="main.py")

# Key symbols (parallel)
lsp_workspace_symbols(filePath=".", query="class")
lsp_workspace_symbols(filePath=".", query="interface")
lsp_workspace_symbols(filePath=".", query="function")

# Centrality for top exports
lsp_find_references(filePath="...", line=X, character=Y)
\`\`\`

**LSP Fallback**: If unavailable, rely on Deputy + AST-grep.

### Collect Background Results

\`\`\`
// After main session analysis done, collect all task results
for each task_id: background_output(task_id="...")
\`\`\`

**Merge: bash + LSP + existing + Deputy findings. Mark "discovery" as completed.**

---

## Phase 2: Scoring & Location Decision

**Mark "scoring" as in_progress.**

### Scoring Matrix

| Factor | Weight | High Threshold | Source |
|--------|--------|----------------|--------|
| File count | 3x | >20 | bash |
| Subdir count | 2x | >5 | bash |
| Code ratio | 2x | >70% | bash |
| Unique patterns | 1x | Has own config | Deputy |
| Module boundary | 2x | Has index.ts/__init__.py | bash |
| Symbol density | 2x | >30 symbols | LSP |
| Export count | 2x | >10 exports | LSP |
| Reference centrality | 3x | >20 refs | LSP |

### Decision Rules

| Score | Action |
|-------|--------|
| **Root (.)** | ALWAYS create |
| **>15** | Create AGENTS.md |
| **8-15** | Create if distinct domain |
| **<8** | Skip (parent covers) |

### Output
\`\`\`
AGENTS_LOCATIONS = [
  { path: ".", type: "root" },
  { path: "src/hooks", score: 18, reason: "high complexity" },
  { path: "src/api", score: 12, reason: "distinct domain" }
]
\`\`\`

**Mark "scoring" as completed.**

---

## Phase 3: Generate AGENTS.md

**Mark "generate" as in_progress.**

### Root AGENTS.md (Full Treatment)

\`\`\`markdown
# PROJECT KNOWLEDGE BASE

**Generated:** {TIMESTAMP}
**Commit:** {SHORT_SHA}
**Branch:** {BRANCH}

## OVERVIEW
{1-2 sentences: what + core stack}

## STRUCTURE
\\\`\\\`\\\`
{root}/
├── {dir}/    # {non-obvious purpose only}
└── {entry}
\\\`\\\`\\\`

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|

## CODE MAP
{From LSP - skip if unavailable or project <10 files}

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|

## CONVENTIONS
{ONLY deviations from standard}

## ANTI-PATTERNS (THIS PROJECT)
{Explicitly forbidden here}

## UNIQUE STYLES
{Project-specific}

## COMMANDS
\\\`\\\`\\\`bash
{dev/test/build}
\\\`\\\`\\\`

## NOTES
{Gotchas}
\`\`\`

**Quality gates**: 50-150 lines, no generic advice, no obvious info.

### Subdirectory AGENTS.md (Parallel)

Launch document-writer agents for each location:

\`\`\`
for loc in AGENTS_LOCATIONS (except root):
  sisyphus_task(agent="document-writer", prompt=\\\`
    Generate AGENTS.md for: \${loc.path}
    - Reason: \${loc.reason}
    - 30-80 lines max
    - NEVER repeat parent content
    - Sections: OVERVIEW (1 line), STRUCTURE (if >5 subdirs), WHERE TO LOOK, CONVENTIONS (if different), ANTI-PATTERNS
  \\\`)
\`\`\`

**Wait for all. Mark "generate" as completed.**

---

## Phase 4: Review & Deduplicate

**Mark "review" as in_progress.**

For each generated file:
- Remove generic advice
- Remove parent duplicates
- Trim to size limits
- Verify telegraphic style

**Mark "review" as completed.**

---

## Final Report

\`\`\`
=== init-deep Complete ===

Mode: {update | create-new}

Files:
  ✓ ./AGENTS.md (root, {N} lines)
  ✓ ./src/hooks/AGENTS.md ({N} lines)

Dirs Analyzed: {N}
AGENTS.md Created: {N}
AGENTS.md Updated: {N}

Hierarchy:
  ./AGENTS.md
  └── src/hooks/AGENTS.md
\`\`\`

---

## Anti-Patterns

- **Static approach**: MUST adapt depth of analysis based on project size
- **Sequential execution**: MUST parallel (Deputy + LSP concurrent)
- **Ignoring existing**: ALWAYS read existing first, even with --create-new
- **Over-documenting**: Not every dir needs AGENTS.md
- **Redundancy**: Child never repeats parent
- **Generic content**: Remove anything that applies to ALL projects
- **Verbose style**: Telegraphic or die`
