from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import ProfileResponse, ProfileUpdate
from app.services.coaching_track import assign_coaching_track

router = APIRouter(prefix="/profile", tags=["profile"])


@router.put("", response_model=ProfileResponse)
def upsert_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Profile:
    profile = db.get(Profile, current_user.id)
    if profile is None:
        profile = Profile(user_id=current_user.id)
        db.add(profile)

    profile_data = payload.model_dump()
    profile_data["track"] = assign_coaching_track(
        age=payload.age,
        medical_conditions=payload.medical_conditions,
        injuries=payload.injuries,
        goal=payload.goal,
    )
    for field, value in profile_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.get("", response_model=ProfileResponse)
def read_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Profile:
    profile = db.get(Profile, current_user.id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )
    return profile
