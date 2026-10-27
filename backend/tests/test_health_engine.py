import pytest

from app.models.profile import ActivityLevel, FitnessGoal
from app.services.health_engine import (
    bmi,
    bmi_category,
    bmr,
    calorie_target,
    macros,
    tdee,
)


@pytest.mark.parametrize(
    ("bmi_value", "expected"),
    [
        (18.49, "Underweight"),
        (18.5, "Normal weight"),
        (24.99, "Normal weight"),
        (25, "Overweight"),
        (29.99, "Overweight"),
        (30, "Obesity class I"),
        (35, "Obesity class II"),
        (40, "Obesity class III"),
    ],
)
def test_bmi_category_uses_who_adult_boundaries(bmi_value: float, expected: str) -> None:
    assert bmi_category(bmi_value) == expected


def test_bmi_uses_kilograms_and_meters() -> None:
    assert bmi(70, 175) == pytest.approx(22.8571428571)


@pytest.mark.parametrize(
    ("gender", "expected"),
    [
        ("male", 10 * 70 + 6.25 * 175 - 5 * 30 + 5),
        ("female", 10 * 70 + 6.25 * 175 - 5 * 30 - 161),
    ],
)
def test_bmr_uses_mifflin_st_jeor(gender: str, expected: float) -> None:
    assert bmr(70, 175, 30, gender) == pytest.approx(expected)


@pytest.mark.parametrize(
    ("level", "multiplier"),
    [
        (ActivityLevel.SEDENTARY, 1.2),
        (ActivityLevel.LIGHT, 1.375),
        (ActivityLevel.MODERATE, 1.55),
        (ActivityLevel.ACTIVE, 1.725),
        (ActivityLevel.VERY_ACTIVE, 1.9),
    ],
)
def test_tdee_uses_activity_multiplier(level: ActivityLevel, multiplier: float) -> None:
    assert tdee(1500, level) == pytest.approx(1500 * multiplier)


@pytest.mark.parametrize(
    ("goal", "gender", "expected"),
    [
        (FitnessGoal.WEIGHT_LOSS, "female", 1200),
        (FitnessGoal.MUSCLE_GAIN, "male", 1900),
        (FitnessGoal.GENERAL_FITNESS, "female", 1600),
        (FitnessGoal.WEIGHT_LOSS, "male", 1500),
    ],
)
def test_calorie_target_applies_goal_and_minimum(
    goal: FitnessGoal,
    gender: str,
    expected: float,
) -> None:
    assert calorie_target(1600, goal, gender) == pytest.approx(expected)


def test_macros_use_goal_protein_and_calorie_remainder() -> None:
    result = macros(70, 2200, FitnessGoal.MUSCLE_GAIN, 30)

    assert result["protein"]["grams"] == pytest.approx(140)
    assert result["protein"]["calories"] == pytest.approx(560)
    assert result["fat"]["calories"] == pytest.approx(550)
    assert result["fat"]["grams"] == pytest.approx(550 / 9)
    assert result["carbs"]["calories"] == pytest.approx(2200 - 560 - 550)
    assert result["carbs"]["grams"] == pytest.approx((2200 - 560 - 550) / 4)


def test_elderly_protein_target_takes_precedence_over_muscle_gain() -> None:
    result = macros(70, 2200, FitnessGoal.MUSCLE_GAIN, 60)

    assert result["protein"]["grams"] == pytest.approx(84)


@pytest.mark.parametrize(
    ("function", "args"),
    [
        (bmi, (0, 175)),
        (bmi, (70, 0)),
        (bmi_category, (0,)),
        (bmr, (70, 175, 30, "unspecified")),
        (tdee, (1500, "unknown")),
        (calorie_target, (1600, "unknown", "female")),
        (macros, (70, 100, FitnessGoal.MUSCLE_GAIN, 30)),
    ],
)
def test_invalid_inputs_raise_clear_errors(function, args) -> None:
    with pytest.raises(ValueError):
        function(*args)
