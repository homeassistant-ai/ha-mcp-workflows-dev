# PR interaction results — 2026-10-11

The manually requested lab used [synthetic PR #74](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/pull/74).
Real checkbox clicks, comment editing, a check button and manual Actions dispatch
were performed in Chrome as `julienld`, a repository admin. Events were recorded
by a fixture-only observer on real GitHub runners. No model or product write ran.

## Observed behavior

| Test | Observation | Evidence |
|---|---|---|
| Click two description checkboxes | Two separate `pull_request_target.edited` runs; both choices persisted | [A](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38155324959), [B](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38155326192) |
| Save a complete description once | One edit event containing both reset checkbox values | [Run](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38155556815) |
| Edit three author-comment options | Three `issue_comment.edited` runs; synthetic consumer skipped on all three | [1](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38155410205), [2](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38155411722), [3](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38155413030) |
| Submit once, then change another option | One synthetic consumer read the final option, which differed from the submission payload; 30 s stable window, 31 s consumer duration | [Run](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38155445472), [later edit](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38155446949) |
| Change modes during the active quiet window | Quiet wait extended to 55 s total / 31 s quiet; conflicting final modes rejected; no assessment reserved | [Run](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38155889769) |
| Admin edits an App-owned checkbox | Sender/editor were `julienld`; comment author remained `ha-mcp-agent[bot]` | [Run](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38155481601) |
| App updates its own status text | `issue_comment.edited`, Bot sender/editor, no synthetic consumer | [Run](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38155931921) |
| Native ready transition | `pull_request_target.ready_for_review`; no assessment request | [Run](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38156110035) |
| Ordinary comment after ready | `issue_comment.created`; not a registered command and no consumer | [Run](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38156112400) |
| CodeRabbit activity after ready | Existing bot comment edited independently; no synthetic consumer | [Run](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38156117476) |
| Edit author comment and click Update comment once | Three choices changed together; one `issue_comment.edited` run, no command edge | [Run](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38156601224) |
| Native Actions Run workflow UI | Manual `workflow_dispatch` on `master`, operation `observe`, successful real runner | [Run](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38156810547) |
| Native requested-action check button | Button rendered and GitHub confirmed the click. No `check_run` workflow run observed during the following several minutes | [Check](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/runs/114516499962), [creation](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/38155132718) |
| HTML button/input in Markdown render API | Sanitized to ordinary text; not interactive custom controls | GitHub Markdown API response retained in the observations below |

The requested-action check was created with GitHub Actions' App. The lack of an
Actions callback is consistent with the documented `check_run` recursion guard;
this is not proof that an external GitHub App webhook would fail. That path was
not installed or tested. See [GitHub event restrictions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#check_run).

## Recommendation supported by the lab

Use an **author-owned request comment** for preferences and an explicit Run/
update command. Keep the bot's status/assessment in a different bot-owned
comment and put the illustrated explanation/evidence in the PR description.
Do not use description edits or native ready as the business trigger.

Each checkbox edit can create a workflow run; GitHub provides no implicit
batching here. A production event filter can skip non-command jobs before a
runner starts, then use a short quiet window, current-body hash, authority
check and one per-PR queue to prepare the final snapshot. The lab deliberately
observed every edit to show the difference between events and agent work.

An updated timestamp is not enough as an input identity: the initial request
and its next option edit occurred in the same timestamp second, while their
checkbox content differed. The consumer compared body hashes.

## Limits and permission discovery

The admin could edit both an author- and a bot-owned comment. A contributor
account without repository write access was not exercised. GitHub documents
comment editing as author/write-access behavior; an author-owned request avoids
requiring a contributor to edit someone else's bot panel. This recommendation
still needs a dedicated outside-contributor permission test before production.

The first App comment operation failed HTTP 403 with an Issues-write /
Pull-requests-read token. Adding Pull requests write within the already installed
App's permissions made the fixture comment operation pass. The token was scoped
only to this bench; no installed App permission changed. The initial artifact
path was hidden and excluded by default; changing it to `probe-results` retained
the intended JSON evidence. These were setup discoveries, not successful tests.

The rendered HTML probe was:

```html
<button>Assess PR</button><input type="checkbox"><p>HTML controls probe.</p>
```

GitHub returned:

```html
<p dir="auto">Assess PR</p><p dir="auto">HTML controls probe.</p><p dir="auto"></p>
```

## Final state

- Observer workflow: `disabled_manually`.
- `PR_INTERACTION_PROBE_UNTIL`: removed.
- PR #74: closed, not merged; branch and comments retained.
- All 24 probe runs complete, none pending. One initial setup failure; the
  subsequent planned positive/negative observations completed successfully.
- No model invocation, reviewer request, product mutation, secret transfer or
  change to inherited release/triage automation.
- Curated machine-readable evidence: [observations.json](observations.json).
  The full artifact files remain in the lab's ignored `local/` directory and in
  Actions artifacts for 30 days. Run links and this report are durable.
