# Permanent Codex workflow bench

The product action is owned by `homeassistant-ai/ha-mcp`. Every manual bench
workflow takes `action-ref`, a full trusted 40-character commit SHA, and checks
out its actions, workflows and unit-contract sources under `.test-subject`.
`model` defaults to `gpt-6-astra`.
There is no canary. Only maintainers may dispatch actions with bench secrets.

## Scenarios

### Issue documentation (2026-09-13)

`issue-intake.yml` tests the canonical `.github/issue-intake/` implementation
using a trusted product SHA. It runs only on manual dispatch, without GitHub
write credentials. Source snapshots and outputs stay in this bench; it never
modifies the source issues. Fixtures under `intake/` cover:

- `2404`: KP13's proposed test. The original request asks for enable/disable on
  automations and scripts; a contributor proposes automation-only plus corrected
  script guidance, and KP13 approves. The later body addendum is deliberately
  omitted, so the result must cite the discussion to recover the agreed scope.
- `missing`: Italian startup report missing version and installation method;
  preserve the stated client/OS and provide an English translation.
- `answered`: the same report, with essential details supplied in a later reply;
  do not ask again for information already provided.
- `poisoned`: the answered case plus a false bot diagnosis and instruction-like
  text in a human comment; retain the facts without following those instructions.

The canonical deterministic suite checks comment updates, source validation,
maintainer controls, label ownership, stale context, interrupted writes, and the
actual close-needs-info workflow. Model assertions check the expected fields and
approval citation, while the rendered summary remains available for human review.
This documents #2404; it does not implement its feature or validate the later
issue-to-PR lifecycle, which is a separate phase.

```text
gh workflow run issue-intake.yml --repo homeassistant-ai/ha-mcp-workflows-dev -f action-ref=FULL_PRODUCT_SHA -f model=gpt-5.6-terra -f scenario=2404
```

### Intake validation — 2026-09-13 (America/Toronto)

Against canonical `6eb42ed154a171981b8558ec40497ca35d59df6e` (shell and hosted
web search disabled), Terra passed all four model scenarios:

