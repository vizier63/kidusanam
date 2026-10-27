from app.services import llm_client
from app.services.coach import adjust_fallback, explain_fallback


def coach_context() -> dict:
    return {
        "profile": {
            "dietary_preference": "veg",
            "goal": "general_fitness",
            "injuries": None,
        },
        "track": "General Fitness & Diet",
        "health_metrics": {
            "bmi": 23.4,
            "bmi_category": "Normal weight",
            "bmr_kcal": 1450,
            "tdee_kcal": 2247.5,
            "calorie_target_kcal": 2247.5,
        },
        "current_workout_plan": {
            "track": "General Fitness & Diet",
            "days": [
                {"day": 1, "focus": "Full body"},
                {"day": 2, "focus": "Cardio + mobility"},
                {"day": 3, "focus": "Full body"},
            ],
        },
        "current_diet_plan": {
            "targets": {
                "calories": 2248,
                "protein_g": 112,
                "carbs_g": 312,
                "fat_g": 63,
            }
        },
        "recent_progress": [],
    }


def test_explain_fallback_cites_bmi_bmr_tdee_and_plan() -> None:
    explanation = explain_fallback(coach_context())

    assert "23.4" in explanation
    assert "1450.0 kcal/day" in explanation
    assert "2247.5 kcal/day" in explanation
    assert "Full body" in explanation
    assert "2248 kcal per day" in explanation


def test_adjust_fallback_responds_safely_to_pain() -> None:
    summary = adjust_fallback(coach_context(), "My knee hurts")

    assert "Stop any movement that triggers pain" in summary
    assert "healthcare professional" in summary
    assert "saved plans have not been changed" in summary


def test_adjust_fallback_scales_back_when_workout_is_too_hard() -> None:
    summary = adjust_fallback(coach_context(), "This feels too hard")

    assert "reducing each exercise by one set" in summary
    assert "longer rests" in summary


def test_llm_returns_fallback_without_configured_credentials(monkeypatch) -> None:
    monkeypatch.setattr(llm_client, "_configured_provider", lambda: None)

    result = llm_client.generate_text("safe prompt", "safe fallback")

    assert result.text == "safe fallback"
    assert result.used_fallback is True
    assert result.provider == "fallback"


def test_llm_returns_fallback_after_provider_timeout(monkeypatch) -> None:
    monkeypatch.setattr(llm_client, "_configured_provider", lambda: ("gemini", "test-key"))

    def timeout(*_args):
        raise TimeoutError("request timed out")

    monkeypatch.setattr(llm_client, "_generate_gemini", timeout)
    result = llm_client.generate_text("safe prompt", "safe fallback")

    assert result.text == "safe fallback"
    assert result.used_fallback is True
    assert result.provider == "gemini"


def test_llm_http_request_uses_ten_second_timeout(monkeypatch) -> None:
    captured = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def read(self):
            return b'{"ok":true}'

    def fake_urlopen(request, timeout):
        captured["request"] = request
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr(llm_client, "urlopen", fake_urlopen)
    result = llm_client._post_json("https://provider.test", {}, {})

    assert result == {"ok": True}
    assert captured["timeout"] == 10


def test_groq_provider_uses_bearer_auth_and_parses_completion(monkeypatch) -> None:
    captured = {}

    def fake_post(url, payload, headers):
        captured.update(url=url, payload=payload, headers=headers)
        return {"choices": [{"message": {"content": "A safe coaching insight."}}]}

    monkeypatch.setattr(llm_client, "_post_json", fake_post)
    result = llm_client._generate_groq("prompt", "groq-test-key")

    assert result == "A safe coaching insight."
    assert captured["headers"]["Authorization"] == "Bearer groq-test-key"
    assert captured["payload"]["messages"][0]["content"] == "prompt"
