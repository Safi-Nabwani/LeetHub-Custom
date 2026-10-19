# Custom LeetHub — Clean Git History

> **Goal:** Preserve the existing solutions repository structure and LeetHub features. Publish each changed accepted solution in **one meaningful Git commit**, including the solution, needed problem description, root README/topic updates, and any applicable notes/stats updates. Identical repeat uploads produce no commit.

**Upstream:** https://github.com/arunbhardwaj/LeetHub-2.0  
**Status:** Phase 1 discovery complete. Acceptance check committed and tested. Revised batching requirements and optimizations documented; implementation and live browser verification are pending. Root README/topics and stats are retained. Check boxes only after verification.
**Execution:** Work incrementally. **Do not execute the entire roadmap at once.**

## Codex operating rules (apply to every session)

1. Read this roadmap and inspect the repository before making changes.
2. Work on **only the task ID(s) I explicitly assign**. If I do not specify any, begin with **T1.1 only**.
3. After each task, summarize what changed, evidence/tests, blockers, and the next recommended task. **Stop and wait for my next instruction.**
4. Keep this file updated: check completed tasks `[x]`, leave blocked or unverified tasks `[ ]`, and record findings in the progress log at the bottom.
5. Make **local Git commits only after explicit user approval**. Use no prefixes and capitalize the first letter of every word in commit messages. **Never push or force-push**, rewrite remote history, delete repositories, or modify old remote commits without explicit approval.
6. Never commit secrets or credentials. Preserve authentication, LeetCode Accepted detection, language/filename/folder resolution, GitHub connection, and problem-specific content.
7. Favor small, maintainable patches over rewrites. Check for dirty/untracked user changes before editing; don't discard them.
8. Do not claim a test passed unless it actually ran. If real-browser verification requires me, give precise manual steps and mark verification pending.
9. Do not clean existing LeetCode repository history in this project unless I approve a separate plan.
10. Continue work on `main` unless I explicitly request a different branch. Preserve the existing solutions repository layout and features; do not disable root README/topics or stats updates to reduce commit counts.

## Phase 1 — Repository discovery (no feature changes)

### T1.1 — Establish source and baseline
- [x] Inspect repository files, Git status, remotes, branch, and existing modifications.
- [x] Identify whether upstream LeetHub source is already present and determine version/commit where possible.
- [x] If missing, propose the safest import strategy **before importing**; preserve existing work and avoid overwriting files.
- [x] Locate package scripts, manifests, build directories, and Chromium extension entry points.

**Done when:** Codex reports repository state, upstream relationship, source location, and available commands. **Stop.**

### T1.2 — Trace Accepted-submission pipeline
- [x] Trace the path from Accepted detection through file generation to GitHub upload.
- [x] Identify relevant source files/functions and how language, problem slug, and destination paths are selected.
- [x] Record where auth and repository selection happen.

**Done when:** A short, source-referenced flow is documented. **Stop.**

### T1.3 — Inventory GitHub writes and commits
- [x] Identify all writes: solution, problem README, notes, root README, topic tags, stats, indexes, and other metadata.
- [x] For each write, record its trigger, target path, GitHub API operation, and whether it creates a distinct commit.
- [x] Distinguish confirmed behavior from inferred behavior; list unanswered questions.
- [x] Identify the smallest change needed to reduce separate commits. The initial metadata-suppression proposal is superseded by the user's requirement to retain those updates in the same commit.

**Done when:** Root causes and a minimal patch plan are reported. **Stop for approval before significant architecture changes.**

## Phase 2 — Prepare one complete submission update

### T2.1 — Collect file changes without publishing separately
- [ ] Prepare solution code, a missing problem README, available notes, root README/topics, and applicable stats updates as one submission change set.
- [ ] Preserve the existing folder/filename mapping and language support.
- [ ] Preserve an existing problem README and notes when no replacement is intended; inspect GitHub state rather than relying solely on local SHA caches.
- [ ] Preserve root README content outside LeetHub's marked topic section; retain topic sorting and duplicate prevention.
- [ ] Keep stats and local progress behavior, preparing their updates before publication without counting the same problem twice.
- [ ] Compare desired content to current repository content and exclude unchanged files. If the entire change set is unchanged, publish no commit.

**Done when:** Patch is scoped, reviewed, and accompanied by a change summary. **Stop.**

