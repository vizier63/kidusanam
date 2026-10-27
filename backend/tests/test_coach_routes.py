import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.dependencies import get_current_user
from app.main import app
from app.models.generated_plan import GeneratedPlan
from app.models.chat_message import ChatMessage
from app.models.profile import (
    ActivityLevel,
    DietaryPreference,
    Equipment,
    FitnessGoal,
    Profile,
)
from app.models.user import User
from app.services.llm_client import LLMResult


@pytest.fixture
def coach_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    with test_session() as db:
        user = User(name="Test User", email="coach@example.test", hashed_password="hash")
        db.add(user)
        db.flush()
        db.add(
            Profile(
                user_id=user.id,
                age=35,
                gender="male",
                height_cm=175,
                weight_kg=75,
                activity_level=ActivityLevel.MODERATE,
                goal=FitnessGoal.GENERAL_FITNESS,
                medical_conditions=None,
                injuries=None,
                dietary_preference=DietaryPreference.VEG,
                equipment=Equipment.HOME,
                track="General Fitness & Diet",
            )
        )
        db.commit()
        user_id = user.id

    def override_get_db():
        with test_session() as db:
            yield db

    def override_current_user():
        with test_session() as db:
            return db.get(User, user_id)

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    try:
        yield client, test_session, user_id, override_current_user
    finally:
        app.dependency_overrides.clear()
        client.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_coach_routes_require_auth_and_return_personalized_responses(
    coach_client,
    monkeypatch,
) -> None:
    client, test_session, user_id, override_current_user = coach_client
    monkeypatch.setattr(
        "app.services.coach.generate_text",
        lambda _prompt, fallback: LLMResult(
            text=fallback,
            used_fallback=True,
            provider="fallback",
        ),
    )

    assert client.post("/coach/explain").status_code == 401

    app.dependency_overrides[get_current_user] = override_current_user
    explain_response = client.post("/coach/explain")
    assert explain_response.status_code == 200
    explain_data = explain_response.json()
    assert explain_data["used_fallback"] is True
    assert explain_data["health_metrics"]["bmi"] == pytest.approx(24.49, abs=0.01)
    assert explain_data["health_metrics"]["bmr_kcal"] is not None
    assert explain_data["health_metrics"]["tdee_kcal"] is not None
    assert "BMR" in explain_data["insight"]

    adjust_response = client.post(
        "/coach/adjust",
        json={"feedback": "My knee hurts"},
    )
    assert adjust_response.status_code == 200
    assert "Stop any movement that triggers pain" in adjust_response.json()[
        "adjusted_plan_summary"
    ]

    with test_session() as db:
        saved_types = {
            plan.plan_type
            for plan in db.query(GeneratedPlan).filter_by(user_id=user_id).all()
        }
    assert saved_types == {"workout", "diet"}


def test_coach_explain_returns_not_found_without_profile(coach_client) -> None:
    client, test_session, user_id, override_current_user = coach_client
    app.dependency_overrides[get_current_user] = override_current_user
    with test_session() as db:
        db.query(Profile).filter_by(user_id=user_id).delete()
        db.commit()

    response = client.post("/coach/explain")

    assert response.status_code == 404
    assert "Profile not found" in response.json()["detail"]


def test_chat_uses_last_ten_messages_and_persists_both_replies(
    coach_client,
    monkeypatch,
) -> None:
    client, test_session, user_id, override_current_user = coach_client
    app.dependency_overrides[get_current_user] = override_current_user
    with test_session() as db:
        db.add_all(
            [
                ChatMessage(user_id=user_id, role="user", content=f"Earlier turn {index}")
                for index in range(12)
            ]
        )
        db.commit()

    captured = {}

    def fake_generate(prompt, fallback):
        captured["prompt"] = prompt
        captured["fallback"] = fallback
        return LLMResult(text="Your plan is ready.", used_fallback=False, provider="test")

    monkeypatch.setattr("app.services.chat.generate_text", fake_generate)
    response = client.post("/chat", json={"message": "Explain my workout"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["user_message"]["content"] == "Explain my workout"
    assert payload["assistant_message"]["content"] == "Your plan is ready."
    assert payload["provider"] == "test"
    assert '"content":"Earlier turn 0"' not in captured["prompt"]
    assert '"content":"Earlier turn 1"' not in captured["prompt"]
    assert '"content":"Earlier turn 2"' in captured["prompt"]
    assert '"content":"Earlier turn 11"' in captured["prompt"]
    assert "Explain my workout" in captured["prompt"]

    history_response = client.get("/chat/history")
    assert history_response.status_code == 200
    history = history_response.json()["messages"]
    assert len(history) == 14
    assert [item["role"] for item in history[-2:]] == ["user", "assistant"]


def test_chat_validates_input_and_requires_auth(coach_client) -> None:
    client, _test_session, _user_id, override_current_user = coach_client

    assert client.post("/chat", json={"message": "Hello"}).status_code == 401

    app.dependency_overrides[get_current_user] = override_current_user
    assert client.post("/chat", json={"message": " "}).status_code == 422
