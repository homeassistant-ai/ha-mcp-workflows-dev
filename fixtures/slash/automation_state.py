"""State updates for the automation slash fixture."""


def set_enabled(kind: str, current: dict, enabled: bool) -> dict:
    """Return an automation state with its enabled flag updated."""
    if kind != "automation":
        raise ValueError(f"Unsupported kind: {kind}")
    if type(enabled) is not bool:
        raise TypeError("enabled must be a boolean")
    return {**current, "enabled": enabled}
