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

## Acceptance Criteria checklist

- **Mandatory during implementation:** keep the assigned Task's `## Acceptance Criteria` checklist in its GitHub Issue body up to date. As soon as a criterion is implemented **and actually verified**, change only its checkbox from `- [ ]` to `- [x]`.
- Judge each criterion separately using observable code changes, successful existing build/type-check commands, or the manual/runtime verification appropriate to that criterion. Never check a box based solely on intent, assumption, or an unperformed check. Do not add automated tests just to justify a checkbox.
- Edit **only checkboxes in the assigned Task's Acceptance Criteria section**. Preserve criterion wording, every other section of the Issue body, and all other Issues. Never tick checkboxes on parent Stories, Features, or Epics.
- Since GitHub checkbox edits update the Issue body, fetch its latest content before each edit; preserve all unrelated edits and avoid overwriting concurrent changes. Prefer a precise body edit using `gh issue view <number> --repo okrupenych/coloring-engine --json body` and `gh issue edit <number> --repo okrupenych/coloring-engine --body-file <file>`, or an equivalent safe method.
- If a criterion cannot be verified or is not satisfied, leave it unchecked and clearly explain why in the handoff. Do not report all criteria as complete or move the Task to `In review` while known requirements remain unfulfilled; report the blocker and await direction instead.
- Before opening the PR and publishing the final Issue report, re-read the Task to confirm that its checklist accurately reflects the implemented and verified work.

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
- After finishing the requested implementation and required checks, **first publish a brief implementation report as a comment on the assigned Task's GitHub Issue**, then move **only that Task** to `In review`. Keep its Story, Feature, and Epic at `In progress`: one reviewed Task does not make its parents ready for review. Parent review/completion transitions require separate user direction.
- Treat Project status updates as required workflow actions. If a status change fails or the necessary project permissions are missing, report the failure explicitly; never claim the status was updated.
- These are **GitHub Project status fields**, not GitHub Issue open/closed states.
- **Never set `Done` or close an Issue without explicit user approval.** Never mark your own work as accepted.
- Use `gh project item-list` and `gh project field-list` (JSON output) to discover the project item ID, Status field ID, and option ID before using `gh project item-edit`. Do not assume status can be changed using a URL or human-readable option name directly.
- **For each newly assigned Task, use a dedicated Git branch and GitHub Pull Request** (PR; never implement directly on `main`). Start from the latest `main` after confirming the working tree is clean. Use a descriptive branch name such as `task/30-replace-vite-starter`.
- Before committing, inspect `git status --short`, `git diff`, and the staged file list. Ensure every intended new file is tracked (not merely present locally), and exclude unrelated changes, build output, secrets, and generated artifacts. If unrelated/uncommitted user changes are present, stop and ask rather than deleting, overwriting, or mixing them.
- After implementation and verification, commit the Task changes on its branch, push that branch, and open one **ready-for-review Pull Request targeting `main`** using `gh pr create`. Include the Issue number in the PR title/body and summarize implementation and checks. Link with `Refs #<number>` or equivalent, not auto-closing keywords like `Closes` or `Fixes`.
- If the Task already has a PR from an earlier review cycle, update the existing branch/PR instead of creating a duplicate.
- **Never push directly to `main`, merge or close a PR, close a GitHub Issue, or set `Done` without explicit user approval.** Final merge, acceptance, and publication to `main` are controlled by the user.

## GitHub Issue implementation report

- **Mandatory handoff:** after pushing the Task branch and opening its Pull Request, and before moving the assigned Task to `In review`, post a **short, factual Markdown comment on that Task's GitHub Issue** using `gh issue comment <issue-number> --repo okrupenych/coloring-engine --body ...` (or `--body-file`). Include the Pull Request URL.
- Use the following compact structure (normally 5–10 lines total):
  - **Implemented:** key changes, including important files or modules.
  - **Verification:** the exact type-check/build/manual checks actually performed, with their results; clearly identify anything not checked.
  - **Review notes:** any limitations, deviations, blockers, or known issues; write "None" if none.
  - **Pull Request:** the full clickable URL of the PR created for this Task (mandatory; do not substitute a branch name or PR number).
- Do not add a long log dump, reproduce the entire Issue description, claim tests were written or run when they were not, or disclose secrets.
- Check for an existing equivalent handoff comment before retrying a failed submission; do not publish duplicate reports.
- Post the comment **only once the work is ready for human review**, not at task start. A successful comment is a prerequisite for moving the Task to `In review`.
- If the Pull Request cannot be created or the Issue comment cannot be posted, do not mark the Task `In review`: report the failure and leave the Task `In progress` for manual resolution. Never close the Issue or set `Done`.

## Completion report

Summarize in the Codex chat: (1) what changed and where, (2) architectural decisions, (3) commands/checks actually run and their outcomes, (4) any unresolved issues or deviations, (5) a separate **Pull Request:** line with the full clickable PR URL, (6) the GitHub Issue comment link or posting failure, and (7) the final GitHub Project status. Stop and await review instead of starting another Task.
