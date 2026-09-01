# Generic Codex action

`codex-run` passes the caller's `instructions` to `codex exec` verbatim. It
does not add a role, output contract, repository context, or task wrapper.

The caller owns:

- GitHub `permissions` and whether `GH_TOKEN` is exported;
- checkout strategy and credentials;
- read-only versus workspace-write sandboxing;
- instructions, expected output, validation and any later side effects;
- concurrency for workflows that share one `CODEX_AUTH` refresh token.

`CODEX_AUTH` contains the raw `auth.json` JSON, not Base64. The action writes it
to an isolated `CODEX_HOME` under `RUNNER_TEMP`, pins an exact Codex CLI
version, runs ephemerally, and exposes the final-message and auth paths.

When the caller also supplies a repository-scoped token with `Secrets: write`,
it can invoke the separate `codex-update-auth` action under `if: always()` to
persist a refreshed `auth.json`. Keeping this step separate prevents ordinary
read or write permissions from implicitly granting secret administration.

## Read-only example

```yaml
permissions:
  contents: read

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: ./.github/actions/codex-run
        with:
          codex-auth: ${{ secrets.CODEX_AUTH }}
          sandbox: read-only
          instructions: |
            Inspect this repository and report the three highest-risk test gaps.
            Do not modify files or external state.
```

## Caller-controlled GitHub access

```yaml
permissions:
  contents: read
  issues: read

jobs:
  analyze-issues:
    runs-on: ubuntu-latest
    env:
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@v7
        with:
          persist-credentials: false
      - uses: ./.github/actions/codex-run
        with:
          codex-auth: ${{ secrets.CODEX_AUTH }}
          sandbox: read-only
          instructions: |
            Review the open issues using gh. Return analysis only.
```

For repository edits, the caller may choose `sandbox: workspace-write` and
grant only the GitHub permissions needed by later workflow steps. The action
never commits, pushes, creates issues, comments, or opens pull requests itself.

Only use Codex authentication with trusted workflow events and trusted
instructions. Do not expose `CODEX_AUTH` to workflows that execute untrusted
fork code. Workflows sharing one auth secret should use the same non-cancelling
`concurrency` group so two jobs cannot refresh the same token simultaneously.
