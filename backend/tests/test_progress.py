from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.dependencies import get_current_user
from app.main import app
from app.models.progress_log import ProgressLog
from app.models.user import User


@pytest.fixture
def progress_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    with test_session() as db:
        user = User(name="Progress Test", email="progress@example.test", hashed_password="hash")
        db.add(user)
        db.commit()
        user_id = user.id

    def override_get_db():
        with test_session() as db:
            yield db

    def override_current_user():
        with test_session() as db:
            return db.get(User, user_id)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_current_user
    client = TestClient(app)
    try:
        yield client, test_session, user_id
    finally:
        app.dependency_overrides.clear()
        client.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_progress_logs_are_saved_sorted_and_scoped_to_user(progress_client) -> None:
    client, test_session, user_id = progress_client
    earlier = date.today() - timedelta(days=2)
    later = date.today() - timedelta(days=1)

    response = client.post(
        "/progress",
        json={
            "date": later.isoformat(),
            "weight_kg": 68.2,
            "workout_completed": True,
            "calories_consumed": 2100,
        },
    )
    assert response.status_code == 200
    assert response.json()["workout_completed"] is True

    client.post(
        "/progress",
        json={
            "date": earlier.isoformat(),
            "weight_kg": 68.5,
            "workout_completed": False,
            "calories_consumed": None,
        },
    )
    history = client.get("/progress").json()["logs"]

    assert [entry["date"] for entry in history] == [
        earlier.isoformat(),
        later.isoformat(),
    ]
    with test_session() as db:
        assert db.query(ProgressLog).filter_by(user_id=user_id).count() == 2


def test_post_progress_updates_existing_date_instead_of_duplicating(
    progress_client,
) -> None:
    client, test_session, user_id = progress_client
    today = date.today().isoformat()
    first = client.post(
        "/progress",
        json={"date": today, "weight_kg": 70, "workout_completed": False},
    )
    second = client.post(
        "/progress",
        json={"date": today, "weight_kg": 69.8, "workout_completed": True},
    )

    assert first.status_code == second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert second.json()["weight_kg"] == pytest.approx(69.8)
    assert second.json()["workout_completed"] is True
    with test_session() as db:
        assert db.query(ProgressLog).filter_by(user_id=user_id).count() == 1


@pytest.mark.parametrize(
    "payload",
    [
        {"date": (date.today() + timedelta(days=1)).isoformat()},
        {"date": date.today().isoformat(), "weight_kg": 0},
        {"date": date.today().isoformat(), "calories_consumed": -1},
    ],
)
def test_post_progress_rejects_invalid_values(progress_client, payload) -> None:
    client, _test_session, _user_id = progress_client

    response = client.post("/progress", json=payload)

    assert response.status_code == 422


def test_progress_endpoints_require_auth(progress_client) -> None:
    client, _test_session, _user_id = progress_client
    app.dependency_overrides.clear()

    assert client.get("/progress").status_code == 401
    assert client.post(
        "/progress",
        json={"date": date.today().isoformat()},
    ).status_code == 401
