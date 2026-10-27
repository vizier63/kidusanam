from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.health_metrics import HealthMetrics
from app.models.profile import Profile
from app.models.user import User
from app.schemas.health_metrics import ExplainedCategory, ExplainedValue, HealthMetricsResponse
from app.services.health_engine import (
    bmi,
    bmi_category,
    bmr,
    calorie_target,
    macros,
    tdee,
)

router = APIRouter(prefix="/health-metrics", tags=["health metrics"])


@router.get("", response_model=HealthMetricsResponse)
def calculate_health_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HealthMetricsResponse:
    profile = db.get(Profile, current_user.id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found; create a profile before requesting health metrics",
        )

    try:
        bmi_value = bmi(profile.weight_kg, profile.height_cm)
        category = bmi_category(bmi_value)
        bmr_value = bmr(
            profile.weight_kg,
            profile.height_cm,
            profile.age,
            profile.gender,
        )
        tdee_value = tdee(bmr_value, profile.activity_level)
        target = calorie_target(tdee_value, profile.goal, profile.gender)
        macro_values = macros(profile.weight_kg, target, profile.goal, profile.age)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    explanations = {
        "bmi": "Weight in kilograms divided by height in meters squared.",
        "bmi_category": "WHO adult BMI categories: underweight <18.5, normal 18.5-24.9, overweight 25-29.9, obesity class I 30-34.9, class II 35-39.9, and class III >=40.",
        "bmr_kcal": (
            f"Mifflin-St Jeor ({profile.gender.strip().lower()}): 10 x "
            f"{profile.weight_kg} kg + 6.25 x {profile.height_cm} cm - "
            f"5 x {profile.age} years "
            f"{'+ 5' if profile.gender.strip().lower() == 'male' else '- 161'}."
        ),
        "tdee_kcal": (
            f"BMR ({bmr_value:.1f} kcal) multiplied by the "
            f"{profile.activity_level.value} activity factor "
            f"({tdee_value / bmr_value:.3f})."
        ),
        "calorie_target_kcal": (
            f"TDEE ({tdee_value:.1f} kcal) adjusted for the {profile.goal.value} "
            f"goal ({-500 if profile.goal.value == 'weight_loss' else 300 if profile.goal.value == 'muscle_gain' else 0:+} kcal), "
            f"then floored at "
            f"{'1500 kcal for male' if profile.gender.strip().lower() == 'male' else '1200 kcal for female'}."
        ),
        "protein": (
            f"{profile.weight_kg} kg x "
            f"{macro_values['protein']['grams'] / profile.weight_kg:.1f} g/kg"
            f"{' (elderly protein target)' if profile.age >= 60 else ' (muscle-gain target)' if profile.goal.value == 'muscle_gain' else ''}; "
            "4 kcal per gram."
        ),
        "fat": "Fat is set to 25% of the calorie target; 9 kcal per gram.",
        "carbs": "Remaining calorie target after protein and fat; 4 kcal per gram.",
    }

    record = HealthMetrics(
        user_id=current_user.id,
        bmi=bmi_value,
        bmi_category=category,
        bmr_kcal=bmr_value,
        tdee_kcal=tdee_value,
        calorie_target_kcal=target,
        protein_grams=macro_values["protein"]["grams"],
        protein_calories=macro_values["protein"]["calories"],
        fat_grams=macro_values["fat"]["grams"],
        fat_calories=macro_values["fat"]["calories"],
        carbs_grams=macro_values["carbs"]["grams"],
        carbs_calories=macro_values["carbs"]["calories"],
        explanations=explanations,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return HealthMetricsResponse(
        calculated_at=record.calculated_at,
        bmi=ExplainedValue(value=record.bmi, explanation=explanations["bmi"]),
        bmi_category=ExplainedCategory(
            value=record.bmi_category,
            explanation=explanations["bmi_category"],
        ),
        bmr_kcal=ExplainedValue(
            value=record.bmr_kcal,
            explanation=explanations["bmr_kcal"],
        ),
        tdee_kcal=ExplainedValue(
            value=record.tdee_kcal,
            explanation=explanations["tdee_kcal"],
        ),
        calorie_target_kcal=ExplainedValue(
            value=record.calorie_target_kcal,
            explanation=explanations["calorie_target_kcal"],
        ),
        macros={
            name: {
                **macro_values[name],
                "explanation": explanations[name],
            }
            for name in ("protein", "fat", "carbs")
        },
    )
