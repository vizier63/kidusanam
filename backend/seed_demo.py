"""Seed the local database with the WellAI demo account and 30 days of progress.

Run from the backend directory with ``python seed_demo.py``.
Demo login: demo@wellai.example.com / WellAI-demo-2026!
"""

from datetime import date, timedelta
import random

from sqlalchemy import select

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.progress_log import ProgressLog
from app.models.profile import (
    ActivityLevel,
    DietaryPreference,
    Equipment,
    FitnessGoal,
    Profile,
)
from app.models.user import User
from app.services.coaching_track import assign_coaching_track

DEMO_EMAIL = "demo@wellai.example.com"
DEMO_PASSWORD = "WellAI-demo-2026!"


def seed_demo() -> None:
    Base.metadata.create_all(bind=engine)
    rng = random.Random(20261027)
    today = date.today()

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == DEMO_EMAIL))
        if user is None:
            user = User(
                name="WellAI Demo",
                email=DEMO_EMAIL,
                hashed_password=hash_password(DEMO_PASSWORD),
            )
            db.add(user)
            db.flush()
        else:
            user.name = "WellAI Demo"
            user.hashed_password = hash_password(DEMO_PASSWORD)

        track = assign_coaching_track(
            age=32,
            medical_conditions=None,
            injuries=None,
            goal=FitnessGoal.GENERAL_FITNESS,
        )
        profile = db.get(Profile, user.id)
        if profile is None:
            profile = Profile(user_id=user.id)
            db.add(profile)
        profile.age = 32
        profile.gender = "female"
        profile.height_cm = 165
        profile.weight_kg = 67.2
        profile.activity_level = ActivityLevel.MODERATE
        profile.goal = FitnessGoal.GENERAL_FITNESS
        profile.medical_conditions = None
        profile.injuries = None
        profile.dietary_preference = DietaryPreference.VEG
        profile.equipment = Equipment.HOME
        profile.track = track
        db.flush()

        db.query(ProgressLog).filter_by(user_id=user.id).delete(
            synchronize_session=False
        )
        starting_weight = 68.6
        for days_ago in reversed(range(30)):
            day_index = 29 - days_ago
            logged_date = today - timedelta(days=days_ago)
            trend = starting_weight - 0.045 * day_index
            weight = round(trend + rng.uniform(-0.25, 0.25), 1)
            workout_completed = rng.random() < 0.72
            calories = rng.randint(1850, 2250) if workout_completed else rng.randint(1700, 2150)
            db.add(
                ProgressLog(
                    user_id=user.id,
                    date=logged_date,
                    weight_kg=weight,
                    workout_completed=workout_completed,
                    calories_consumed=calories,
                )
            )
        db.commit()

    print(f"Seeded {DEMO_EMAIL} with 30 days of progress.")
    print(f"Demo password: {DEMO_PASSWORD}")


if __name__ == "__main__":
    seed_demo()
