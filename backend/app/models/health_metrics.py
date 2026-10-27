from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class HealthMetrics(Base):
    __tablename__ = "health_metrics"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    bmi: Mapped[float] = mapped_column(Float, nullable=False)
    bmi_category: Mapped[str] = mapped_column(String(32), nullable=False)
    bmr_kcal: Mapped[float] = mapped_column(Float, nullable=False)
    tdee_kcal: Mapped[float] = mapped_column(Float, nullable=False)
    calorie_target_kcal: Mapped[float] = mapped_column(Float, nullable=False)
    protein_grams: Mapped[float] = mapped_column(Float, nullable=False)
    protein_calories: Mapped[float] = mapped_column(Float, nullable=False)
    fat_grams: Mapped[float] = mapped_column(Float, nullable=False)
    fat_calories: Mapped[float] = mapped_column(Float, nullable=False)
    carbs_grams: Mapped[float] = mapped_column(Float, nullable=False)
    carbs_calories: Mapped[float] = mapped_column(Float, nullable=False)
    explanations: Mapped[dict[str, str]] = mapped_column(JSON, nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
