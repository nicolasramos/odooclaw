---
name: skill-creator
description: Create or update AgentSkills. Use when designing, structuring, or packaging skills with scripts, references, and assets.
---

# Skill Creator

This skill provides guidance for creating effective skills.

## About Skills

Skills are modular, self-contained packages that extend the agent's capabilities by providing
specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific
domains or tasks—they transform the agent from a general-purpose agent into a specialized agent
equipped with procedural knowledge that no model can fully possess.

### What Skills Provide

1. Specialized workflows - Multi-step procedures for specific domains
2. Tool integrations - Instructions for working with specific file formats or APIs
3. Domain expertise - Company-specific knowledge, schemas, business logic
4. Bundled resources - Scripts, references, and assets for complex and repetitive tasks

## Core Principles

### Concise is Key

The context window is a public good. Skills share the context window with everything else the agent needs: system prompt, conversation history, other Skills' metadata, and the actual user request.

**Default assumption: the agent is already very smart.** Only add context the agent doesn't already have. Challenge each piece of information: "Does the agent really need this explanation?" and "Does this paragraph justify its token cost?"

Prefer concise examples over verbose explanations.

### Set Appropriate Degrees of Freedom

Match the level of specificity to the task's fragility and variability:

**High freedom (text-based instructions)**: Use when multiple approaches are valid, decisions depend on context, or heuristics guide the approach.

**Medium freedom (pseudocode or scripts with parameters)**: Use when a preferred pattern exists, some variation is acceptable, or configuration affects behavior.

**Low freedom (specific scripts, few parameters)**: Use when operations are fragile and error-prone, consistency is critical, or a specific sequence must be followed.

Think of the agent as exploring a path: a narrow bridge with cliffs needs specific guardrails (low freedom), while an open field allows many routes (high freedom).

### Anatomy of a Skill

Every skill consists of a required SKILL.md file and optional bundled resources:

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code (Python/Bash/etc.)
    ├── references/       - Documentation intended to be loaded into context as needed
    └── assets/           - Files used in output (templates, icons, fonts, etc.)
```

#### SKILL.md (required)

Every SKILL.md consists of:

- **Frontmatter** (YAML): Contains `name` and `description` fields. These are the only fields that the agent reads to determine when the skill gets used, thus it is very important to be clear and comprehensive in describing what the skill is, and when it should be used.
- **Body** (Markdown): Instructions and guidance for using the skill. Only loaded AFTER the skill triggers (if at all).

#### Bundled Resources (optional)

Bundled resources keep SKILL.md lean and are loaded only when needed:

- **scripts/** - Executable code for tasks that require deterministic reliability or are repeatedly rewritten. Test scripts by actually running them before shipping.
- **references/** - Documentation loaded into context as needed (schemas, API docs, domain knowledge, detailed workflow guides). Keep one level deep from SKILL.md.
- **assets/** - Files used within the output the agent produces (templates, images, icons, fonts).

Move variant-specific details, detailed schemas, and worked examples into these files; keep only essential procedural instructions and workflow guidance in SKILL.md. This keeps SKILL.md lean while making information discoverable without hogging the context window.

#### What to Not Include in a Skill

A skill should only contain essential files that directly support its functionality. Do NOT create extraneous documentation or auxiliary files, including:

- README.md
- INSTALLATION_GUIDE.md
- QUICK_REFERENCE.md
- CHANGELOG.md
- etc.

The skill should only contain the information needed for an AI agent to do the job at hand. It should not contain auxiliary context about the process that went into creating it, setup and testing procedures, user-facing documentation, etc. Creating additional documentation files just adds clutter and confusion.

### Progressive Disclosure Design Principle

Skills use a three-level loading system to manage context efficiently:

1. **Metadata (name + description)** - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words)
3. **Bundled resources** - As needed by the agent (Unlimited because scripts can be executed without reading into context window)

Keep SKILL.md body to the essentials and under 500 lines to minimize context bloat. Split content into separate files when approaching this limit. When splitting out content into other files, reference them from SKILL.md and describe clearly when to read them, so the reader knows they exist and when to use them.

#### Progressive Disclosure Patterns

**Pattern 1: High-level guide with references.** Keep only the core workflow and selection guidance in SKILL.md; move variant-specific details, patterns, and examples into a reference file. See `references/pdf-processing.md` for a full worked example of this pattern.

**Pattern 2: Domain-specific or variant organization.** For skills with multiple domains, frameworks, or options, organize content by domain/variant so the reader loads only what they need. See `references/domain-organization.md` for directory-layout examples.

**Pattern 3: Conditional details.** Show basic content in SKILL.md and link to advanced-content files. See `references/docx-processing.md` for a worked example.

**Important guidelines:**

- **Avoid deeply nested references** - Keep references one level deep from SKILL.md. All reference files should link directly from SKILL.md as `references/<file>.md`.
- **Structure longer reference files** - For files longer than 100 lines, include a table of contents at the top so the agent can see the full scope when previewing.

## Skill Creation Process

Skill creation involves these steps, in order (skip only when a clear reason makes one not applicable):

1. Understand the skill with concrete examples
2. Plan reusable skill contents (scripts, references, assets)
3. Initialize the skill (run `init_skill.py`)
4. Edit the skill (implement resources and write SKILL.md)
5. Package the skill (run `package_skill.py`)
6. Iterate based on real usage

See `references/skill-process.md` for the detailed walkthrough of each step, including how to write conforming frontmatter and how packaging validates the skill.

### Skill Naming

- Use lowercase letters, digits, and hyphens only; normalize user-provided titles to hyphen-case (e.g., "Plan Mode" -> `plan-mode`).
- When generating names, generate a name under 64 characters (letters, digits, hyphens).
- Prefer short, verb-led phrases that describe the action.
- Namespace by tool when it improves clarity or triggering (e.g., `gh-address-comments`, `linear-address-issue`).
- Name the skill folder exactly after the skill name.

### Frontmatter

Write a conforming YAML frontmatter. The validator reads exactly these fields:

- `name` (required): 1-64 characters, `[a-z0-9-]`, no leading/trailing hyphen and no `--`, and it must match the skill directory name.
- `description` (required): 1-1024 characters. A `>-` multiline folded scalar is accepted and read in full.
- `license`, `compatibility`, `metadata` (a string→string map with namespaced keys) are optional and allowed. Six canonical skills already ship `metadata` (with `homepage` moved into it); some also serialize nested values as JSON strings.
- `allowed-tools` is not used (experimental).

A skill with no frontmatter has no description and is rejected, so a missing or empty `description` fails validation.
