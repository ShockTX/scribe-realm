"""Stdlib-only tests for the GM service hardening."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))

import gm


class TestScenePromptOutcome(unittest.TestCase):
    def base_payload(self, roll):
        return {
            "character": {"name": "Mira", "level": 1},
            "quest": {"title": "Rats", "giver": "Dunmarrow", "objective": "Clear them."},
            "site": {"name": "Cellar", "description": "Dark.", "rooms": [{"id": "a", "name": "A", "note": "n"}]},
            "roomId": "a",
            "beat": 1,
            "of": 6,
            "action": "Look around.",
            "roll": roll,
        }

    def test_missing_outcome_does_not_crash(self):
        roll = {"label": "Perception", "die": 12, "total": 14, "dc": 10}
        text = gm.scene_prompt(self.base_payload(roll))
        self.assertIn("UNKNOWN", text)

    def test_none_outcome_does_not_crash(self):
        roll = {"label": "Perception", "die": 12, "total": 5, "dc": 10, "outcome": None}
        text = gm.scene_prompt(self.base_payload(roll))
        self.assertIn("UNKNOWN", text)

    def test_non_string_outcome_does_not_crash(self):
        roll = {"label": "Perception", "die": 12, "total": 5, "dc": 10, "outcome": 42}
        text = gm.scene_prompt(self.base_payload(roll))
        self.assertIn("42", text)

    def test_string_outcome_uppercased(self):
        roll = {"label": "Perception", "die": 12, "total": 18, "dc": 10, "outcome": "success"}
        text = gm.scene_prompt(self.base_payload(roll))
        self.assertIn("SUCCESS", text)

    def test_no_roll_ok(self):
        p = self.base_payload(None)
        p.pop("roll", None)
        text = gm.scene_prompt(p)
        self.assertIn("Write the next beat.", text)


class TestStripFences(unittest.TestCase):
    def test_bare_fence_no_crash(self):
        self.assertEqual(gm.strip_code_fences("```"), "")

    def test_open_fence_no_newline_no_crash(self):
        out = gm.strip_code_fences("```json")
        self.assertIsInstance(out, str)

    def test_fenced_json_unwrapped(self):
        out = gm.strip_code_fences('```json\n{"a": 1}\n```')
        self.assertEqual(out.strip(), '{"a": 1}')

    def test_plain_text_untouched(self):
        self.assertEqual(gm.strip_code_fences('{"a": 1}').strip(), '{"a": 1}')

    def test_unclosed_fence_no_crash(self):
        out = gm.strip_code_fences("```json\n{\"a\": 1}")
        self.assertIn('"a"', out)


class TestValidatePayload(unittest.TestCase):
    def test_quest_ok(self):
        ok, _ = gm.validate_payload("quest", {"character": {"name": "Mira"}})
        self.assertTrue(ok)

    def test_quest_bad_character(self):
        ok, err = gm.validate_payload("quest", {"character": "Mira"})
        self.assertFalse(ok)
        self.assertTrue(err)

    def test_quest_non_object(self):
        ok, _ = gm.validate_payload("quest", [])
        self.assertFalse(ok)

    def test_scene_ok(self):
        ok, _ = gm.validate_payload("scene", {
            "character": {},
            "quest": {"title": "t"},
            "site": {"rooms": []},
        })
        self.assertTrue(ok)

    def test_scene_missing_quest(self):
        ok, _ = gm.validate_payload("scene", {
            "character": {},
            "site": {"rooms": []},
        })
        self.assertFalse(ok)

    def test_scene_rooms_must_be_array(self):
        ok, _ = gm.validate_payload("scene", {
            "character": {},
            "quest": {},
            "site": {"rooms": "cellar"},
        })
        self.assertFalse(ok)

    def test_scene_bad_character(self):
        ok, _ = gm.validate_payload("scene", {
            "character": "x",
            "quest": {},
            "site": {"rooms": []},
        })
        self.assertFalse(ok)

    def test_unknown_kind(self):
        ok, _ = gm.validate_payload("bogus", {})
        self.assertFalse(ok)


class TestCaps(unittest.TestCase):
    def test_ledger_capped_at_20_recent_at_10(self):
        p = {
            "character": {"name": "Mira"},
            "quest": {"title": "t", "giver": "g", "objective": "o"},
            "site": {"name": "s", "description": "d",
                     "rooms": [{"id": "a", "name": "A", "note": "n"}]},
            "roomId": "a",
            "ledger": [f"fact {i}" for i in range(50)],
            "recent": [f"beat {i}" for i in range(30)],
            "beat": 1,
            "of": 6,
        }
        text = gm.scene_prompt(p)
        self.assertNotIn("fact 0", text)
        self.assertIn("fact 49", text)
        self.assertNotIn("beat 0", text)
        self.assertIn("beat 29", text)

    def test_max_body_defined(self):
        self.assertEqual(gm.MAX_BODY, 32768)


if __name__ == "__main__":
    unittest.main()
