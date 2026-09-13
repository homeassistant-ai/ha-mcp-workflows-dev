# Source issue 2311 — CI lane consolidation proposal

Source: https://github.com/homeassistant-ai/ha-mcp/issues/2311

This fixture proposes combining fast checks and CodeQL lanes, keeping gate jobs
only where matrix skip semantics require them, and reducing duplicated E2E
executions without losing deployment-mode coverage.

The implementation is intentionally incomplete: required-check names, measured
runner-minute changes and rollback criteria still need to be specified.
