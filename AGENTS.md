# Codex Working Instructions — Coloring Engine

## Project boundaries

- Coloring Engine is intended to be a reusable, framework-independent TypeScript coloring library.
- The Development Playground is a consumer and development host for the engine, **not** the engine itself. Do not couple engine contracts or future engine code to Playground UI.
- The engine and the Ell Lune website are separate projects. Do not change the website from this repository.
- Prefer modular, cohesive responsibilities, narrow interfaces, and straightforward implementations. Avoid speculative architecture, global mutable state, unnecessary dependencies, and unrelated refactors.
- Respect the existing Vite/TypeScript setup unless the assigned issue specifically requires changing it.

## Issue-driven workflow

- Work on **exactly one explicitly assigned GitHub Task per run**. Do not autonomously select or start other Tasks.
- Read the assigned Task and its parent Story, Feature, and Epic for context. Follow the Task's Objective, Implementation Requirements, Constraints, Acceptance Criteria, and Deliverables.
- Check the Task's actual GitHub `Blocked by` dependencies before starting. Treat the registered dependency graph as authoritative for scheduling; the issue description should match it. If a blocker is unfinished or the requirements conflict, report the problem rather than silently expanding the scope.
- Do not modify unrelated issues, issue dependency relationships, project settings, or task requirements without explicit permission.
- Do not create speculative placeholder modules or implement features intended for later Tasks.
- Keep changes small and reviewable. Report any necessary deviation from the issue rather than treating it as implicit authorization.

## Verification policy

- **Do not create automated tests, test scaffolding, test frameworks, or new test infrastructure unless explicitly requested.** A plausible benefit alone is not a reason to introduce them.
- Use the existing TypeScript type-check/build commands and the manual or runtime verification required by the Task.
- Do not change production behavior simply to satisfy a self-created test.
- Report what was actually verified and what remains unverified; never claim checks passed without running them.

## GitHub Project status and authority

- Project: `okrupenych` / `Coloring Engine` (project number 1).
- **Mandatory status synchronization when beginning a Task:** set the assigned Task **and each of its ancestors (parent Story, Feature, and Epic)** to GitHub Project Status `In progress`. This is the only permitted exception to the rule against modifying unrelated issues: change **only the Project Status field** of those exact ancestors.
- For the assigned Task, transition `Backlog` or `Ready` → `In progress` before implementation. For its parent Story, Feature, and Epic, transition `Backlog` or `Ready` → `In progress` as well; leave any ancestor already `In progress` unchanged.
- Never automatically move an ancestor backwards from `In review` or `Done`. If an ancestor is already in either state when new work starts, stop the status update for that ancestor and report the inconsistency for user review.
- After implementation and the required checks, move **only the assigned Task** to `In review` and prepare a clear handoff summary. Keep its Story, Feature, and Epic at `In progress`: a single completed Task does not mean its parent is ready for review. Parent review/completion transitions require separate user direction.
- Treat Project status updates as required workflow actions. If a status change fails or the necessary project permissions are missing, report the failure explicitly; never claim the status was updated.
- These are **GitHub Project status fields**, not GitHub Issue open/closed states.
- **Never set `Done` or close an Issue without explicit user approval.** Never mark your own work as accepted.
- Use `gh project item-list` and `gh project field-list` (JSON output) to discover the project item ID, Status field ID, and option ID before using `gh project item-edit`. Do not assume status can be changed using a URL or human-readable option name directly.
- Do not commit, push, merge, or create pull requests unless specifically instructed. The user controls final review and publication.

## Completion report

Summarize: (1) what changed and where, (2) architectural decisions, (3) commands/checks actually run and their outcomes, (4) any unresolved issues or deviations, and (5) the final GitHub Project status. Stop and await review instead of starting another Task.
