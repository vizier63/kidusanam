from enum import Enum

from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ActivityLevel(str, Enum):
    SEDENTARY = "sedentary"
    LIGHT = "light"
    MODERATE = "moderate"
    ACTIVE = "active"
    VERY_ACTIVE = "very_active"


class FitnessGoal(str, Enum):
    WEIGHT_LOSS = "weight_loss"
    MUSCLE_GAIN = "muscle_gain"
    GENERAL_FITNESS = "general_fitness"


class DietaryPreference(str, Enum):
    VEG = "veg"
    NON_VEG = "non_veg"
    VEGAN = "vegan"


class Equipment(str, Enum):
    NONE = "none"
    HOME = "home"
    GYM = "gym"


def enum_values(enum_class: type[Enum]) -> list[str]:
    return [member.value for member in enum_class]


class Profile(Base):
    __tablename__ = "profiles"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(50), nullable=False)
    height_cm: Mapped[float] = mapped_column(nullable=False)
    weight_kg: Mapped[float] = mapped_column(nullable=False)
    activity_level: Mapped[ActivityLevel] = mapped_column(
        SQLAlchemyEnum(
            ActivityLevel,
            values_callable=enum_values,
            name="activity_level",
        ),
        nullable=False,
    )
    goal: Mapped[FitnessGoal] = mapped_column(
        SQLAlchemyEnum(FitnessGoal, values_callable=enum_values, name="fitness_goal"),
        nullable=False,
    )
    medical_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    injuries: Mapped[str | None] = mapped_column(Text, nullable=True)
    dietary_preference: Mapped[DietaryPreference] = mapped_column(
        SQLAlchemyEnum(
            DietaryPreference,
            values_callable=enum_values,
            name="dietary_preference",
        ),
        nullable=False,
    )
    equipment: Mapped[Equipment] = mapped_column(
        SQLAlchemyEnum(Equipment, values_callable=enum_values, name="equipment"),
        nullable=False,
    )
    track: Mapped[str] = mapped_column(String(50), nullable=False)

    user: Mapped["User"] = relationship(back_populates="profile")
