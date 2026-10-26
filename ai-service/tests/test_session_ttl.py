"""
Tests for expiring idle interview sessions.

Nothing used to remove a session, so every interview ever started -
with the candidate's CV text inside it - stayed in memory until a
restart. These run against the in-memory store; Redis applies the same
TTL itself (see test_session_store.py for what is sent to it).
"""

import unittest
from unittest.mock import patch

from app.interview import session_manager as sm


class TestSessionTtl(unittest.TestCase):

    def setUp(self):
        self.store = sm._MemoryStore()
        self.store_patch = patch.object(sm, "_store", self.store)
        self.store_patch.start()
        self.ttl = sm.session_idle_ttl_seconds()
        self.now = 1000.0
        self.clock = patch.object(sm.time, "monotonic", side_effect=lambda: self.now)
        self.clock.start()

    def tearDown(self):
        self.clock.stop()
        self.store_patch.stop()

    def test_idle_session_is_not_found(self):
        session = sm.create_session("Backend developer role with Spring Boot")
        self.now += self.ttl + 1

        with self.assertRaises(ValueError):
            sm.get_session(session.session_id)

    def test_recent_session_is_kept(self):
        session = sm.create_session("Backend developer role with Spring Boot")
        self.now += self.ttl - 60

        self.assertEqual(sm.get_session(session.session_id).session_id, session.session_id)

    def test_use_keeps_a_session_alive(self):
        # The TTL counts idle time, not age: a slow candidate who keeps
        # answering is never cut off mid-interview.
        session = sm.create_session("Backend developer role with Spring Boot")

        self.now += self.ttl - 5
        sm.get_session(session.session_id)
        self.now += self.ttl - 5

        self.assertEqual(sm.get_session(session.session_id).session_id, session.session_id)

    def test_new_interview_sweeps_out_expired_ones(self):
        old = sm.create_session("Backend developer role with Spring Boot")
        self.now += self.ttl + 1

        sm.create_session("Frontend developer role with React and CSS")

        self.assertNotIn(sm._key(old.session_id), self.store._items)
        self.assertEqual(len(self.store._items), 1)


if __name__ == "__main__":
    unittest.main()