### T2.2 — Verify complete change preparation
- [ ] Run available targeted tests or add lightweight mocks for affected pathways, if practical.
- [ ] Confirm root README/topic and stats updates are included when needed, rather than suppressed or committed separately.
- [ ] Confirm problem-specific content, user README edits, authentication, and repository selection are preserved.
- [ ] Test new problems, changed and identical resubmissions, missing READMEs, notes, and Unicode content.
- [ ] Record results and gaps. Commit only after user approval.

**Done when:** All required submission changes can be prepared together without separate publication. **Stop.**

## Phase 3 — One commit per accepted problem

### T3.1 — Count current per-problem commits
- [ ] Determine whether solution files, problem README, and notes use independent GitHub write requests.
- [ ] Document current commit counts and the expected single commit after batching the full change set, including root metadata.
- [ ] Check for edge cases: resubmissions, updated solutions, missing README, and failed/partial uploads.

**Done when:** Actual or well-supported expected commit count is documented. **Stop.**

### T3.2 — Design batching only if needed
Design evaluated ahead of Phase 2 at the user's request. The latest scope clarification below supersedes earlier metadata-suppression proposals. Implementation has not been approved or performed. Phase 2 and T3.1 verification remain pending.
- [ ] If already one commit, mark batching unnecessary; don't change code.
- [x] If multiple commits remain, evaluate a minimal atomic GitHub Git Data workflow (blobs → tree → commit → branch ref) or equivalent.
- [x] Consider API permissions, existing-file updates, concurrent submissions, error handling, default branch, and retries.
- [x] Compare risks/complexity to benefits and propose the precise implementation scope.

**Done when:** Codex presents a recommended design. **Stop for approval before a risky rewrite.**

### T3.3 — Implement and test atomic per-problem upload (conditional)
- [ ] Implement only if T3.2 design is approved and feasible without destabilizing the extension.
- [ ] Combine all changed problem files and applicable root README/topics/stats updates into one commit per changed accepted submission.
- [ ] Ensure failure handling avoids silent partial success; preserve updates/resubmissions.
- [ ] Prevent duplicate uploads from repeated clicks and overlapping automatic/manual events for the same submission.
- [ ] Handle concurrent branch updates with bounded retries, recomputing root topics/stats against the latest state and preserving other submissions.
- [ ] Confirm ambiguous publication outcomes before retrying; never force-update a branch or silently overwrite concurrent solution/notes changes.
- [ ] Use meaningful commit messages with no prefix and an initial capital for every word, e.g. `Add Solution For Two Sum` or `Update Solution For Two Sum`; retain runtime/memory details in the commit body when available.
- [ ] Show upload success and update local progress only after confirming the complete commit is published; distinguish unchanged uploads from failures.
- [ ] Add targeted tests for single-commit writes and common failure cases where practical.
- [ ] After approval, use a local commit such as `Batch Solution And Metadata Updates Into One Commit`.

**Done when:** Tests support one meaningful commit per Accepted problem, or batching is explicitly deferred with reason. **Stop.**

## Phase 4 — Build and functional validation

### T4.1 — Automated checks
- [ ] Install dependencies if needed, using the project's supported tooling.
- [ ] Run applicable build, tests, lint, and type checks.
- [ ] Report commands, outcomes, warnings, and blockers; don't conceal failures.

**Done when:** Automated validation results are documented. **Stop.**

### T4.2 — Validate submission behavior
- [ ] Verify Accepted detection → file generation → upload still works, as far as automation/mocks allow.
- [ ] Verify auth, repository selection, destination folder and filename mapping.
- [ ] Verify root README/topics and stats changes share the solution commit, with no separate metadata commits.
- [ ] Verify expected commit count and the exact file set in each commit.
- [ ] Identify anything that requires a live browser/LeetCode test.

**Done when:** Expected behavior and unverified assumptions are clearly distinguished. **Stop.**

## Phase 5 — Chromium extension installation and live test

### T5.1 — Produce unpacked extension build
- [ ] Build the Chromium version.
- [ ] Identify and report the **actual generated directory containing `manifest.json`** (do not guess `dist/chrome`).
- [ ] Explain Developer Mode, how to load unpacked extension, whether to disable store LeetHub, and whether GitHub re-authentication is needed.
- [ ] Document how to rebuild and reload it after future edits.

