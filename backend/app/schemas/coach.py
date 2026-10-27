from typing import Any

from pydantic import BaseModel, Field, field_validator


class CoachExplainResponse(BaseModel):
    insight: str
    used_fallback: bool
    provider: str
    health_metrics: dict[str, Any]


class CoachAdjustRequest(BaseModel):
    feedback: str = Field(min_length=1, max_length=1000)

    @field_validator("feedback")
    @classmethod
    def feedback_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Feedback must not be blank")
        return value


class CoachAdjustResponse(BaseModel):
    adjusted_plan_summary: str
    used_fallback: bool
    provider: str
    feedback: str
