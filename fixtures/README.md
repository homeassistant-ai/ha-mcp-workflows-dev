# Permanent Codex workflow bench

The product action is owned by `homeassistant-ai/ha-mcp`. Every manual bench
workflow takes `action-ref`, a full trusted 40-character commit SHA, and checks
out only its actions under `.test-subject`. `model` defaults to `gpt-6-astra`.
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

Run `test.yml`, `codex-review-issues.yml` and `codex-review-prs.yml` against the
same immutable action SHA. The smoke checks credential isolation directly with
`codex sandbox`, an allowed model shell call, byte-exact output and forced auth
persistence. Report runs
disable shell, gather only labeled fixtures and validate structured output:
every fixture exactly once, the deliberate duplicate pair and PR draft states.
The findings remain visible in logs/summaries. These assertions check specific
facts; they do not guarantee the quality of every recommendation.

Inherited release, issue-triage and issue-auto-close workflows must stay disabled
so they cannot mutate the scenarios. `CODEX_AUTH` and `CODEX_AUTH_PAT` belong to
this bench only. If authentication fails, reauthenticate this bench's dedicated
account and replace its secret; never copy the product repository's token.
