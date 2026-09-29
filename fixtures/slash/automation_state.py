"""State helpers for the maintainer-authorized slash workflow fixture."""


def set_enabled(kind: str, current: dict, enabled: bool) -> dict:
    """Return an automation state updated with a strictly boolean enabled value."""
    if kind != "automation":
        raise ValueError(f"Unsupported kind: {kind}")
    if type(enabled) is not bool:
        raise TypeError("enabled must be a boolean")

    return {**current, "enabled": enabled}
