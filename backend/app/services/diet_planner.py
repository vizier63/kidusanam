import json
from pathlib import Path
from typing import Any

from app.models.profile import DietaryPreference, FitnessGoal
from app.services.health_engine import bmr, calorie_target, macros, tdee

FOOD_DATABASE_PATH = Path(__file__).resolve().parents[1] / "data" / "foods.json"
FOOD_DATABASE: list[dict[str, Any]] = json.loads(
    FOOD_DATABASE_PATH.read_text(encoding="utf-8")
)
FOODS_BY_ID = {food["id"]: food for food in FOOD_DATABASE}

MEAL_TARGET_SHARES = {
    "breakfast": 0.25,
    "lunch": 0.35,
    "snack": 0.15,
    "dinner": 0.25,
}

MEAL_TEMPLATES = {
    "breakfast": (
        ("oats", "milk", "banana", "chia-seeds"),
        ("idli", "egg-whites", "tomato", "curd"),
        ("besan", "spinach", "tomato", "curd"),
        ("poha", "egg", "mixed-vegetables", "curd"),
        ("dosa", "tofu", "tomato", "spinach"),
        ("whole-wheat-bread", "egg", "tomato", "avocado"),
        ("oats", "soy-milk", "apple", "peanut-butter"),
    ),
    "lunch": (
        ("brown-rice", "dal", "mixed-vegetables", "curd"),
        ("whole-wheat-roti", "chicken", "spinach", "tomato"),
        ("white-rice", "rajma", "cucumber", "mixed-vegetables"),
        ("quinoa", "paneer", "broccoli", "tomato"),
        ("millet", "chickpeas", "spinach", "cucumber"),
        ("brown-rice", "fish", "broccoli", "tomato"),
        ("whole-wheat-roti", "tofu", "mixed-vegetables", "spinach"),
    ),
    "snack": (
        ("greek-yogurt", "banana", "almonds"),
        ("roasted-chana", "orange", "curd"),
        ("hummus", "whole-wheat-bread", "cucumber"),
        ("apple", "peanut-butter", "soy-milk"),
        ("paneer", "tomato", "cucumber"),
        ("egg-whites", "papaya", "almonds"),
        ("tofu", "orange", "chia-seeds"),
    ),
    "dinner": (
        ("whole-wheat-roti", "paneer", "mixed-vegetables", "spinach"),
        ("brown-rice", "tofu", "broccoli", "olive-oil"),
        ("sweet-potato", "chicken", "mixed-vegetables", "avocado"),
        ("whole-wheat-roti", "dal", "spinach", "curd"),
        ("quinoa", "salmon", "broccoli", "tomato"),
        ("white-rice", "chickpeas", "mixed-vegetables", "olive-oil"),
        ("millet", "egg", "spinach", "tomato"),
    ),
}

PORTION_GRAMS = {
    "oats": 45,
    "milk": 150,
    "soy-milk": 150,
    "banana": 80,
    "chia-seeds": 5,
    "idli": 100,
    "egg-whites": 100,
    "tomato": 80,
    "curd": 100,
    "besan": 60,
    "spinach": 60,
    "poha": 60,
    "egg": 50,
    "mixed-vegetables": 100,
    "dosa": 100,
    "tofu": 100,
    "whole-wheat-bread": 60,
    "avocado": 30,
    "apple": 100,
    "peanut-butter": 8,
    "brown-rice": 150,
    "white-rice": 150,
    "dal": 120,
    "chicken": 100,
    "cucumber": 80,
    "rajma": 120,
    "quinoa": 140,
    "paneer": 100,
    "broccoli": 100,
    "millet": 150,
    "chickpeas": 100,
    "fish": 100,
    "whole-wheat-roti": 60,
    "greek-yogurt": 100,
    "almonds": 10,
    "roasted-chana": 25,
    "orange": 100,
    "hummus": 30,
    "papaya": 120,
    "sweet-potato": 120,
    "salmon": 100,
    "olive-oil": 4,
}

NON_VEGETARIAN_IDS = {"chicken", "egg", "egg-whites", "fish", "salmon"}


def _preference_value(preference: DietaryPreference | str) -> str:
    return preference.value if isinstance(preference, DietaryPreference) else preference


def _food_is_allowed(food: dict[str, Any], preference: str) -> bool:
    food_tags = set(food.get("tags", []))
    if food["id"] in NON_VEGETARIAN_IDS:
        food_tags.add("non_veg")
    else:
        food_tags.update({"veg", "vegan"} if not food_tags else ())

    if preference == DietaryPreference.VEGAN.value:
        return "vegan" in food_tags
    if preference == DietaryPreference.VEG.value:
        return "veg" in food_tags or "vegan" in food_tags
    if preference == DietaryPreference.NON_VEG.value:
        return True
    raise ValueError(f"Unsupported dietary preference: {preference}")


