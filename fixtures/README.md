# Permanent Codex workflow bench

The product action is owned by `homeassistant-ai/ha-mcp`. Every manual bench
workflow takes `action-ref`, a full trusted 40-character commit SHA, and checks
out its actions, workflows and unit-contract sources under `.test-subject`.
`model` defaults to `gpt-6-astra`.
There is no canary. Only maintainers may dispatch actions with bench secrets.

## Scenarios

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

Run `contracts.yml`, `test.yml`, `codex-review-issues.yml` and `codex-review-prs.yml` against the
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
