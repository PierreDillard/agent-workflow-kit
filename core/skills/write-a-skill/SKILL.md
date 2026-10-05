---
name: write-a-skill
description: Creates and improves agent skills with focused instructions, progressive disclosure, useful resources, and validation. Use when the user requests a new skill or improvements to an existing skill's guidance, discovery, structure, or behavior.
---

# Writing Skills

Create guidance that changes an agent's decisions for a concrete task.
Assume the agent already knows general techniques; omit generic tutorials and repeated advice.

## Establish the need

- Reuse relevant skills, resources, project conventions, and decisions before adding anything.
- Identify the intended requests, desired result, boundaries, and one realistic success example.
- Ask only for missing information that affects the result; use context already supplied.
- Respect the user's location and scope. For an update, inspect the existing entrypoint, resources,
  and callers; keep its identity and unrelated behavior unless a change is requested.
- Choose instructions, deterministic scripts, references, or output assets according to actual need.
  A simple skill can consist of one SKILL.md.

## Draft or update

Use imperative instructions with concrete outcomes, decision criteria, and non-obvious constraints.
Match specificity to risk: flexible guidance for creative work, precise steps for fragile operations.
Distinguish mandatory requirements from examples and optional recommendations.
Do not turn a single failure, project choice, or preference into a universal rule.

For new skills, reuse a suitable initializer; inspect its output. Never reinitialize an existing skill.

### Identity and discovery

- Use a descriptive action-oriented name, lowercase letters, digits, and single hyphens, under
  64 characters. Match the folder name to it; preserve an existing name unless renaming is requested.
- Include name and description in YAML frontmatter; preserve supported optional fields.
- Keep description within 1024 characters: state the capability and specific triggers, using
  third-person wording and a clear "Use when..." clause. Add an exclusion only when it avoids misrouting.
- Name and description guide initial selection. The body is loaded when the skill applies;
  detailed procedures and examples belong there or in references.
- Keep the skill self-contained. Refer to another skill or tool only when its availability
  is established in the intended environment.

Example: a commit-message skill triggers for drafting/reviewing messages; it never authorizes committing.

### Structure and progressive disclosure

Aim for a concise entrypoint under 100 lines. Split substantial conditional detail when it improves
navigation; do not create files merely to follow a template or reach a size target.

- SKILL.md: shared purpose, essential constraints, workflow choices, and links.
- references/: schemas, provider details, procedures, and substantial examples needed conditionally.
  Explain when to read each reference; keep links one level deep and avoid loading all references.
- scripts/: repeated deterministic transformations or checks that improve reliability.
- assets/: templates, images, or starter files intended for the generated output.
- agents/openai.yaml: optional UI metadata and invocation policy, when supported by the target.

Keep each piece of information in one place. Preserve useful existing resource names and paths;
check callers before moving or removing them. Avoid unrelated READMEs, changelogs, empty directories,
duplicated guides, and unused example files.

Example: an AWS request loads references/aws.md without loading references/gcp.md.

### Scripts and metadata

Reuse helpers before adding scripts. Add a script for a repeated or fragile operation with explicit
inputs, outputs, failure behavior, and side effects. Inspect external code before executing it,
and obtain any required authorization. Run new or changed scripts in an isolated environment
with representative success and failure inputs; do not claim they work from source inspection alone.

Preserve existing UI, dependency, and invocation-policy fields when editing metadata.
A generator that replaces the entire file must not silently erase them.
Keep normal automatic discovery unless the user explicitly requests another invocation policy;
approval for an action does not imply an explicit-only skill.

## Review, approval, and activation

For kit-managed projects, follow [the approval procedure](references/kit-approval.md).
For a new skill, keep the draft outside agent discovery paths. Present the complete file set,
purpose, use cases, possible actions, prerequisites, and intended activation location to the user.
Obtain explicit approval of that exact package before installation or use; silence is not approval.
Changes to the package or activation target require renewed approval.
An approval for one skill does not authorize unrelated configuration, workflow rules, or publication.

For an explicitly requested update, edit the agreed existing skill directly.
Seek additional approval only for new scope or activation not covered by the request.
A draft, installed skill, tested skill, and reviewed skill are distinct states; report the actual one.

## Validate and improve

Use an available trusted validator for frontmatter, naming, and unfinished scaffolding.
If none exists, check these properties directly and state the narrower verification performed.
Check that references resolve, terminology is consistent, descriptions discriminate relevant
requests, and examples preserve user intent and authorization boundaries.
Verify unstable technical claims against current authoritative sources when needed.

For substantial behavioral changes, exercise realistic triggering and non-triggering requests,
including ambiguity, missing prerequisites, or failure where relevant. Evaluate outcomes,
not matching headings or wording. Use independent evaluation only when warranted and authorized.
Structural validation alone does not prove discovery or good decisions in a fresh agent session.
Record the checks actually performed and their limits. Iterate from observed failures or user
feedback with focused corrections rather than accumulating speculative rules.