def get_allowed_foods(preference: DietaryPreference | str) -> list[dict[str, Any]]:
    preference_value = _preference_value(preference)
    return [
        food
        for food in FOOD_DATABASE
        if _food_is_allowed(food, preference_value)
    ]


def substitute_food(
    food_id: str,
    preference: DietaryPreference | str,
    exclude_food_ids: set[str] | None = None,
) -> dict[str, Any]:
    original = FOODS_BY_ID.get(food_id)
    if original is None:
        raise KeyError(f"Food '{food_id}' was not found")

    allowed = [
        food
        for food in get_allowed_foods(preference)
        if food["id"] != food_id
        and food["id"] not in (exclude_food_ids or set())
    ]
    if not allowed:
        raise ValueError("No compatible food substitutions are available")

    # Prefer options with similar calories and protein per 100 g.
    alternative = min(
        allowed,
        key=lambda food: (
            abs(food["calories"] - original["calories"]) / max(original["calories"], 25)
            + abs(food["protein"] - original["protein"]) / max(original["protein"], 3)
        ),
    )
    return {
        "original": original,
        "substitute": alternative,
        "reason": (
            f"{alternative['name']} is allowed for the {_preference_value(preference)} "
            "dietary preference and has a similar calorie/protein profile per 100 g."
        ),
    }


def calculate_diet_targets(profile: Any) -> dict[str, Any]:
    basal = bmr(
        profile.weight_kg,
        profile.height_cm,
        profile.age,
        profile.gender,
    )
    daily_burn = tdee(basal, profile.activity_level)
    daily_calories = calorie_target(daily_burn, profile.goal, profile.gender)
    daily_macros = macros(
        profile.weight_kg,
        daily_calories,
        profile.goal,
        profile.age,
    )
    return {
        "calories": daily_calories,
        "macros": daily_macros,
    }


def _meal_food_ids(meal: str, day_index: int, preference: str) -> tuple[str, ...]:
    template = MEAL_TEMPLATES[meal][day_index]
    chosen: list[str] = []
    for template_index, food_id in enumerate(template):
        food = FOODS_BY_ID[food_id]
        remaining_ids = set(template[template_index + 1 :])
        if _food_is_allowed(food, preference) and food_id not in chosen:
            chosen.append(food_id)
            continue
        replacement_candidates = [
            candidate
            for candidate in FOOD_DATABASE
            if _food_is_allowed(candidate, preference)
            and candidate["id"] not in chosen
            and candidate["id"] not in remaining_ids
        ]
        if not replacement_candidates:
            replacement_candidates = [
                candidate
                for candidate in FOOD_DATABASE
                if _food_is_allowed(candidate, preference)
                and candidate["id"] not in chosen
            ]
        replacement = min(
            replacement_candidates,
            key=lambda candidate: (
                abs(candidate["calories"] - food["calories"])
                + abs(candidate["protein"] - food["protein"]) * 3
            ),
        )
        chosen.append(replacement["id"])
    return tuple(chosen)


def _food_entry(food_id: str, scale: float) -> dict[str, Any]:
    food = FOODS_BY_ID[food_id]
    grams = PORTION_GRAMS[food_id] * scale
    factor = grams / 100
    return {
        "food_id": food_id,
        "name": food["name"],
        "serving_g": round(grams, 1),
        "calories": round(food["calories"] * factor, 1),
        "protein": round(food["protein"] * factor, 1),
        "carbs": round(food["carbs"] * factor, 1),
        "fat": round(food["fat"] * factor, 1),
    }


def _totals(entries: list[dict[str, Any]]) -> dict[str, float]:
    return {
        field: round(sum(entry[field] for entry in entries), 1)
        for field in ("calories", "protein", "carbs", "fat")
    }


