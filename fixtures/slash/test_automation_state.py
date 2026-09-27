import pytest

from automation_state import set_enabled


def test_automation_can_be_enabled_without_mutating_input():
    current = {"id": "kitchen", "enabled": False, "alias": "Lights"}
    updated = set_enabled("automation", current, True)
    assert updated == {"id": "kitchen", "enabled": True, "alias": "Lights"}
    assert updated is not current
    assert current == {"id": "kitchen", "enabled": False, "alias": "Lights"}


def test_automation_can_be_disabled_without_mutating_input():
    current = {"id": "kitchen", "enabled": True, "alias": "Lights"}
    updated = set_enabled("automation", current, False)
    assert updated == {"id": "kitchen", "enabled": False, "alias": "Lights"}
    assert updated is not current
    assert current == {"id": "kitchen", "enabled": True, "alias": "Lights"}


@pytest.mark.parametrize("kind", ["script", "scene", "Automation", ""])
def test_unsupported_kind_raises_value_error_without_mutating_input(kind):
    current = {"id": "kitchen", "enabled": False}
    with pytest.raises(ValueError):
        set_enabled(kind, current, True)
    assert current == {"id": "kitchen", "enabled": False}


@pytest.mark.parametrize("enabled", [0, 1, "true", "false", None])
def test_non_boolean_enabled_raises_type_error_without_mutating_input(enabled):
    current = {"id": "kitchen", "enabled": False}
    with pytest.raises(TypeError):
        set_enabled("automation", current, enabled)
    assert current == {"id": "kitchen", "enabled": False}
