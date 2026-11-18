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
- Do not modify unrelated issues, issue dependency relationships, project settings, or task requirements without explicit permission. The only pre-authorized ancestor Issue edits are Acceptance Criteria checkbox updates and Project Status transitions defined in the hierarchical completion workflow below.
- Do not create speculative placeholder modules or implement features intended for later Tasks.
- Keep changes small and reviewable. Report any necessary deviation from the issue rather than treating it as implicit authorization.

## Commit and Pull Request naming

- **Use Conventional Commits** for all task implementation commits. Format: `<type>(<scope>): <imperative description> (#<task-number>)`. Write in English, with a concise, meaningful subject (preferably <= 72 characters).
- Choose the most accurate type for the change: `feat` (new functionality), `fix` (bug fix), `refactor` (behavior-preserving restructuring), `docs` (documentation), or `chore` (maintenance). Other established Conventional Commit types may be used when they better describe the actual change.
- Choose a clear scope corresponding to the affected module, such as `playground` or `engine`. Describe the **actual changes**, not just the Issue title. Use an imperative description, e.g. `feat(playground): adapt workspace layout for mobile (#32)`.
- Prefer one cohesive commit for one small Task. Use multiple commits only when they represent meaningful, independently reviewable changes; do not create artificial commits just to separate file types. All task commits must remain within the assigned scope.
- **Apply the same naming convention to Pull Request titles**: `<type>(<scope>): <imperative description> (#<task-number>)`. Example: `feat(playground): adapt workspace layout for mobile (#32)`.
- Preserve the explicit `Refs #<task-number>` link in the PR body; the title alone is not a substitute. Do not use `Closes` or `Fixes` because acceptance and Issue closure are human-controlled.
- Do not rewrite or amend commits that have already been shared, merged, or are under review merely to retrofit this convention. Apply it prospectively from the next Task for which the instructions were loaded.

## Acceptance Criteria checklist

- **Mandatory during implementation:** keep the assigned Task's `## Acceptance Criteria` checklist in its GitHub Issue body up to date. As soon as a criterion is implemented **and actually verified**, change only its checkbox from `- [ ]` to `- [x]`.
- Judge each criterion separately using observable code changes, successful existing build/type-check commands, or the manual/runtime verification appropriate to that criterion. Never check a box based solely on intent, assumption, or an unperformed check. Do not add automated tests just to justify a checkbox.
- For the assigned Task, edit **only its Acceptance Criteria checkboxes**. Preserve criterion wording and every other section of the Issue body. Ancestor Story, Feature, and Epic checkboxes may be edited **only** through the last-child completion audit defined below; do not alter other content or unrelated Issues.
- Since GitHub checkbox edits update the Issue body, fetch its latest content before each edit; preserve all unrelated edits and avoid overwriting concurrent changes. Prefer a precise body edit using `gh issue view <number> --repo okrupenych/coloring-engine --json body` and `gh issue edit <number> --repo okrupenych/coloring-engine --body-file <file>`, or an equivalent safe method.
- If a criterion cannot be verified or is not satisfied, leave it unchecked and clearly explain why in the handoff. Do not report all criteria as complete or move the Task to `In review` while known requirements remain unfulfilled; report the blocker and await direction instead.
- Before opening the PR and publishing the final Issue report, re-read the Task to confirm that its checklist accurately reflects the implemented and verified work.

## Hierarchical Acceptance Criteria audit (last child at any level)

- **Mandatory cascade:** when the assigned Task is the last child becoming ready for review within its parent Story, review that Story's `## Acceptance Criteria`. If all of that Story's sibling Stories are also completed or ready for review, continue to its Feature; similarly, continue to the Epic when eligible. Apply this recursively: **Task → Story → Feature → Epic**.
- Determine actual direct children and their GitHub Project statuses from parent/sub-issue relationships. An ancestor is eligible for completion review only when each direct child is either `In review` (implementation delivered, awaiting human acceptance) or `Done` (accepted), and the assigned Task is the child whose completion makes that condition true. The current Task may be treated as pending `In review` during its handoff audit, but do not assert that its status changed until the update succeeds.
- Audit **every Acceptance Criterion** of each eligible Story/Feature/Epic using evidence from child Issues, accepted/merged work, and the current Task PR. Tick only criteria demonstrably implemented **and verified**. Explicitly distinguish `In review` / unmerged work from `Done` / accepted work; ticking boxes is not human approval.
- If a criterion has no coverage in the completed child work, or has been implemented but not verified, leave it unchecked and **report the gap**: ancestor Issue number, precise criterion, and the child work examined. Distinguish missing planned coverage, missing verification, and pending human acceptance. Never expand the assigned Task or invent extra tests to fill a gap.
- Edit only the checkboxes in the `## Acceptance Criteria` section of eligible ancestors; re-fetch each Issue body before updating and preserve all other content. Post a concise gap report on the affected ancestor Issue without duplicate comments.
- Include a concise **Parent criteria audit** in the assigned Task's Issue comment and Codex chat report, listing each ancestor audited, checked/unchecked criteria, gaps, and whether it qualifies for `In review`. If none is eligible, say so.
- The audit alone **does not** change an ancestor's status. The status transition occurs in the completion workflow below **after** the Task has actually moved to `In review`, and only if all direct children are `In review` or `Done` **and all the ancestor's Acceptance Criteria are checked and verified**. Continue that same eligibility check recursively upwards.
- If either the child-status condition or any Acceptance Criterion is incomplete, leave the ancestor `In progress` and report why. Never move parents to `Done` or close their Issues; only the user accepts and closes work.

## Verification policy