def _balance_daily_portions(
    ingredients: list[dict[str, Any]],
    target_calories: float,
    target_macros: dict[str, Any],
) -> list[dict[str, Any]]:
    targets = [
        target_calories,
        target_macros["protein"]["grams"],
        target_macros["carbs"]["grams"],
        target_macros["fat"]["grams"],
    ]
    fields = ("calories", "protein", "carbs", "fat")
    weights = [1 / max(target, 1) for target in targets]
    foods = [FOODS_BY_ID[item["food_id"]] for item in ingredients]
    initial = [float(item["serving_g"]) for item in ingredients]
    portions = initial.copy()
    nutrient_per_gram = [
        [food[field] / 100 for food in foods]
        for field in fields
    ]
    totals = [
        sum(nutrient_per_gram[index][i] * portions[i] for i in range(len(portions)))
        for index in range(len(fields))
    ]
    regularization = 0.0002

    for _ in range(120):
        for ingredient_index, starting_grams in enumerate(initial):
            regularization_weight = regularization / max(starting_grams, 1) ** 2
            denominator = regularization_weight + sum(
                (nutrient_per_gram[nutrient_index][ingredient_index] * weights[nutrient_index]) ** 2
                for nutrient_index in range(len(fields))
            )
            numerator = sum(
                nutrient_per_gram[nutrient_index][ingredient_index]
                * weights[nutrient_index] ** 2
                * (targets[nutrient_index] - totals[nutrient_index])
                for nutrient_index in range(len(fields))
            ) - regularization_weight * (portions[ingredient_index] - starting_grams)
            new_portion = min(
                max(
                    portions[ingredient_index] + numerator / denominator,
                    starting_grams * 0.5,
                ),
                starting_grams * 2,
            )
            change = new_portion - portions[ingredient_index]
            portions[ingredient_index] = new_portion
            for nutrient_index in range(len(fields)):
                totals[nutrient_index] += (
                    nutrient_per_gram[nutrient_index][ingredient_index] * change
                )

    calorie_scale = target_calories / totals[0] if totals[0] else 1.0
    portions = [portion * calorie_scale for portion in portions]

    return [
        _food_entry(item["food_id"], portions[index] / PORTION_GRAMS[item["food_id"]])
        for index, item in enumerate(ingredients)
    ]


def generate_diet_plan(
    profile: Any,
    target_calories: float | None = None,
    target_macros: dict[str, Any] | None = None,
) -> dict[str, Any]:
    preference = _preference_value(profile.dietary_preference)
    calculated_targets = calculate_diet_targets(profile)
    calories_target = (
        target_calories if target_calories is not None else calculated_targets["calories"]
    )
    macros_target = target_macros or calculated_targets["macros"]
    days: list[dict[str, Any]] = []

    for day_index in range(7):
        meal_ingredients: dict[str, list[dict[str, Any]]] = {}
        meal_calorie_targets: dict[str, float] = {}
        initial_ingredients: list[dict[str, Any]] = []
        for meal_name, share in MEAL_TARGET_SHARES.items():
            food_ids = _meal_food_ids(meal_name, day_index, preference)
            base_entries = [_food_entry(food_id, 1.0) for food_id in food_ids]
            base_calories = sum(entry["calories"] for entry in base_entries)
            meal_calorie_target = calories_target * share
            portion_scale = meal_calorie_target / base_calories if base_calories else 1.0
            ingredients = [
                _food_entry(food_id, portion_scale)
                for food_id in food_ids
            ]
            meal_ingredients[meal_name] = ingredients
            meal_calorie_targets[meal_name] = meal_calorie_target
            initial_ingredients.extend(ingredients)

        balanced_ingredients = _balance_daily_portions(
            initial_ingredients,
            calories_target,
            macros_target,
        )
        balanced_by_meal: dict[str, list[dict[str, Any]]] = {}
        ingredient_offset = 0
        for meal_name in MEAL_TARGET_SHARES:
            ingredient_count = len(meal_ingredients[meal_name])
            balanced_by_meal[meal_name] = balanced_ingredients[
                ingredient_offset : ingredient_offset + ingredient_count
            ]
            ingredient_offset += ingredient_count
        meals: list[dict[str, Any]] = []
        for meal_name in MEAL_TARGET_SHARES:
            meal_entries = balanced_by_meal[meal_name]
            meals.append(
                {
                    "name": meal_name.title(),
                    "target_calories": round(meal_calorie_targets[meal_name]),
                    "ingredients": meal_entries,
                    "totals": _totals(meal_entries),
                }
            )
        all_ingredients = [
            ingredient
            for meal in meals
            for ingredient in meal["ingredients"]
        ]
        days.append(
            {
                "day": day_index + 1,
                "meals": meals,
                "totals": _totals(all_ingredients),
            }
        )

    return {
        "dietary_preference": preference,
        "goal": profile.goal.value if isinstance(profile.goal, FitnessGoal) else profile.goal,
        "targets": {
            "calories": round(calories_target),
            "protein_g": round(macros_target["protein"]["grams"], 1),
            "carbs_g": round(macros_target["carbs"]["grams"], 1),
            "fat_g": round(macros_target["fat"]["grams"], 1),
        },
        "days": days,
        "note": (
            "Food estimates are approximate and portions can be adjusted. "
            "Use dietary and health advice from a qualified professional when needed."
        ),
    }