**Done when:** Exact install path and instructions are available. **Stop for my browser setup.**

### T5.2 — One live Accepted-submission smoke test (user-assisted)
- [ ] Provide steps to disable the original extension temporarily and enable only the custom one.
- [ ] Use a safe LeetCode Accepted submission with a test repository or known test problem.
- [ ] Inspect resulting GitHub commit count and contents; confirm problem files and required root README/topics/stats updates appear together in one commit.
- [ ] Record pass/fail evidence, errors, and any required fixes.

**Done when:** One real submission behaves as intended, or the remaining blocker is documented. **Stop.**

### T5.3 — Final implementation handoff
- [ ] Report root causes, changed files/functions, disabled/preserved features, and expected commits per solve.
- [ ] Include build/test results, exact extension path, install/reload instructions, and limitations.
- [ ] Explain future upstream updates: retain upstream remote where appropriate; fetch/review carefully and rerun regression checks. Continue on main unless the user authorizes another branch.
- [ ] Ensure working tree status and any **local-only** commits are reported. Do not push.

**Done when:** Custom extension can be maintained independently. **Stop.**

## Phase 6 — Existing Git history cleanup (separate, NOT authorized yet)

### T6.1 — Read-only audit when repository is supplied
- [ ] Inspect historical commits and classify solution vs metadata commits.
- [ ] Count likely `Update README - Topic Tags`, `Updated stats`, and similar commits.
- [ ] Check for merges, shared collaborators, protected branches, and history rewrite risks.
- [ ] Present possible strategies with before/after examples, backup plan, and tradeoffs.

**Done when:** A written plan exists. **Stop; request explicit approval.**

### T6.2 — Optional cleanup (requires separate explicit approval)
- [ ] **Do not execute by default.** Only proceed if I specifically authorize a chosen strategy.
- [ ] Back up refs and verify the exact target repository/branch before any history edits.
- [ ] Carry out only the approved operations; verify history and files afterward.

**Done when:** Approved cleanup is verified. No implicit force-push authorization.

---

## Milestones

| Milestone | Completion requirement |
|---|---|
| M1 — Understood | T1.1–T1.3 complete; commit sources mapped |
| M2 — Complete change set | T2.1–T2.2 complete; solution and metadata changes prepared together |
| M3 — Single commit | T3.1–T3.3 resolved; one commit achieved **or limitation explained** |
| M4 — Built | T4.1–T4.2 passed or blockers documented |
| M5 — Installed/tested | T5.1–T5.3 complete; real Accepted upload checked |
| M6 — Old history | Separate approved project; not part of initial release |

## Progress log

Add dated entries here after each task:

```text
Date:
Task:
Changed files:
Findings/results:
Checks executed:
Local commit hash (if any):
Open issues:
Next task:
```

## First message to Codex

> Read `LEETHUB_ROADMAP.md`. Work on **T1.1 only**. Inspect the current repository and report your findings. Update the roadmap checkbox/progress log only when verified. Do not modify extension functionality or push anything. Stop after T1.1 and wait for my next instruction.


### 2026-10-19 — T1.1

- Completed repository discovery; proposed preserving upstream history and the custom README when importing source.
- Local source is absent; upstream HEAD verified as 78768e165c7552594446eaf3a4cb5610800152f7.
- Online package, Chromium manifest, and Webpack configuration inspected; no build or tests run.
- No import or push performed. Next: import upstream, then T1.2.

### 2026-10-19 — Source import

- Imported upstream commit `78768e165c7552594446eaf3a4cb5610800152f7` (version 2.0.10) on `codex/import-upstream`, preserving upstream ancestry through a pending merge.
- Retained the custom README and upstream MIT license; added the upstream remote.
- Verified imported source against upstream. Dependencies, build, and tests have not been run.
- Import commit approved by the user. Next: T1.2, trace the Accepted-submission pipeline.

### 2026-10-19 — T1.2

