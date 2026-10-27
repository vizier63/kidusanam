from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.coach import (
    CoachAdjustRequest,
    CoachAdjustResponse,
    CoachExplainResponse,
)
from app.services.coach import adjust_plan, build_user_context, explain_plan

router = APIRouter(prefix="/coach", tags=["coach"])


def _get_context(db: Session, user_id: int) -> dict:
    try:
        return build_user_context(db, user_id)
    except ValueError as error:
        detail = str(error)
        code = (
            status.HTTP_404_NOT_FOUND
            if detail.startswith("Profile not found")
            else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        raise HTTPException(status_code=code, detail=detail) from error


@router.post("/explain", response_model=CoachExplainResponse)
def explain_current_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CoachExplainResponse:
    context = _get_context(db, current_user.id)
    result = explain_plan(context)
    return CoachExplainResponse(
        insight=result.text,
        used_fallback=result.used_fallback,
        provider=result.provider,
        health_metrics=context["health_metrics"],
    )


@router.post("/adjust", response_model=CoachAdjustResponse)
def adjust_current_plan(
    payload: CoachAdjustRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CoachAdjustResponse:
    context = _get_context(db, current_user.id)
    result = adjust_plan(context, payload.feedback)
    return CoachAdjustResponse(
        adjusted_plan_summary=result.text,
        used_fallback=result.used_fallback,
        provider=result.provider,
        feedback=payload.feedback,
    )
