"""
Tests for the Gemini fallback order in app.llm_config.

No network: these check which models are tried and in what order.
"""

import os
import unittest
from unittest import mock

from app.llm_config import DEFAULT_FALLBACK_MODELS, get_model_chain


class TestModelChain(unittest.TestCase):

    def test_main_model_comes_first(self):
        with mock.patch.dict(os.environ, {"GEMINI_MODEL": "model-a"}, clear=False):
            os.environ.pop("GEMINI_FALLBACK_MODELS", None)
            chain = get_model_chain()
        self.assertEqual(chain[0], "model-a")
        self.assertEqual(chain[1:], DEFAULT_FALLBACK_MODELS)

    def test_main_model_is_not_tried_twice(self):
        # gemini-3.1-flash-lite is both a default fallback and a likely
        # main model; a busy model should not be retried as its own backup.
        with mock.patch.dict(os.environ, {
            "GEMINI_MODEL": "gemini-3.5-flash",
            "GEMINI_FALLBACK_MODELS": "gemini-3.5-flash, model-b",
        }):
            self.assertEqual(get_model_chain(), ["gemini-3.5-flash", "model-b"])

    def test_fallbacks_can_be_turned_off(self):
        with mock.patch.dict(os.environ, {
            "GEMINI_MODEL": "model-a",
            "GEMINI_FALLBACK_MODELS": "",
        }):
            self.assertEqual(get_model_chain(), ["model-a"])

    def test_explicit_primary_overrides_env(self):
        with mock.patch.dict(os.environ, {
            "GEMINI_MODEL": "model-a",
            "GEMINI_FALLBACK_MODELS": "model-b",
        }):
            self.assertEqual(get_model_chain("model-z"), ["model-z", "model-b"])


if __name__ == "__main__":
    unittest.main()
