from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ExplainedValue(BaseModel):
    value: float
    explanation: str


class ExplainedCategory(BaseModel):
    value: str
    explanation: str


class ExplainedMacro(BaseModel):
    grams: float
    calories: float
    explanation: str


class MacroResponse(BaseModel):
    protein: ExplainedMacro
    fat: ExplainedMacro
    carbs: ExplainedMacro


class HealthMetricsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    calculated_at: datetime
    bmi: ExplainedValue
    bmi_category: ExplainedCategory
    bmr_kcal: ExplainedValue
    tdee_kcal: ExplainedValue
    calorie_target_kcal: ExplainedValue
    macros: MacroResponse