- Submission entry: `scripts/leetcode/leetcode.js:559` observes Submit buttons. V2 clicks and Ctrl/Cmd+Enter call `v2SubmissionHandler` (`:539`), which requests a submission ID from the background worker (`scripts/background.js:40`) via navigation events. Manual sync reads the ID from the current URL (`leetcode.js:622`). V1 clicks call `loader` directly.
- Detection: `loader` (`leetcode.js:416`) polls once per second for up to ten unsuccessful attempts, then calls `init`. V1 checks Success/Accepted text (`versions.js:162`). V2 only checks for a result element (`versions.js:411`); it does not explicitly validate Accepted text or the fetched statusCode. Live detection behavior remains unverified.
- Data: V2 `init` (`versions.js:321`) fetches submission details through LeetCode GraphQL, then question details for the displayed problem ID. Code comes from `submissionData.code`; language extensions use `util.js:2` and `versions.js:387`.
- Paths: `getProblemNameSlug` (`versions.js:405`) combines the displayed ID and title slug, padded to at least four digits (`util.js:148`). `loader` uses `<problem>/<problem><extension>`, e.g. `0001-two-sum/0001-two-sum.py`. `getPath` (`leetcode.js:42`) joins directory and filename.
- Problem content: `parseQuestion` (`versions.js:446`) produces HTML inside the problem README. The loader creates it when no local README SHA is cached. Optional notes use `NOTES.md`; V2 `getNotesIfAny` (`versions.js:404`) is empty, so V2 currently produces no notes through that method.
- Upload: `uploadGitWith409Retry` (`leetcode.js:245`) validates the stored token, commit mode, and repository hook, obtains cached SHAs, and retries once with a fetched SHA on HTTP 409. `upload` (`:73`) base64-encodes content upstream of the call, sends a Contents API PUT, and stores the returned file SHA locally. No branch is specified in the request.
- After problem file preparation, the loader also calls root README topic updates (`leetcode.js:481`) and, for newly completed problems, local and persistent stats updates (`:490`). Full write/commit inventory is reserved for T1.3.
- Authentication: `scripts/oauth2.js` starts GitHub OAuth; `scripts/authorize.js:43` exchanges the code and `:74` validates the user. `scripts/background.js:14` stores `leethub_token` and username. Repository creation/linking in `scripts/welcome.js:76` and `:168` stores `leethub_hook` and `mode_type: commit`.
- Checks: read-only source tracing; no live submission, dependencies, build, or tests run. No extension code changed. Next: T1.3, inventory GitHub writes and propose the smallest suppression patch.

### 2026-10-19 — Approved acceptance check

- User approved explicit API acceptance verification before uploads.
- V2 `init` now clears stale submission data, validates the submission ID and response, and requires numeric `statusCode === 10` before retrieving question details or returning to the upload flow. Automatic submission and manual sync share this method; legacy detection is unchanged.
- Status mapping reference: https://pkg.go.dev/github.com/j178/leetgo/leetcode#StatusCode (LeetCode client source documentation). Live GraphQL verification is still pending.
- Added focused tests for accepted, rejected, unknown/missing statuses, GraphQL errors, HTTP/network failures, missing IDs, and stale data clearing.
- Installed locked dependencies with lifecycle scripts disabled. `npm test`: 25 specs, 0 failures. `npm run build`: passed with two Webpack asset-size/performance warnings for the upstream Semantic UI bundle.
- Live browser verification pending: with only the custom extension enabled and a test repository linked, submit one rejected solution and confirm no GitHub writes; submit an accepted solution and confirm upload; repeat via manual sync on both submission pages.
- No commit or push performed. Proposed commit: `Verify Submission Acceptance Before Uploading`. Next: user review, then T1.3.

### 2026-10-19 — T1.3

Historical discovery entry: its metadata-suppression proposal was superseded by the later scope clarification below.

- Acceptance check committed with user approval: `2d571f6` — `Verify Submission Acceptance Before Uploading`.
- All LeetCode file writes use `upload` (`scripts/leetcode/leetcode.js:73`): a separate `PUT /repos/{hook}/contents/{path}` with its own commit message. No batching is implemented. Successful writes create separate commits; failed requests do not establish successful commits. Reference: https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents.

