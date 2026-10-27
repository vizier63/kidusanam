from copy import deepcopy
from datetime import timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.generated_plan import GeneratedPlan
from app.models.profile import Profile
from app.models.user import User
from app.schemas.plans import (
    DietSubstituteRequest,
    DietSubstituteResponse,
    GeneratedPlanResponse,
)
from app.services.diet_planner import (
    calculate_diet_targets,
    generate_diet_plan,
    substitute_food,
)
from app.services.workout_planner import generate_workout_plan

router = APIRouter(prefix="/plans", tags=["plans"])


def _require_profile(db: Session, user_id: int) -> Profile:
    profile = db.get(Profile, user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found; create a profile before requesting plans",
        )
    return profile


def _plan_response(record: GeneratedPlan) -> GeneratedPlanResponse:
    generated_at = record.generated_at
    if generated_at.tzinfo is None:
        generated_at = generated_at.replace(tzinfo=timezone.utc)
    return GeneratedPlanResponse(
        id=record.id,
        generated_at=generated_at.isoformat(),
        plan=record.plan_data,
    )


def _save_plan(
    db: Session,
    user_id: int,
    plan_type: str,
    plan_data: dict[str, Any],
) -> GeneratedPlan:
    record = GeneratedPlan(
        user_id=user_id,
        plan_type=plan_type,
        plan_data=plan_data,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/workout", response_model=GeneratedPlanResponse)
def get_workout_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GeneratedPlanResponse:
    profile = _require_profile(db, current_user.id)
    plan_data = generate_workout_plan(
        track=profile.track,
        goal=profile.goal.value,
        equipment=profile.equipment,
        injuries=profile.injuries,
    )
    return _plan_response(
        _save_plan(db, current_user.id, "workout", plan_data)
    )


@router.get("/diet", response_model=GeneratedPlanResponse)
def get_diet_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GeneratedPlanResponse:
    profile = _require_profile(db, current_user.id)
    try:
        targets = calculate_diet_targets(profile)
        plan_data = generate_diet_plan(
            profile,
            target_calories=targets["calories"],
            target_macros=targets["macros"],
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error
    return _plan_response(_save_plan(db, current_user.id, "diet", plan_data))


@router.post("/diet/substitute", response_model=DietSubstituteResponse)
def substitute_diet_food(
    payload: DietSubstituteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DietSubstituteResponse:
    profile = _require_profile(db, current_user.id)
    record = db.scalar(
        select(GeneratedPlan)
        .where(
            GeneratedPlan.user_id == current_user.id,
            GeneratedPlan.plan_type == "diet",
        )
        .order_by(GeneratedPlan.generated_at.desc(), GeneratedPlan.id.desc())
        .limit(1)
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generate a diet plan before requesting a substitution",
        )
    plan_data = deepcopy(record.plan_data)
    day = next(
        (item for item in plan_data["days"] if item["day"] == payload.day),
        None,
    )
    if day is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Day {payload.day} was not found in the diet plan",
        )
    meal = next(
        (item for item in day["meals"] if item["name"].lower() == payload.meal),
        None,
    )
    if meal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meal '{payload.meal}' was not found in the diet plan",
        )
    ingredient = next(
        (
            item
            for item in meal["ingredients"]
            if item["food_id"] == payload.food_id
        ),
        None,
    )
    if ingredient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food was not found in the selected meal",
        )
    try:
        sibling_food_ids = {
            item["food_id"]
            for item in meal["ingredients"]
            if item["food_id"] != payload.food_id
        }
        suggestion = substitute_food(
            payload.food_id,
            profile.dietary_preference,
            exclude_food_ids=sibling_food_ids,
        )
    except KeyError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    original = dict(ingredient)
    alternative = suggestion["substitute"]
    factor = ingredient["serving_g"] / 100
    replacement = {
        "food_id": alternative["id"],
        "name": alternative["name"],
        "serving_g": ingredient["serving_g"],
        "calories": round(alternative["calories"] * factor, 1),
        "protein": round(alternative["protein"] * factor, 1),
        "carbs": round(alternative["carbs"] * factor, 1),
        "fat": round(alternative["fat"] * factor, 1),
    }
    ingredient_index = meal["ingredients"].index(ingredient)
    meal["ingredients"][ingredient_index] = replacement
    meal["totals"] = _recalculate_totals(meal["ingredients"])
    day["totals"] = _recalculate_totals(
        [food for item in day["meals"] for food in item["ingredients"]]
    )
    record.plan_data = plan_data
    db.commit()
    db.refresh(record)

    return DietSubstituteResponse(
        plan_id=record.id,
        day=payload.day,
        meal=payload.meal,
        original=original,
        substitute=replacement,
        reason=suggestion["reason"],
        plan=record.plan_data,
    )


def _recalculate_totals(ingredients: list[dict[str, Any]]) -> dict[str, float]:
    return {
        field: round(sum(item[field] for item in ingredients), 1)
        for field in ("calories", "protein", "carbs", "fat")
    }
