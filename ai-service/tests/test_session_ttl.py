"""
Tests for evicting idle interview sessions from memory.

Nothing used to remove a session, so every interview ever started -
with the candidate's CV text inside it - stayed in memory until a
restart.
"""

import unittest
from unittest.mock import patch

from app.interview import session_manager as sm


class TestSessionTtl(unittest.TestCase):

    def setUp(self):
        sm._sessions.clear()

    def tearDown(self):
        sm._sessions.clear()

    def test_idle_session_is_evicted_by_the_next_new_interview(self):
        old = sm.create_session("Backend developer role with Spring Boot")
        old.last_active -= sm.SESSION_IDLE_TTL_SECONDS + 1

        sm.create_session("Frontend developer role with React and CSS")

        self.assertNotIn(old.session_id, sm._sessions)
        self.assertEqual(len(sm._sessions), 1)

    def test_recent_session_is_kept(self):
        recent = sm.create_session("Backend developer role with Spring Boot")
        recent.last_active -= sm.SESSION_IDLE_TTL_SECONDS - 60

        sm.create_session("Frontend developer role with React and CSS")

        self.assertIn(recent.session_id, sm._sessions)

    def test_expired_session_is_not_found_even_before_a_sweep(self):
        session = sm.create_session("Backend developer role with Spring Boot")
        session.last_active -= sm.SESSION_IDLE_TTL_SECONDS + 1

        with self.assertRaises(ValueError):
            sm.get_session(session.session_id)

        self.assertNotIn(session.session_id, sm._sessions)

    def test_use_keeps_a_session_alive(self):
        # The TTL counts idle time, not age: a slow candidate who keeps
        # answering is never cut off mid-interview.
        session = sm.create_session("Backend developer role with Spring Boot")
        session.last_active -= sm.SESSION_IDLE_TTL_SECONDS - 5

        with patch.object(sm.time, "monotonic", return_value=session.last_active + 4):
            sm.get_session(session.session_id)

        self.assertFalse(sm._is_expired(session, session.last_active + 60))


if __name__ == "__main__":
    unittest.main()