- **Do not create automated tests, test scaffolding, test frameworks, or new test infrastructure unless explicitly requested.** A plausible benefit alone is not a reason to introduce them.
- Use the existing TypeScript type-check/build commands and the manual or runtime verification required by the Task.
- Do not change production behavior simply to satisfy a self-created test.
- Report what was actually verified and what remains unverified; never claim checks passed without running them.

## GitHub Project status and authority

- Project: `okrupenych` / `Coloring Engine` (project number 1). All status changes refer to the **GitHub Project Status** field, not the GitHub Issue open/closed state.
- **On work start:** move the assigned Task and each ancestor (Story, Feature, Epic) from `Backlog` or `Ready` to `In progress`. Leave ancestors already `In progress` unchanged; never move `In review` or `Done` backward. Report any inconsistent pre-existing state.
- **On completion of the assigned Task:** only after implementation, actual verification, every Task Acceptance Criterion checked, successful PR creation, and publication of its Issue handoff comment, move the Task from `In progress` to `In review`. If these prerequisites fail, keep it `In progress` and explain what is missing.
- **On completion of an entire Story/Feature/Epic:** after the Task is actually `In review`, evaluate each ancestor in order. Move an ancestor from `In progress` to `In review` automatically **only if** (1) **100% of its direct child Issues** are `In review` or `Done`, and (2) **100% of its own Acceptance Criteria** are checked based on actual implementation and verification. Both conditions are mandatory. Repeat recursively to the next ancestor only if the current level qualifies.
- `In review` means implementation is complete **and awaiting human acceptance**, not approved or merged. A child in `In review` can count as implementation-ready, but must never be misrepresented as accepted. If any child is still `Backlog`, `Ready`, or `In progress`, or any criterion is unchecked/unverified, the parent remains `In progress`. Report the exact gap.
- Status updates for the assigned Task and its ancestors, and the eligible ancestor Acceptance Criteria checkbox edits, are the **only pre-authorized modifications of parent Issues**. Do not modify Issue titles, requirements, dependency links, or unrelated Issues without explicit permission.
- **Never set `Done`, close an Issue, or merge/close a PR without explicit user approval.** Final acceptance remains with the user, at every hierarchy level.
- Discover actual project item IDs, Status field ID, and option IDs via `gh project item-list` and `gh project field-list` (JSON) before using `gh project item-edit`. Do not assume status can be updated directly by human-readable status name or Issue URL.
- Treat status synchronization as required. If updating Project status fails, disclose the failure and the actual state; do not claim success. Keep already-delivered code and PR intact rather than retrying unsafely.
- **For each newly assigned Task, use a dedicated Git branch and GitHub Pull Request** (PR; never implement directly on `main`). Start from the latest `main` after confirming the working tree is clean. Use a descriptive branch name such as `task/30-replace-vite-starter`.
- Before committing, inspect `git status --short`, `git diff`, and the staged file list. Ensure every intended new file is tracked (not merely present locally), and exclude unrelated changes, build output, secrets, and generated artifacts. If unrelated/uncommitted user changes are present, stop and ask rather than deleting, overwriting, or mixing them.
- After implementation and verification, commit the Task changes on its branch, push that branch, and open one **ready-for-review Pull Request targeting `main`** using `gh pr create`. Follow the **Commit and Pull Request naming** rules above; summarize implementation and checks in the PR body and link with `Refs #<number>`, not auto-closing keywords.
- If the Task already has a PR from an earlier review cycle, update the existing branch/PR instead of creating a duplicate.
- **Never push directly to `main`**. Final merge, acceptance, and publication to `main` are controlled by the user.

## GitHub Issue implementation report

- **Mandatory handoff:** after pushing the Task branch, opening its Pull Request, and auditing eligible parent criteria, post a **short, factual Markdown comment on the assigned Task's GitHub Issue** before transitioning statuses. After posting, move the Task to `In review`, then move each qualifying parent from `In progress` to `In review` according to the two 100%-completion conditions above. Use `gh issue comment <issue-number> --repo okrupenych/coloring-engine --body ...` (or `--body-file`). Include the Pull Request URL.
- Use the following compact structure (normally 5–10 lines total):
  - **Implemented:** key changes, including important files or modules.
  - **Verification:** the exact type-check/build/manual checks actually performed, with their results; clearly identify anything not checked.
  - **Review notes:** any limitations, deviations, blockers, or known issues; write "None" if none.
  - **Parent criteria audit:** for any eligible Story, Feature, or Epic, the criteria verified and checked and any uncovered/unverified criteria, or "Not applicable" if no ancestor is eligible.
  - **Pull Request:** the full clickable URL of the PR created for this Task (mandatory; do not substitute a branch name or PR number).
- Do not add a long log dump, reproduce the entire Issue description, claim tests were written or run when they were not, or disclose secrets.
- Check for an existing equivalent handoff comment before retrying a failed submission; do not publish duplicate reports.
- Post the comment **only once the work is ready for human review**, not at task start. A successful comment is a prerequisite for moving the Task to `In review`.
- If the Pull Request cannot be created or the Issue comment cannot be posted, do not mark the Task `In review`: report the failure and leave the Task `In progress` for manual resolution. Never close the Issue or set `Done`.

## Completion report

Summarize in the Codex chat: (1) what changed and where, (2) architectural decisions, (3) commands/checks actually run and their outcomes, (4) any unresolved issues or deviations, (5) a separate **Pull Request:** line with the full clickable PR URL, (6) the GitHub Issue comment link or posting failure, and (7) the final GitHub Project status. Stop and await review instead of starting another Task.
