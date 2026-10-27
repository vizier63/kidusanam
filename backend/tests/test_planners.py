from types import SimpleNamespace

import pytest

from app.models.profile import (
    ActivityLevel,
    DietaryPreference,
    Equipment,
    FitnessGoal,
)
from app.services.diet_planner import (
    FOOD_DATABASE,
    calculate_diet_targets,
    generate_diet_plan,
    get_allowed_foods,
    substitute_food,
)
from app.services.workout_planner import (
    EXERCISE_LIBRARY,
    TRACK_ELDERLY,
    TRACK_GENERAL,
    TRACK_MUSCLE_STRENGTH,
    generate_workout_plan,
)


def make_profile(
    *,
    track: str = TRACK_GENERAL,
    goal: FitnessGoal = FitnessGoal.GENERAL_FITNESS,
    equipment: Equipment = Equipment.HOME,
    injuries: str | None = None,
    dietary_preference: DietaryPreference = DietaryPreference.VEG,
) -> SimpleNamespace:
    return SimpleNamespace(
        track=track,
        goal=goal,
        equipment=equipment,
        injuries=injuries,
        dietary_preference=dietary_preference,
        weight_kg=70.0,
        height_cm=175.0,
        age=35,
        gender="female",
        activity_level=ActivityLevel.MODERATE,
    )


def test_exercise_and_food_catalogs_have_about_forty_entries() -> None:
    assert 38 <= len(EXERCISE_LIBRARY) <= 45
    assert 38 <= len(FOOD_DATABASE) <= 45


@pytest.mark.parametrize(
    ("track", "expected_focus"),
    [
        (TRACK_MUSCLE_STRENGTH, ["Push", "Pull", "Legs", "Active recovery", "Push", "Pull", "Legs"]),
        (TRACK_GENERAL, None),
        (TRACK_ELDERLY, None),
    ],
)
def test_workout_plan_has_seven_days_and_track_schedule(
    track: str,
    expected_focus: list[str] | None,
) -> None:
    plan = generate_workout_plan(
        track=track,
        goal=FitnessGoal.MUSCLE_GAIN.value,
        equipment=Equipment.HOME,
        injuries=None,
    )

    assert len(plan["days"]) == 7
    assert [day["day"] for day in plan["days"]] == list(range(1, 8))
    assert all(day["exercises"] for day in plan["days"])
    if expected_focus:
        assert [day["focus"] for day in plan["days"]] == expected_focus
    if track == TRACK_GENERAL:
        assert any(
            exercise["category"] == "cardio"
            for day in plan["days"]
            for exercise in day["exercises"]
        )
    if track == TRACK_ELDERLY:
        assert all(
            exercise["difficulty"] == "beginner"
            for day in plan["days"]
            for exercise in day["exercises"]
        )


def test_workout_excludes_injury_conflicts_and_suggests_alternatives() -> None:
    plan = generate_workout_plan(
        track=TRACK_GENERAL,
        goal=FitnessGoal.GENERAL_FITNESS.value,
        equipment=Equipment.GYM,
        injuries="Recurring knee pain",
    )
    selected_ids = {
        exercise["id"]
        for day in plan["days"]
        for exercise in day["exercises"]
    }
    unsafe_ids = {
        exercise["id"]
        for exercise in EXERCISE_LIBRARY
        if "knee" in exercise["contraindicated_injuries"]
    }
    assert "knee" in plan["injury_filters"]
    assert selected_ids.isdisjoint(unsafe_ids)
    assert all(
        exclusion["alternative"]["id"]
        for day in plan["days"]
        for exclusion in day["substitutions"]
    )


def test_workout_equipment_filter_excludes_gym_only_exercises() -> None:
    plan = generate_workout_plan(
        track=TRACK_MUSCLE_STRENGTH,
        goal=FitnessGoal.MUSCLE_GAIN.value,
        equipment=Equipment.NONE,
        injuries=None,
    )
    assert all(
        exercise["id"] not in {"lat-pulldown", "leg-press", "elliptical"}
        for day in plan["days"]
        for exercise in day["exercises"]
    )


def test_general_workout_schedule_responds_to_goal() -> None:
    general_fitness = generate_workout_plan(
        track=TRACK_GENERAL,
        goal=FitnessGoal.GENERAL_FITNESS.value,
        equipment=Equipment.HOME,
        injuries=None,
    )
    weight_loss = generate_workout_plan(
        track=TRACK_GENERAL,
        goal=FitnessGoal.WEIGHT_LOSS.value,
        equipment=Equipment.HOME,
        injuries=None,
    )

    assert general_fitness["days"][2]["focus"] == "Full body"
    assert weight_loss["days"][2]["focus"] == "Full-body strength"


@pytest.mark.parametrize(
    ("preference", "forbidden"),
    [
        (DietaryPreference.VEGAN, {"milk", "curd", "greek-yogurt", "paneer", "chicken", "egg", "fish", "salmon"}),
        (DietaryPreference.VEG, {"chicken", "egg", "egg-whites", "fish", "salmon"}),
    ],
)
def test_diet_plan_has_seven_days_and_respects_dietary_preference(
    preference: DietaryPreference,
    forbidden: set[str],
) -> None:
    profile = make_profile(dietary_preference=preference)
    plan = generate_diet_plan(profile)

    assert len(plan["days"]) == 7
    assert all(len(day["meals"]) == 4 for day in plan["days"])
    assert all(
        ingredient["food_id"] not in forbidden
        for day in plan["days"]
        for meal in day["meals"]
        for ingredient in meal["ingredients"]
    )
    assert all(
        len({ingredient["food_id"] for ingredient in meal["ingredients"]})
        == len(meal["ingredients"])
        for day in plan["days"]
        for meal in day["meals"]
    )
    target = calculate_diet_targets(profile)["calories"]
    assert all(abs(day["totals"]["calories"] - target) < 3 for day in plan["days"])
    for day in plan["days"]:
        assert abs(day["totals"]["protein"] - plan["targets"]["protein_g"]) < plan["targets"]["protein_g"] * 0.12
        assert abs(day["totals"]["carbs"] - plan["targets"]["carbs_g"]) < plan["targets"]["carbs_g"] * 0.08
        assert abs(day["totals"]["fat"] - plan["targets"]["fat_g"]) < plan["targets"]["fat_g"] * 0.08


def test_diet_substitution_obeys_preference_and_returns_similar_food() -> None:
    substitution = substitute_food("chicken", DietaryPreference.VEGAN)
    allowed_ids = {
        food["id"]
        for food in get_allowed_foods(DietaryPreference.VEGAN)
    }

    assert substitution["original"]["id"] == "chicken"
    assert substitution["substitute"]["id"] in allowed_ids
    assert substitution["substitute"]["id"] != "chicken"
    assert "similar" in substitution["reason"]
