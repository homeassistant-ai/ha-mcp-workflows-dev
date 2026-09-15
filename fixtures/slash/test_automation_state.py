from automation_state import set_enabled


def test_automation_can_be_enabled_without_mutating_input():
    current = {"id": "kitchen", "enabled": False}
    assert set_enabled("automation", current, True) == {"id": "kitchen", "enabled": True}
    assert current["enabled"] is False
