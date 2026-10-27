import json
import re
from pathlib import Path
from typing import Any

from app.models.profile import Equipment

EXERCISE_LIBRARY_PATH = Path(__file__).resolve().parents[1] / "data" / "exercises.json"
EXERCISE_LIBRARY: list[dict[str, Any]] = json.loads(
    EXERCISE_LIBRARY_PATH.read_text(encoding="utf-8")
)

TRACK_MUSCLE_STRENGTH = "Muscle & Strength"
TRACK_GENERAL = "General Fitness & Diet"
TRACK_ELDERLY = "Elderly / Health-Constrained"

INJURY_ALIASES = {
    "knee": ("knee", "knees", "acl", "meniscus"),
    "back": ("back", "spine", "disc", "sciatica", "lumbar"),
    "shoulder": ("shoulder", "rotator cuff"),
    "wrist": ("wrist", "carpal"),
    "ankle": ("ankle", "foot", "feet"),
    "hip": ("hip", "hips"),
    "elbow": ("elbow",),
}

WEEKLY_SPLIT = (
    ("Push", ("push",)),
    ("Pull", ("pull",)),
    ("Legs", ("legs",)),
    ("Active recovery", ("mobility", "cardio")),
    ("Push", ("push",)),
    ("Pull", ("pull",)),
    ("Legs", ("legs",)),
)

GENERAL_SCHEDULE = (
    ("Full body + cardio", ("full_body", "cardio", "push", "pull", "legs")),
    ("Cardio + mobility", ("cardio", "mobility")),
    ("Full body", ("full_body", "push", "pull", "legs")),
    ("Active recovery", ("cardio", "mobility")),
    ("Full body + cardio", ("full_body", "cardio", "push", "pull", "legs")),
    ("Cardio + mobility", ("cardio", "mobility")),
    ("Rest and mobility", ("mobility",)),
)

WEIGHT_LOSS_SCHEDULE = (
    ("Full body + cardio", ("full_body", "cardio", "push", "pull", "legs")),
    ("Steady cardio + mobility", ("cardio", "mobility")),
    ("Full-body strength", ("full_body", "push", "pull", "legs")),
    ("Walking + recovery", ("cardio", "mobility")),
    ("Full body + cardio", ("full_body", "cardio", "push", "pull", "legs")),
    ("Steady cardio + mobility", ("cardio", "mobility")),
    ("Rest and mobility", ("mobility",)),
)

GENERAL_STRENGTH_SCHEDULE = (
    ("Full-body strength", ("full_body", "push", "pull", "legs")),
    ("Strength + mobility", ("push", "pull", "mobility")),
    ("Full-body strength", ("full_body", "push", "pull", "legs")),
    ("Active recovery", ("cardio", "mobility")),
    ("Full-body strength", ("full_body", "push", "pull", "legs")),
    ("Strength + mobility", ("push", "pull", "mobility")),
    ("Rest and mobility", ("mobility",)),
)

ELDERLY_SCHEDULE = (
    ("Walking + mobility", ("cardio", "mobility", "low_impact")),
    ("Light resistance", ("low_impact", "mobility")),
    ("Walking + balance", ("cardio", "mobility", "low_impact")),
    ("Recovery and mobility", ("mobility",)),
    ("Light resistance + walk", ("low_impact", "cardio", "mobility")),
    ("Walking + mobility", ("cardio", "mobility", "low_impact")),
    ("Rest and gentle mobility", ("mobility",)),
)


def _equipment_options(equipment: Equipment | str) -> set[str]:
    value = equipment.value if isinstance(equipment, Equipment) else equipment
    if value == Equipment.NONE.value:
        return {"none"}
    if value == Equipment.HOME.value:
        return {"none", "home"}
    if value == Equipment.GYM.value:
        return {"none", "home", "gym"}
    raise ValueError(f"Unsupported equipment option: {value}")


def _injury_tags(injuries: str | None) -> set[str]:
    if not injuries or not injuries.strip():
        return set()
    text = injuries.lower()
    tags = {
        tag
        for tag, aliases in INJURY_ALIASES.items()
        if any(re.search(rf"\b{re.escape(alias)}\b", text) for alias in aliases)
    }
    return tags or {"general"}


def _exercise_is_available(
    exercise: dict[str, Any],
    equipment_options: set[str],
    injury_tags: set[str],
) -> bool:
    has_equipment = bool(set(exercise["equipment"]) & equipment_options)
    conflicts = bool(set(exercise["contraindicated_injuries"]) & injury_tags)
    if "general" in injury_tags and exercise["category"] in {"cardio"}:
        conflicts = True
    return has_equipment and not conflicts


