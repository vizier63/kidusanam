from typing import Any, Literal

from pydantic import BaseModel, Field


class GeneratedPlanResponse(BaseModel):
    id: int
    generated_at: str
    plan: dict[str, Any]


class DietSubstituteRequest(BaseModel):
    food_id: str = Field(min_length=1, max_length=80)
    day: int = Field(ge=1, le=7)
    meal: Literal["breakfast", "lunch", "snack", "dinner"]


class DietSubstituteResponse(BaseModel):
    plan_id: int
    day: int
    meal: str
    original: dict[str, Any]
    substitute: dict[str, Any]
    reason: str
    plan: dict[str, Any]
