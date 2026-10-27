from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.chat import (
    ChatHistoryResponse,
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
)
from app.services.chat import get_chat_history, send_chat_message

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def post_chat_message(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    try:
        user_message, assistant_message, result = send_chat_message(
            db,
            current_user.id,
            payload.message,
        )
    except ValueError as error:
        detail = str(error)
        code = (
            status.HTTP_404_NOT_FOUND
            if detail.startswith("Profile not found")
            else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        raise HTTPException(status_code=code, detail=detail) from error
    return ChatResponse(
        user_message=ChatMessageResponse.model_validate(user_message),
        assistant_message=ChatMessageResponse.model_validate(assistant_message),
        used_fallback=result.used_fallback,
        provider=result.provider,
    )


@router.get("/chat/history", response_model=ChatHistoryResponse)
def read_chat_history(
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatHistoryResponse:
    messages = get_chat_history(db, current_user.id, limit)
    return ChatHistoryResponse(
        messages=[ChatMessageResponse.model_validate(message) for message in messages]
    )
