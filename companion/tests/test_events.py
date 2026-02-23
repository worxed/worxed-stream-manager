"""Tests for the event processor."""

import sys
import os
import unittest
from time import time

# Add companion root to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models import CompanionState, Expression, Mood, StreamEvent
from events import EventProcessor


class TestExpression(unittest.TestCase):
    def test_all_expressions_have_values(self):
        """All expression enum members should have string values."""
        for expr in Expression:
            self.assertIsInstance(expr.value, str)
            self.assertTrue(len(expr.value) > 0)

    def test_expression_count(self):
        """Should have 12 expressions."""
        self.assertEqual(len(Expression), 12)


class TestMood(unittest.TestCase):
    def test_clamp_upper(self):
        mood = Mood(energy=150, positivity=200, engagement=999)
        mood.clamp()
        self.assertEqual(mood.energy, 100.0)
        self.assertEqual(mood.positivity, 100.0)
        self.assertEqual(mood.engagement, 100.0)

    def test_clamp_lower(self):
        mood = Mood(energy=-50, positivity=-10, engagement=-1)
        mood.clamp()
        self.assertEqual(mood.energy, 0.0)
        self.assertEqual(mood.positivity, 0.0)
        self.assertEqual(mood.engagement, 0.0)

    def test_to_dict(self):
        mood = Mood(energy=50.123, positivity=60.0, engagement=30.0, current_expression=Expression.HAPPY)
        d = mood.to_dict()
        self.assertEqual(d["energy"], 50.1)
        self.assertEqual(d["current_expression"], "happy")


class TestEventProcessor(unittest.TestCase):
    def setUp(self):
        self.state = CompanionState()
        self.processor = EventProcessor(self.state)

    def test_follow_increases_positivity(self):
        initial_positivity = self.state.mood.positivity
        event = StreamEvent(type="new-follower", username="testuser")
        self.processor.process(event)
        self.assertGreater(self.state.mood.positivity, initial_positivity)

    def test_follow_sets_happy_expression(self):
        event = StreamEvent(type="new-follower", username="testuser")
        self.processor.process(event)
        self.assertIn(
            self.state.mood.current_expression,
            [Expression.HAPPY, Expression.EXCITED, Expression.LOVE],
        )

    def test_raid_sets_excited(self):
        event = StreamEvent(type="raid", username="raider", amount=50)
        self.processor.process(event)
        self.assertEqual(self.state.mood.current_expression, Expression.EXCITED)

    def test_raid_scales_with_viewers(self):
        state_small = CompanionState()
        proc_small = EventProcessor(state_small)
        proc_small.process(StreamEvent(type="raid", username="a", amount=5))

        state_big = CompanionState()
        proc_big = EventProcessor(state_big)
        proc_big.process(StreamEvent(type="raid", username="b", amount=50))

        self.assertGreater(state_big.mood.engagement, state_small.mood.engagement)

    def test_subscriber_scales_with_tier(self):
        state_t1 = CompanionState()
        proc_t1 = EventProcessor(state_t1)
        proc_t1.process(StreamEvent(type="new-subscriber", username="a", amount=1))

        state_t3 = CompanionState()
        proc_t3 = EventProcessor(state_t3)
        proc_t3.process(StreamEvent(type="new-subscriber", username="b", amount=3))

        self.assertGreater(state_t3.mood.positivity, state_t1.mood.positivity)

    def test_mood_decay(self):
        self.state.mood.energy = 80.0
        self.state.mood.engagement = 60.0
        # Force the last decay time to be in the past
        self.processor._last_decay = time() - 60.0
        self.processor.decay()
        self.assertLess(self.state.mood.energy, 80.0)
        self.assertLess(self.state.mood.engagement, 60.0)

    def test_mood_decay_floors(self):
        """Energy shouldn't go below 10, engagement below 5."""
        self.state.mood.energy = 10.0
        self.state.mood.engagement = 5.0
        self.processor._last_decay = time() - 300.0
        self.processor.decay()
        self.assertGreaterEqual(self.state.mood.energy, 10.0)
        self.assertGreaterEqual(self.state.mood.engagement, 5.0)

    def test_unknown_event_no_crash(self):
        event = StreamEvent(type="unknown-event", username="test")
        result = self.processor.process(event)
        self.assertIsNotNone(result)

    def test_last_event_updated(self):
        event = StreamEvent(type="new-follower", username="user1")
        self.processor.process(event)
        self.assertEqual(self.state.last_event, event)


class TestCompanionState(unittest.TestCase):
    def test_to_dict(self):
        state = CompanionState()
        d = state.to_dict()
        self.assertIn("mood", d)
        self.assertIn("uptime", d)
        self.assertIn("is_speaking", d)
        self.assertIsNone(d["last_event"])

    def test_uptime_increases(self):
        state = CompanionState()
        state.started_at = time() - 100
        self.assertGreaterEqual(state.uptime, 99.0)


if __name__ == "__main__":
    unittest.main()
