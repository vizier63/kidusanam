import math
from typing import TypedDict

from app.models.profile import ActivityLevel, FitnessGoal

ACTIVITY_MULTIPLIERS = {
    ActivityLevel.SEDENTARY.value: 1.2,
    ActivityLevel.LIGHT.value: 1.375,
    ActivityLevel.MODERATE.value: 1.55,
    ActivityLevel.ACTIVE.value: 1.725,
    ActivityLevel.VERY_ACTIVE.value: 1.9,
}
CALORIE_FLOORS = {"female": 1200.0, "male": 1500.0}
GOAL_ADJUSTMENTS = {
    FitnessGoal.WEIGHT_LOSS.value: -500.0,
    FitnessGoal.MUSCLE_GAIN.value: 300.0,
    FitnessGoal.GENERAL_FITNESS.value: 0.0,
}


class MacroValue(TypedDict):
    grams: float
    calories: float


class MacroBreakdown(TypedDict):
    protein: MacroValue
    fat: MacroValue
    carbs: MacroValue


def _positive_finite(value: float, name: str) -> None:
    if not math.isfinite(value) or value <= 0:
        raise ValueError(f"{name} must be a positive finite number")


def bmi(weight_kg: float, height_cm: float) -> float:
    _positive_finite(weight_kg, "weight_kg")
    _positive_finite(height_cm, "height_cm")
    return weight_kg / (height_cm / 100) ** 2


def bmi_category(bmi_value: float) -> str:
    if not math.isfinite(bmi_value) or bmi_value <= 0:
        raise ValueError("BMI must be a positive finite number")
    if bmi_value < 18.5:
        return "Underweight"
    if bmi_value < 25:
        return "Normal weight"
    if bmi_value < 30:
        return "Overweight"
    if bmi_value < 35:
        return "Obesity class I"
    if bmi_value < 40:
        return "Obesity class II"
    return "Obesity class III"


def bmr(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    _positive_finite(weight_kg, "weight_kg")
    _positive_finite(height_cm, "height_cm")
    if age <= 0:
        raise ValueError("age must be a positive integer")
    normalized_gender = gender.strip().lower()
    if normalized_gender not in CALORIE_FLOORS:
        raise ValueError("gender must be 'male' or 'female' for the Mifflin-St Jeor equation")
    gender_constant = 5 if normalized_gender == "male" else -161
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + gender_constant


def tdee(bmr_value: float, activity_level: ActivityLevel | str) -> float:
    _positive_finite(bmr_value, "bmr")
    level = activity_level.value if isinstance(activity_level, ActivityLevel) else activity_level
    try:
        multiplier = ACTIVITY_MULTIPLIERS[level]
    except KeyError:
        raise ValueError(f"Unsupported activity level: {level}") from None
    return bmr_value * multiplier


def calorie_target(
    tdee_value: float,
    goal: FitnessGoal | str,
    gender: str,
) -> float:
    _positive_finite(tdee_value, "tdee")
    normalized_gender = gender.strip().lower()
    try:
        minimum = CALORIE_FLOORS[normalized_gender]
    except KeyError:
        raise ValueError("gender must be 'male' or 'female' for calorie minimums") from None
    goal_value = goal.value if isinstance(goal, FitnessGoal) else goal
    try:
        adjustment = GOAL_ADJUSTMENTS[goal_value]
    except KeyError:
        raise ValueError(f"Unsupported fitness goal: {goal_value}") from None
    return max(minimum, tdee_value + adjustment)


def macros(
    weight_kg: float,
    calories: float,
    goal: FitnessGoal | str,
    age: int,
) -> MacroBreakdown:
    _positive_finite(weight_kg, "weight_kg")
    _positive_finite(calories, "calories")
    if age <= 0:
        raise ValueError("age must be a positive integer")
    goal_value = goal.value if isinstance(goal, FitnessGoal) else goal
    if goal_value not in GOAL_ADJUSTMENTS:
        raise ValueError(f"Unsupported fitness goal: {goal_value}")

    protein_per_kg = 1.2 if age >= 60 else 2.0 if goal_value == FitnessGoal.MUSCLE_GAIN.value else 1.6
    protein_grams = weight_kg * protein_per_kg
    protein_calories = protein_grams * 4
    fat_calories = calories * 0.25
    fat_grams = fat_calories / 9
    carbs_calories = calories - protein_calories - fat_calories
    if carbs_calories < 0:
        raise ValueError(
            "Calorie target is too low to support the requested protein and fat macro targets"
        )

    return {
        "protein": {"grams": protein_grams, "calories": protein_calories},
        "fat": {"grams": fat_grams, "calories": fat_calories},
        "carbs": {"grams": carbs_calories / 4, "calories": carbs_calories},
    }