| Write | Trigger and source | Destination | Commit message |
|---|---|---|---|
| Solution | Each upload reaching `loader`, line 478 | `<problem>/<problem><extension>` | Runtime/memory statistics |
| Problem description | No local cached README SHA, lines 455–466 | `<problem>/README.md` | `Create README - LeetHub` |
| Notes | Nonempty notes, lines 470–473; V2 method currently empty | `<problem>/NOTES.md` | `Attach NOTES - LeetHub` |
| Topic index | Topic tags available, lines 481 and 372–413 | Root `README.md` | `Update README - Topic Tags` |
| Root README creation | Topic update receives HTTP 404, lines 397–398 | Root `README.md` | `Create README - LeetHub` |
| Persistent stats | Problem not considered completed locally, lines 490–492 and 154–185 | Root `stats.json` | `Updated stats` |
| Discussion link | Separate discussion-post click/navigation handler, lines 337–364 | URL-derived problem slug `/README.md` | `Prepend discussion post - LeetHub` |

- Topic tables live inside root README; no separate topic/index file writers were found. Local `storage` updates do not create Git commits. GitHub file reads and onboarding stats sync are GET requests. Creating a repository uses POST with `auto_init: true`, which can create initial repository content; this is onboarding, not an Accepted-submission write. The separate GFG script calls an undefined `uploadGit` and references other unavailable globals; no working independent GFG upload implementation was found, and it is outside this LeetCode change.
- Expected successful new-problem flow with an existing root README and no notes: four commits (problem README, solution, topics, stats). This is source-supported, not a measured browser result. Resubmissions typically omit problem README and stats, based on local cache, while still attempting solution and topics writes. The topic writer can send unchanged content; no content-equality guard exists there.
- Existing error cases: after creating a missing root README, the topic handler still throws the original 404; sibling writes may already have completed. Persistent stats initially uses the root README SHA rather than the stats file SHA, with a 409 recovery path. Stats persistence runs after the success indicator and is not awaited by the loader. Exact live counts depend on cache state, failures, and concurrent writes.
- Smallest proposed patch: remove the loader's `updateReadmeTopicTagsWithProblem` call and its Promise.all entry; replace `incrementStats(...).then(setPersistentStats)` with an awaited local-only `incrementStats(...)`. Preserve solution/problem README/notes uploads, local counters/SHA cache, authentication, repo selection, and existing remote files. Do not alter discussion or onboarding behavior in this patch.
- After this patch a new V2 problem would normally still produce two commits (solution and problem README). A single commit requires the later batching design; this patch alone will not achieve it.
- Checks: source inventory and GitHub API documentation review; no new code or tests in T1.3. Next: T2.1, implement the proposed metadata suppression after user review. No commit or push of these discovery updates.

### 2026-10-19 — Repository structure and single-commit design

Historical design entry: references to disabling root README/stats updates are superseded by the later scope clarification below.

