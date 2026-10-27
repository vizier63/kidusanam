from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message must not be blank")
        return value


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime


class ChatResponse(BaseModel):
    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse
    used_fallback: bool
    provider: str


class ChatHistoryResponse(BaseModel):
    messages: list[ChatMessageResponse]
