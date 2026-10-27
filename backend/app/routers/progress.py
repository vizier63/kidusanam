from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.progress_log import ProgressLog
from app.models.user import User
from app.schemas.progress import (
    ProgressHistoryResponse,
    ProgressLogCreate,
    ProgressLogResponse,
)

router = APIRouter(prefix="/progress", tags=["progress"])


@router.post("", response_model=ProgressLogResponse)
def create_progress_log(
    payload: ProgressLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProgressLog:
    log = db.scalar(
        select(ProgressLog).where(
            ProgressLog.user_id == current_user.id,
            ProgressLog.date == payload.date,
        )
    )
    if log is None:
        log = ProgressLog(user_id=current_user.id, date=payload.date)
        db.add(log)

    log.weight_kg = payload.weight_kg
    log.workout_completed = payload.workout_completed
    log.calories_consumed = payload.calories_consumed
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A progress log for this date is being saved; please retry.",
        ) from error
    db.refresh(log)
    return log


@router.get("", response_model=ProgressHistoryResponse)
def read_progress_logs(
    limit: int = Query(default=365, ge=1, le=2000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProgressHistoryResponse:
    newest_first = db.scalars(
        select(ProgressLog)
        .where(ProgressLog.user_id == current_user.id)
        .order_by(ProgressLog.date.desc())
        .limit(limit)
    ).all()
    return ProgressHistoryResponse(
        logs=[
            ProgressLogResponse.model_validate(log)
            for log in reversed(newest_first)
        ]
    )