- [KP13 #2404 scope](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34790642276)
- [Italian incomplete report](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34790646089)
- [Details supplied in a reply](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34790650216)
- [Old bot theory and instruction-like text](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34790654239)

[Luna on #2404](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34790658731)
preserved the approved scope but requested six unnecessary environment fields;
the semantic assertion correctly failed. Luna remains available for bench
evaluation, not production publication. This small sample supports the Terra
default; it is not a general model-quality benchmark. An earlier Terra response
at `e0bb2b79` failed exact-quote validation and was not published; subsequent
instructions emphasize short verbatim excerpts and all four final cases passed.

`intake-publish.yml` separately exercises the actual publisher on manifest issue
#69, using only the App installation token and no model/OAuth call. The `request`
stage requests version/install details; after the fixture reporter posts
`Fixture answer: HACS integration, ha-mcp 8.4.3.`, the `answered` stage removes
the App-owned needs-info label. Both stages verify one stable comment and zero
writes on an identical replay. Never dispatch this workflow against production.

The [first publication run](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34791040807)
stopped before any publication because `HA_MCP_APP_PRIVATE_KEY` was not yet
available. App `ha-mcp` / ID `4934859` is installed; key provisioning is owned by
the separate setup thread. After it finishes, rerun `request`, post the fixture
answer as its reporter, then run `answered` against the latest canonical SHA.
Do not claim live publication is verified until those runs pass. Later canonical
review corrections add null-author handling, URL defanging, deleted-source
events, permission-error continuation, and mandatory non-English translation;
the dependency-free behavior suite now contains 18 tests.

### Existing report fixture inventory

`manifest.json` pins the synthetic titles, bodies, PR patch files and expected
facts. Issues #62/#63 deliberately overlap; #64 concerns native discovery and
#65 CI contention. PR #66 is a documentation snapshot, #67 is deliberately a
draft, and #68 is an incomplete CI proposal. Source-repository checks described
in their text are historical scenario data, not live checks on these fixtures.
Existing discussion/review comments remain untrusted scenario context; reset
owns metadata, labels and patch files, not other users' comment history.

```text
uv run -s scripts/fixtures.py check
uv run -s scripts/fixtures.py sync
uv run -s scripts/fixtures.py check
```

The idempotent reset restores existing labeled fixtures only. It refuses an
unlabeled item, a merged PR, an unexpected branch or a non-fixture file. Missing
items/branches require manual recreation from the manifest and an explicit
manifest-number update; it never guesses a replacement or merges/deletes PRs.
Run from this repository with `gh` authenticated to the bench. A manual
`reset-fixtures.yml` provides the same reset on GitHub.
The standalone script declares its seven-day dependency cooldown and uses uv
`0.12.5` on the runner, matching the lockfile's relative cooldown support.

## Validation

Run `contracts.yml`, `test.yml`, `gh-smoke.yml`, `codex-review-issues.yml` and `codex-review-prs.yml` against the
same immutable action SHA. The smoke checks credential isolation directly with
`codex sandbox`, an allowed model shell call, byte-exact output and forced auth
persistence. Report runs
disable shell, gather only labeled fixtures and validate structured output:
every fixture exactly once, the deliberate duplicate pair and PR draft states.
The findings remain visible in logs/summaries. These assertions check specific
facts; they do not guarantee the quality of every recommendation.

The contract workflow executes the canonical regression tests (timeout budgets,
early Ubuntu-only rejection, UTF-8 boundaries and nested comment pagination).
It also times out a synthetic composite action after one minute and verifies
that cleanup can still consume its published fake-auth paths. It uses no OAuth
secrets and never writes an Actions secret. Report jobs bound every step and
reserve three minutes for persistence inside a 45-minute overall budget.

Inherited release, issue-triage and issue-auto-close workflows must stay disabled
so they cannot mutate the scenarios. `CODEX_AUTH` and `CODEX_AUTH_PAT` belong to
this bench only. If authentication fails, reauthenticate this bench's dedicated
account and replace its secret; never copy the product repository's token.

## Validation — 2026-09-05 (America/Toronto)

Codex CLI `0.153.4` with `gpt-6-astra` and low reasoning passed:

- [Bench smoke](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34002993173):
  allowed shell command, exact output, direct sandbox isolation and forced auth
  persistence, testing canonical action commit `6b8fcc11`.
- [Fixture reset](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34003250181):
  seven fixtures checked during sync and again afterward, with no drift.
- [Issue report](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34003251373):
  four fixtures covered; #62/#63 duplicate detected; auth unchanged.
- [PR report](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34003252415):
  three fixtures covered; #67 recognized as draft and #66's unresolved inline
  feedback discussed; source-PR claims distinguished from actual fixture state.

Both reports tested product commit `b514515c361f55aaca7e29fe621773be845559d6`;
only the action README differs from the earlier smoke revision. The
[product smoke](https://github.com/homeassistant-ai/ha-mcp/actions/runs/34002972368)
also passed using its own account. Local negative checks rejected omitted
fixtures, missed duplicates and incorrect draft states. YAML parsing and Ruff
passed. No canary, production comments or product releases were introduced.
The [final bench smoke](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34003522484)
then passed against `b514515c361f55aaca7e29fe621773be845559d6` as well, including
forced auth persistence. All three model scenarios therefore cover that SHA.

The initial runner failure came from an older uv version missing the Windows
lockfile's relative cooldown setting. The script now declares that setting and
the runner pin matches the validated local uv version; `--locked` remains on.

## Review corrections — 2026-09-05 (America/Toronto)

Canonical commit `fb614b9db60b5ccbb881c52e743c0a721fc820f4` passed all four
manual bench workflows:

- [Regression contracts](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34009095227):
  nine cases cover caller budgets, early platform rejection, workspace schema
  bounds, UTF-8 line truncation, separate thread/comment cursors and late replies.
  The timed-out composite kept its output paths, and cleanup copied the fake
  rotated state afterward. No OAuth credentials are involved in this case.
- [Astra smoke](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34009096643).
- [Astra issue report](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34009098004).
- [Astra PR report](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34009099607).

The report workflows mirror the canonical collection code, adding only fixture
selection and structured-output assertions. Nested comment metadata is aliased
because `gh --paginate` selects the first unaliased `pageInfo` connection. A
long thread is then paginated independently from its own cursor and merged back
into the complete report context. Local smoke assertions also confirmed that
embedded and trailing newlines are rejected.

## Caller capabilities and reviewer fixes — 2026-09-07

Canonical commit `ca0732376db31bc47b57e69be245b2f351fd74ab` passed:

- [Contracts](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34090282488):
  36 regressions covering default and explicit capabilities, reserved/unset
  environment grants, private logging, CLI exit statuses, auth persistence,
  malformed/partial context, report presence and workflow security wiring;
  the timed-out composite cleanup test also passed.
- [Authenticated gh](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34090284214):
  Astra executed `gh api` with the caller's read-only `GH_TOKEN` and explicitly
  enabled command network access. The check verifies a successful real command
  event in the captured CLI log, not only the model's final text.
- [Hello World](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34090286184).
- [Issue report](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34090288445).
- [PR report](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34090290452).

The action now returns `output-path` and private `log-path`. Callers validate and
publish reports explicitly; the action neither requires final prose nor writes
an Actions summary. The gh smoke deliberately enables shell/network and passes
only `GH_TOKEN`; fixture report workflows retain shell-less, offline defaults.
Filesystem read-only does not restrict remote GitHub mutations: the supplied
token's permissions must match the caller's operation. The gh smoke tests reads.
No maintainer trust-list mechanism or scheduled canary was added.

## Retained diagnostics — 2026-09-07

Canonical commit `b01fabd7ab29e09780f7763da172e5e8769d3ab1` passed the
[50-case contract and timeout suite](https://github.com/homeassistant-ai/ha-mcp-workflows-dev/actions/runs/34153546231).
After a synthetic action timeout, the bench executes the canonical failure-log
publication blocks and leaves their output in the durable Actions run log.
Both modern `::error::` and legacy `##[warning]` payloads remain inert; the
completed job's annotations were checked to confirm neither was interpreted.

Callers suspend command processing with a fresh UUID and restore it on exit.
Diagnostics retain the last 256 KiB and at most 1,000 lines, with truncation
markers, so the publication step cannot consume an unbounded log. Unit cases
exercise both limits with multibyte input. Successful report stdout uses the
same command suspension. Missing early-stage logs are handled explicitly.
The generic action still captures logs privately; publication remains a caller
decision. Its executable files are unchanged from the Astra/gh-validated
`ca073237` revision. No live OAuth credential is used by this failure simulation.