def _public_exercise(exercise: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": exercise["id"],
        "name": exercise["name"],
        "muscle_group": exercise["muscle_group"],
        "category": exercise["category"],
        "difficulty": exercise["difficulty"],
        "sets": exercise["sets"],
        "reps": exercise["reps"],
    }


def _alternative_for(
    exercise: dict[str, Any],
    compatible: list[dict[str, Any]],
) -> dict[str, Any]:
    preferred = [
        candidate
        for candidate in compatible
        if candidate["category"] == exercise["category"]
        and candidate["id"] != exercise["id"]
    ]
    fallback = [
        candidate
        for candidate in compatible
        if candidate["id"] != exercise["id"]
    ]
    safe_mobility = next(
        (candidate for candidate in compatible if candidate["id"] == "chair-yoga"),
        None,
    )
    selected = (preferred or fallback or ([safe_mobility] if safe_mobility else []))
    if not selected:
        selected = compatible
    return _public_exercise(selected[0]) if selected else {
        "id": "none-available",
        "name": "Rest and consult a qualified professional",
        "muscle_group": "recovery",
        "category": "mobility",
        "difficulty": "beginner",
        "sets": 1,
        "reps": "as comfortable",
    }


def generate_workout_plan(
    *,
    track: str,
    goal: str,
    equipment: Equipment | str,
    injuries: str | None,
) -> dict[str, Any]:
    equipment_options = _equipment_options(equipment)
    injury_tags = _injury_tags(injuries)
    compatible = [
        exercise
        for exercise in EXERCISE_LIBRARY
        if _exercise_is_available(exercise, equipment_options, injury_tags)
    ]

    if track == TRACK_ELDERLY:
        schedule = ELDERLY_SCHEDULE
        exercise_limit = 3
    elif track == TRACK_MUSCLE_STRENGTH:
        schedule = WEEKLY_SPLIT
        exercise_limit = 4
    elif goal == "weight_loss":
        schedule = WEIGHT_LOSS_SCHEDULE
        exercise_limit = 4
    elif goal == "muscle_gain":
        schedule = GENERAL_STRENGTH_SCHEDULE
        exercise_limit = 4
    else:
        schedule = GENERAL_SCHEDULE
        exercise_limit = 4

    days: list[dict[str, Any]] = []
    for day_index, (focus, categories) in enumerate(schedule):
        scheduled = [
            exercise
            for exercise in EXERCISE_LIBRARY
            if exercise["category"] in categories
        ]
        if track == TRACK_GENERAL and "full_body" in categories:
            scheduled = [
                exercise
                for exercise in scheduled
                if exercise["category"] == "full_body"
                or exercise["category"] in {"push", "pull", "legs", "cardio"}
            ]
        if track == TRACK_ELDERLY:
            scheduled = [
                exercise
                for exercise in scheduled
                if exercise["category"] in {"low_impact", "mobility", "cardio"}
            ]

        selected: list[dict[str, Any]] = []
        excluded: list[dict[str, Any]] = []
        for exercise in scheduled:
            if not _exercise_is_available(exercise, equipment_options, injury_tags):
                matching_injuries = sorted(
                    set(exercise["contraindicated_injuries"]) & injury_tags
                )
                if "general" in injury_tags and exercise["category"] == "cardio":
                    matching_injuries.append("unspecified injury")
                excluded.append(
                    {
                        "exercise": _public_exercise(exercise),
                        "conflicts_with": matching_injuries
                        or [f"requires {', '.join(exercise['equipment'])} equipment"],
                        "alternative": _alternative_for(exercise, compatible),
                    }
                )

        # Rotate eligible exercises across the week to add deterministic variety.
        eligible_by_category: dict[str, list[dict[str, Any]]] = {}
        for category in categories:
            eligible_by_category[category] = [
                exercise
                for exercise in compatible
                if exercise["category"] == category
            ]
        for category, pool in eligible_by_category.items():
            if not pool:
                continue
            offset = day_index % len(pool)
            rotated = pool[offset:] + pool[:offset]
            selected.extend(rotated)

        selected = selected[:exercise_limit]
        if not selected and compatible:
            selected = [
                next(
                    (item for item in compatible if item["id"] == "chair-yoga"),
                    compatible[0],
                )
            ]

        days.append(
            {
                "day": day_index + 1,
                "focus": focus,
                "exercises": [_public_exercise(exercise) for exercise in selected],
                "substitutions": excluded,
            }
        )

    return {
        "track": track,
        "goal": goal,
        "equipment": equipment.value if isinstance(equipment, Equipment) else equipment,
        "injury_filters": sorted(injury_tags),
        "days": days,
        "safety_note": (
            "Stop if an activity causes pain. Plans are general guidance; "
            "consult a qualified healthcare professional about injuries or limitations."
        ),
    }
