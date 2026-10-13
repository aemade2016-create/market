---
name: workflow-to-skill
description: "Use when: a team or individual is repeating a multi-step process, debugging workflow, review checklist, or implementation pattern and you want to package it into a reusable SKILL.md."
---

# Workflow to Skill

## Purpose

Turn a repeatable process into a reusable skill that can be invoked on demand and followed consistently. This is best for workflows that are multi-step, include decisions, and need a clear quality bar before completion.

## Inputs to Capture

Before writing the skill, identify:
- the actual workflow or process being repeated
- the intended outcome of the workflow
- the step-by-step sequence
- decision points or branching conditions
- completion checks or quality gates
- whether the skill is for this workspace or for the user's personal profile

## Creation Workflow

1. Extract the real process from the conversation, repo, or existing task history.
2. Generalize it into reusable instructions rather than one-off task details.
3. Identify decisions and branch points.
4. Define the expected deliverable or final state.
5. Write the skill in the correct location for its scope.
6. Validate the skill against the completion checklist.
7. Summarize how to use it and suggest follow-up customizations.

## Decision Rules

Use this skill when the content is:
- a multi-step workflow or checklist
- a debugging or review methodology
- a repeatable implementation pattern
- a process that benefits from reusable instructions, not a single prompt

Avoid this skill when the task is:
- a single one-off request
- best handled as a prompt with input parameters
- broader than a specific workflow and should be project-wide guidance instead of a skill
- a request that needs isolated tool access or different agent restrictions, which may fit a custom agent better

## Skill Structure

A strong skill should include:
- a clear purpose or mission statement
- the workflow steps in order
- the decision points and branching logic
- completion checks or quality criteria
- the expected output or artifact
- examples of useful prompts for invoking the skill

## Required Quality Checks

Before finalizing, confirm that the skill:
- clearly states the task outcome
- includes a step-by-step process
- captures important decision branches
- names the completion criteria explicitly
- is saved in the correct location for workspace or personal scope
- includes a useful description that helps the agent discover it
- is not overly broad or vague

## Workspace vs Personal Scope

Choose the location based on the intended reuse:
- Workspace-scoped: use a shared folder such as `.github/skills/<skill-name>/`
- Personal-scoped: place it under the user prompt customization folder for cross-workspace reuse

## Final Output

The finished skill should be a reusable `SKILL.md` that can be invoked as an on-demand workflow guide and reused across similar tasks without re-explaining the process each time.

## Example Prompts

- "Turn this debugging workflow into a reusable skill."
- "Package our QA checklist into a SKILL.md for this workspace."
- "Convert this review process into a skill with decision points and completion checks."
- "Create a reusable workflow skill for onboarding and validation steps."

## Related Customizations to Consider Next

- a project-wide instruction file for always-on conventions
- a focused prompt for one-off tasks that need parameters
- a custom agent for stricter context isolation or tool restrictions
- a hook for validation or formatting checks before completion