- User requested an explanation of current/target structure, updated status, and a design for one commit per solution. Work continues on `main`; commits require explicit approval.
- Current structure: `scripts/leetcode/leetcode.js` coordinates detection, file preparation, individual uploads, and metadata. `versions.js` handles old/new LeetCode page data and the new API acceptance guard. `submitBtn.js` adds manual sync. `util.js` contains shared helpers and language mapping; `readmeTopics.js` maintains the root topic index. Other scripts handle background navigation, authentication, onboarding, popup, and the separate GFG integration. `spec/` contains Jasmine tests. Webpack generates browser builds in ignored `dist/`; installed tools live in ignored `node_modules/`.
- Target source structure: retain existing folders. Add only `scripts/leetcode/github.js` for batched GitHub operations and focused tests in `spec/github.spec.js`. These are proposed files, not created files. Keep `leetcode.js` responsible for collecting problem files and calling the uploader; preserve authentication, language/path resolution, UI, and the acceptance guard.
- Target solution repository layout remains `<problem>/<problem><extension>`, `<problem>/README.md`, and optional `<problem>/NOTES.md`. Preserve an existing problem README (including user edits/discussion links); create it only when absent on GitHub, rather than relying solely on the local cache. Update the solution and nonempty available notes; missing notes do not delete old notes. V2 notes extraction remains unimplemented and is not implicitly added by batching.
- Recommended flow: confirm acceptance, prepare all content before writes, discover the selected repository's default branch, read its current commit and tree, and inspect the target problem folder. Create one new tree based on the existing tree with all changed problem files, create one commit with that tree and the current commit as parent, then update the branch reference with `force: false`. The tree API accepts file content directly, so separate blob-creation requests are unnecessary for these text files. Always set `base_tree` to preserve other problems and repository files.
- Proposed solution commit example: `Add Solution For Two Sum`; updates use `Update Solution For Two Sum`. One changed accepted submission produces one visible commit containing all changed problem files. Identical repeat uploads produce zero commits. A later changed accepted solution produces another single commit; this does not mean one commit for a problem's entire lifetime.
- Disable submission-triggered root README/topic and remote stats writes first. Keep existing remote metadata files intact, local counters and file SHA tracking, and separate onboarding/discussion behavior. Remove the remote stats call from the submission success path; publish local success/counters only after confirming the batch reached the branch.
- Concurrency: serialize duplicate/in-flight work per submission in the extension context. For another tab/device changing the remote branch, a rejected non-fast-forward update must trigger a bounded retry from the newest head/tree, preserving unrelated changes and rechecking the target files. If a competing change modifies the same solution/notes path, report a conflict rather than silently overwriting it during a retry. Never force-update the branch.
- Failures: tree or commit creation alone does not publish files to the branch; only the final reference update publishes the batch. Unreferenced objects may remain after a failed attempt. If the reference update response is lost, reread branch history and file state to determine whether it succeeded before retrying; do not blindly create duplicate visible commits. Leave the UI in a failed/pending state when publication cannot be confirmed.
- Permissions: GitHub Git tree/commit/reference writes require repository Contents write permission (existing classic OAuth `repo` scope should cover normal repository use). Verify with the actual linked repository; branch protection or permission restrictions must surface as an error. Detect an empty repository and provide an explicit initialization error initially; onboarding-created repositories use auto_init, so automatic empty-repo initialization is deferred.
- Validation required: mocked single-commit publication with multiple files, existing README preservation, changed/identical resubmissions, default branch other than main, missing notes, Unicode content, untouched unrelated files, conflicts/retry limits, permission failures, failed requests, and ambiguous reference-update responses. Then run the full suite/build and perform a user-assisted browser test against a test repository.
- Design references: https://docs.github.com/en/rest/git/trees#create-a-tree ; https://docs.github.com/en/rest/git/commits#create-a-commit ; https://docs.github.com/en/rest/git/refs#update-a-reference.
- Tradeoff: a few more API requests and explicit retry handling, in exchange for publishing all problem files together as one visible commit. Prefer this focused module over restructuring the extension or rewriting authentication.
- Changes this session: README and roadmap only. No new implementation, tests, commit, or push. Earlier acceptance validation remains 25 passing specs and a successful build with upstream bundle warnings. Next: review this design, then implement metadata suppression and the approved batching design incrementally.

### 2026-10-19 — Solutions repository scope and optimizations

- User clarified that the existing solutions repository structure is to stay unchanged: `<problem>/<problem>.<language>`, `<problem>/README.md`, root README/topic index, and existing notes/stats behavior. The optimization is packaging applicable updates in one commit, not removing features.
- Preserve and incorporate existing LeetHub behavior: marked root topic section updates, topic duplicate prevention, language/path mapping, optional notes, stats, and runtime/memory details. Existing cached README skipping, manual debounce, and per-file conflict retries are partial safeguards to improve during batching.
- Planned improvements: content-based unchanged-file/no-op detection; remote-state-based README preservation; one atomic publication for the complete change set; duplicate-event protection; bounded concurrent-update handling; meaningful messages; success only after confirmed publication. These are planned, not implemented.
- Revised batch flow: read the current default-branch head/tree and relevant files; prepare problem files plus merged root topics and stats from that state; compare content; create a base-tree-derived snapshot and one commit only when something changes; publish with a non-forced reference update. On branch movement, reread and recompute topic/stats merges to retain other solutions and avoid double-counting. Preserve unrelated files and user content.
- Identical repeat uploads must create zero commits, including metadata: do not change stats merely because files were uploaded, and keep local upload/cache tracking separate from persisted semantic progress so refreshed SHA bookkeeping does not itself cause commits. Final stats payload/cache compatibility needs verification during T2.1.
- Acceptance criteria include all changed submission files in one visible commit, no separate metadata commits, no writes for rejected submissions, no duplicate commits for identical retries, preservation of user edits, and no partial-success indicator.
- Updated active phases and README to match this clarification. No implementation, new tests, commit, or push in this documentation update. Next session: T2.1, prepare the complete submission change set.

