"""
Tests for keeping interview sessions outside the process.

Sessions used to live in a dict inside the AI service, so a restart
lost every interview in progress and a second container could not see
the first one's interviews. With REDIS_URL set they are kept in Redis.
"""

import os
import unittest
from unittest.mock import patch

from app.interview import session_manager as sm


class FakeRedis:
    """The three commands the store uses, with the expiry they were given."""

    def __init__(self):
        self.values = {}
        self.expiry = {}

    def set(self, key, value, ex=None):
        self.values[key] = value
        self.expiry[key] = ex

    def getex(self, key, ex=None):
        if key not in self.values:
            return None
        self.expiry[key] = ex
        return self.values[key]

    def delete(self, key):
        existed = key in self.values
        self.values.pop(key, None)
        self.expiry.pop(key, None)
        return int(existed)


def redis_store(server):
    # A real _RedisStore talking to the fake server; from_url opens no
    # connection until a command is sent.
    store = sm._RedisStore("redis://localhost:6379/0")
    store._redis = server
    return store


class TestSessionStore(unittest.TestCase):

    def setUp(self):
        self.server = FakeRedis()
        self.store_patch = patch.object(sm, "_store", redis_store(self.server))
        self.store_patch.start()

    def tearDown(self):
        self.store_patch.stop()

    def test_another_process_sees_the_session(self):
        # Container A starts the interview, container B (or A after a
        # restart, with an empty memory) carries on with it.
        session = sm.create_session("Backend developer role with Spring Boot",
                                    job_field="backend_development")
        sm.add_question(session.session_id, "What is a REST API?",
                        difficulty="hard", topic="REST", topic_key="rest")

        with patch.object(sm, "_store", redis_store(self.server)):
            again = sm.get_session(session.session_id)

        self.assertEqual(again.questions, ["What is a REST API?"])
        self.assertEqual(again.current_difficulty, "hard")
        self.assertEqual(again.topic_history, ["rest"])
        self.assertEqual(again.job_field, "backend_development")

    def test_change_without_save_is_not_kept(self):
        # get_session returns a copy. This is why main.py goes through
        # the session manager, or calls save_session, for every change.
        session = sm.create_session("Backend developer role with Spring Boot")

        sm.get_session(session.session_id).weak_answer_streak = 3
        self.assertEqual(sm.get_session(session.session_id).weak_answer_streak, 0)

        sm.update_interview_state(session.session_id, weak_answer_streak=3,
                                  answer_quality="weak")
        stored = sm.get_session(session.session_id)
        self.assertEqual(stored.weak_answer_streak, 3)
        self.assertEqual(stored.last_answer_quality, "weak")

    def test_scorecard_is_kept_for_a_repeated_finish(self):
        session = sm.create_session("Backend developer role with Spring Boot")
        finished = sm.finish_session(session.session_id)
        finished.evaluation = {"overall_score": 72, "evaluated": True,
                               "category_scores": {"technical_depth": 70}}
        sm.save_session(finished)

        again = sm.get_session(session.session_id)

        self.assertEqual(again.status, "completed")
        self.assertEqual(again.evaluation["overall_score"], 72)
        self.assertEqual(again.evaluation["category_scores"]["technical_depth"], 70)

    def test_every_read_and_write_sets_the_idle_ttl(self):
        session = sm.create_session("Backend developer role with Spring Boot")
        key = sm._key(session.session_id)
        ttl = sm.session_idle_ttl_seconds()

        self.assertEqual(self.server.expiry[key], ttl)

        self.server.expiry[key] = None
        sm.get_session(session.session_id)
        self.assertEqual(self.server.expiry[key], ttl)

    def test_session_from_the_previous_release_still_loads(self):
        # The old in-process session had a last_active field; one
        # written during a deploy must not break the new code.
        session = sm.create_session("Backend developer role with Spring Boot")
        key = sm._key(session.session_id)
        self.server.values[key] = self.server.values[key][:-1] + ', "last_active": 12.5}'

        self.assertEqual(sm.get_session(session.session_id).session_id, session.session_id)

    def test_deleted_session_is_not_found(self):
        session = sm.create_session("Backend developer role with Spring Boot")

        self.assertTrue(sm.delete_session(session.session_id))
        with self.assertRaises(ValueError):
            sm.get_session(session.session_id)


class TestStoreChoice(unittest.TestCase):

    def tearDown(self):
        sm._store = None

    def test_redis_url_selects_redis(self):
        sm._store = None
        with patch.dict(os.environ, {"REDIS_URL": "redis://redis:6379/0"}):
            self.assertIsInstance(sm._get_store(), sm._RedisStore)

    def test_no_redis_url_keeps_sessions_in_memory(self):
        sm._store = None
        with patch.dict(os.environ, {"REDIS_URL": ""}):
            self.assertIsInstance(sm._get_store(), sm._MemoryStore)


if __name__ == "__main__":
    unittest.main()
