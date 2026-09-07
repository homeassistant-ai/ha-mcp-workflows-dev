# Source PR 2327 — service parameter documentation

Source: https://github.com/homeassistant-ai/ha-mcp/pull/2327

This fixture represents a focused documentation-only change adding
`Annotated[..., Field(description=...)]` metadata to six `ha_call_service`
parameters. The source PR changes two files, adds 92 lines, deletes 11, has a
requested-changes review, and currently has one failing fast-check lane.

The contributor reports syntax validation and an external schema inspection,
but could not run the Python 3.13 test suite locally.
