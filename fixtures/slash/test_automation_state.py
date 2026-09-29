import pytest

from automation_state import set_enabled


def test_automation_can_be_enabled_without_mutating_input():
    current = {"id": "kitchen", "enabled": False, "alias": "Kitchen lights"}

    result = set_enabled("automation", current, True)

    assert result == {
        "id": "kitchen",
        "enabled": True,
        "alias": "Kitchen lights",
    }
    assert result is not current
    assert current == {
        "id": "kitchen",
        "enabled": False,
        "alias": "Kitchen lights",
    }


def test_automation_can_be_disabled_without_mutating_input():
    current = {"id": "hallway", "enabled": True}

    result = set_enabled("automation", current, False)

    assert result == {"id": "hallway", "enabled": False}
    assert result is not current
    assert current == {"id": "hallway", "enabled": True}


@pytest.mark.parametrize("kind", ["script", "scene", "Automation"])
def test_unsupported_kind_is_rejected_without_mutating_input(kind):
    current = {"id": "kitchen", "enabled": False}

    with pytest.raises(ValueError, match="Unsupported kind"):
        set_enabled(kind, current, True)

    assert current == {"id": "kitchen", "enabled": False}


@pytest.mark.parametrize("enabled", [0, 1, "true", "false"])
def test_non_boolean_enabled_is_rejected_without_mutating_input(enabled):
    current = {"id": "kitchen", "enabled": False}

    with pytest.raises(TypeError, match="enabled must be a boolean"):
        set_enabled("automation", current, enabled)

    assert current == {"id": "kitchen", "enabled": False}
