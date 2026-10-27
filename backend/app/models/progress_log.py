from datetime import date

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ProgressLog(Base):
    __tablename__ = "progress_logs"
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_progress_logs_user_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    workout_completed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    calories_consumed: Mapped[int | None] = mapped_column(Integer, nullable=True)
