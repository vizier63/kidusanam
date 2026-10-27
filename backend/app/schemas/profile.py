from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.profile import (
    ActivityLevel,
    DietaryPreference,
    Equipment,
    FitnessGoal,
)


class ProfileUpdate(BaseModel):
    age: int = Field(ge=1, le=120)
    gender: str = Field(min_length=1, max_length=50)
    height_cm: float = Field(gt=0, le=300)
    weight_kg: float = Field(gt=0, le=500)
    activity_level: ActivityLevel
    goal: FitnessGoal
    medical_conditions: str | None = Field(default=None, max_length=2000)
    injuries: str | None = Field(default=None, max_length=2000)
    dietary_preference: DietaryPreference
    equipment: Equipment

    @field_validator("gender")
    @classmethod
    def gender_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Gender must not be blank")
        return value

    @field_validator("medical_conditions", "injuries")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    age: int
    gender: str
    height_cm: float
    weight_kg: float
    activity_level: ActivityLevel
    goal: FitnessGoal
    medical_conditions: str | None
    injuries: str | None
    dietary_preference: DietaryPreference
    equipment: Equipment
    track: str
