from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProgressLogCreate(BaseModel):
    date: date
    weight_kg: float | None = Field(default=None, gt=0, le=500)
    workout_completed: bool = False
    calories_consumed: int | None = Field(default=None, ge=0, le=20000)

    @field_validator("date")
    @classmethod
    def date_must_not_be_in_future(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Progress date cannot be in the future")
        return value

class ProgressLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date
    weight_kg: float | None
    workout_completed: bool
    calories_consumed: int | None


class ProgressHistoryResponse(BaseModel):
    logs: list[ProgressLogResponse]
