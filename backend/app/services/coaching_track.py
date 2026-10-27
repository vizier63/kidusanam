from app.models.profile import FitnessGoal

ELDERLY_HEALTH_CONSTRAINED = "Elderly / Health-Constrained"
MUSCLE_STRENGTH = "Muscle & Strength"
GENERAL_FITNESS_DIET = "General Fitness & Diet"


def assign_coaching_track(
    age: int,
    medical_conditions: str | None,
    injuries: str | None,
    goal: FitnessGoal,
) -> str:
    if age >= 60 or medical_conditions or injuries:
        return ELDERLY_HEALTH_CONSTRAINED
    if goal == FitnessGoal.MUSCLE_GAIN:
        return MUSCLE_STRENGTH
    return GENERAL_FITNESS_DIET
