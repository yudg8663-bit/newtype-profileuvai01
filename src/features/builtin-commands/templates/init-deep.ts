export const INIT_DEEP_TEMPLATE = `# /init-deep

Generate a KNOWLEDGE.md file to help AI understand a document repository or knowledge base.

## Usage

\`\`\`
/init-deep                      # Analyze and generate/update KNOWLEDGE.md
/init-deep --create-new         # Delete existing and regenerate from scratch
/init-deep --max-depth=3        # Limit directory scan depth (default: 5)
\`\`\`

---

## What This Does

Scans a document repository (any structure) and generates a knowledge index that helps AI:
- Understand what content exists
- Know where to find specific types of documents
- Recognize the organizational pattern (even if non-standard)

---

## Workflow

<critical>
**TodoWrite ALL phases. Mark in_progress → completed in real-time.**
\`\`\`
TodoWrite([
  { id: "scan", content: "Scan directory structure and file types", status: "pending", priority: "high" },
  { id: "analyze", content: "Analyze content and extract summaries", status: "pending", priority: "high" },
  { id: "generate", content: "Generate KNOWLEDGE.md", status: "pending", priority: "high" },
  { id: "review", content: "Review and refine output", status: "pending", priority: "medium" }
])
\`\`\`
</critical>

---

## Phase 1: Directory Scan

**Mark "scan" as in_progress.**

### 1.1 Discover Structure

\`\`\`bash
# Get directory tree (exclude hidden, node_modules, etc.)
find . -type d -not -path '*/\\.*' -not -path '*/node_modules/*' -not -path '*/__pycache__/*' | head -100

# Count files by type
find . -type f -not -path '*/\\.*' | sed 's/.*\\.//' | sort | uniq -c | sort -rn | head -20

# List document files
find . -type f \\( -name "*.md" -o -name "*.pdf" -o -name "*.docx" -o -name "*.txt" -o -name "*.rtf" \\) -not -path '*/\\.*' | head -100

# List media files
find . -type f \\( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.svg" -o -name "*.mp4" -o -name "*.mp3" \\) -not -path '*/\\.*' | head -50

# Check for existing KNOWLEDGE.md or similar
find . -type f \\( -name "KNOWLEDGE.md" -o -name "README.md" -o -name "INDEX.md" \\) -not -path '*/\\.*'

# File count per directory (top 30)
find . -type f -not -path '*/\\.*' | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn | head -30
\`\`\`

### 1.2 Identify File Type Distribution

Build a mental model:
\`\`\`
CONTENT_PROFILE:
  documents: N (md, pdf, docx, txt)
  images: N (png, jpg, svg)
  data: N (json, csv, xlsx)
  code: N (if any - py, js, ts)
  other: N
  
STRUCTURE_TYPE:
  - flat (all files in root)
  - shallow (1-2 levels)
  - deep (3+ levels)
  - mixed
\`\`\`

**Mark "scan" as completed.**

---

## Phase 2: Content Analysis

**Mark "analyze" as in_progress.**

### 2.1 Read Key Documents

For each directory with documents:

\`\`\`
# Priority reading order:
1. README.md / INDEX.md (if exists)
2. Largest markdown files (likely main content)
3. Recently modified files
4. Files with descriptive names
\`\`\`

Use \`Read\` tool on markdown files to understand content.

### 2.2 Extract PDF/Document Summaries

For PDFs and other binary documents:
\`\`\`
Use look_at tool to extract:
- Title
- First page summary
- Key topics
\`\`\`

### 2.3 Infer Topics and Categories

From file names and content, extract:
- Main topics/themes
- Naming patterns
- Organizational logic (by date? by topic? by project?)

**Mark "analyze" as completed.**

---

## Phase 3: Generate KNOWLEDGE.md

**Mark "generate" as in_progress.**

### Output Template

\`\`\`markdown
# KNOWLEDGE BASE INDEX

**Generated:** {TIMESTAMP}
**Last Updated:** {DATE}
**Total Files:** {N} documents, {N} images, {N} other

---

## OVERVIEW

{1-3 sentences describing what this knowledge base contains and its purpose}

---

## STRUCTURE

\\\`\\\`\\\`
{directory}/
├── {folder1}/    # {what's in here}
│   └── ...
├── {folder2}/    # {what's in here}
└── {file.md}     # {brief description}
\\\`\\\`\\\`

---

## KEY DOCUMENTS

| File | Description | Topics |
|------|-------------|--------|
| {path} | {what it contains} | {tags} |
| ... | ... | ... |

---

## TOPICS & TAGS

- **{Topic 1}**: {related files or folders}
- **{Topic 2}**: {related files or folders}
- ...

---

## FOLDER GUIDE

| Folder | Purpose | File Count |
|--------|---------|------------|
| {path} | {what to find here} | {N} |
| ... | ... | ... |

---

## FILE TYPES

| Type | Count | Location |
|------|-------|----------|
| Markdown (.md) | {N} | {where they are} |
| PDF (.pdf) | {N} | {where they are} |
| Images | {N} | {where they are} |
| ... | ... | ... |

---

## NOTES

{Any discovered patterns, conventions, or important observations}
- {Naming convention if any}
- {Organization pattern}
- {Special files or folders}
\`\`\`

### Writing Guidelines

1. **Be specific** - Don't say "various documents", say what they actually are
2. **Be concise** - One line per item, no verbose descriptions
3. **Be accurate** - Only include what you actually found
4. **Be helpful** - Focus on what helps AI find relevant content

**Mark "generate" as completed.**

---

## Phase 4: Review

**Mark "review" as in_progress.**

1. Check KNOWLEDGE.md is not too long (50-200 lines ideal)
2. Remove any generic/unhelpful entries
3. Ensure all paths are correct
4. Verify descriptions are accurate

Write the final KNOWLEDGE.md to the repository root.

**Mark "review" as completed.**

---

## Final Report

\`\`\`
=== init-deep Complete ===

Repository: {path}
Files Analyzed: {N}
Folders Scanned: {N}

Generated: ./KNOWLEDGE.md ({N} lines)

Key Findings:
- {Main content type}
- {Organization pattern}
- {Notable files}
\`\`\`

---

## Anti-Patterns

- **Don't assume structure** - Every repository is different
- **Don't skip binary files** - PDFs often contain key content
- **Don't be verbose** - Keep entries concise
- **Don't list everything** - Focus on key/representative files
- **Don't ignore patterns** - Document any discovered conventions`
