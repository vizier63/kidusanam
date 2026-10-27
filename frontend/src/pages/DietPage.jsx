import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getApiError } from "../api.js";

const nutrients = [
  ["calories", "Calories", "kcal"],
  ["protein", "Protein", "g"],
  ["carbs", "Carbs", "g"],
  ["fat", "Fat", "g"],
];

export default function DietPage() {
  const [record, setRecord] = useState(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [substituting, setSubstituting] = useState("");

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.get("/plans/diet");
      setRecord(data);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const selected = record?.plan.days.find((day) => day.day === selectedDay);

  async function handleSubstitute(mealName, ingredient) {
    const meal = mealName.toLowerCase();
    const key = `${selectedDay}-${meal}-${ingredient.food_id}`;
    setSubstituting(key);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post("/plans/diet/substitute", {
        food_id: ingredient.food_id,
        day: selectedDay,
        meal,
      });
      setRecord((current) => ({ ...current, plan: data.plan }));
      setNotice(`${data.original.name} swapped for ${data.substitute.name}. ${data.reason}`);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setSubstituting("");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">Everyday nourishment, your way</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Your meal plan
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Flexible meal ideas that respect your food preferences and daily nutrition targets.
          </p>
        </div>
        <button className="secondary-button w-fit" disabled={loading} onClick={loadPlan} type="button">
          <span aria-hidden="true">↻</span> {loading ? "Building plan..." : "Regenerate"}
        </button>
      </header>

      {error && <PlanError error={error} onRetry={loadPlan} />}
      {notice && (
        <div className="mb-5 rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900" role="status">
          {notice}
        </div>
      )}

      {loading && !record ? (
        <PlanLoading />
      ) : record ? (
        <>
          <section className="surface-card mb-5 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-slate-500">Daily targets</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {record.plan.targets.calories.toLocaleString()}
                  <span className="ml-1.5 text-sm font-medium text-slate-400">kcal</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {record.plan.dietary_preference.replace("_", "-")} · {record.plan.goal.replaceAll("_", " ")}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  ["Protein", record.plan.targets.protein_g],
                  ["Carbs", record.plan.targets.carbs_g],
                  ["Fat", record.plan.targets.fat_g],
                ].map(([label, amount]) => (
                  <div className="min-w-[82px] rounded-xl bg-slate-50 px-3 py-2.5 text-center" key={label}>
                    <p className="text-sm font-bold text-slate-800">{amount}g</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section aria-label="Select meal plan day" className="mb-5 flex gap-2 overflow-x-auto pb-2">
            {record.plan.days.map((day) => (
              <button
                aria-pressed={selectedDay === day.day}
                className={`min-w-[82px] rounded-xl border px-4 py-3 text-left transition ${
                  selectedDay === day.day
                    ? "border-teal-800 bg-teal-800 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-teal-300"
                }`}
                key={day.day}
                onClick={() => setSelectedDay(day.day)}
                type="button"
              >
                <span className="block text-xs font-medium opacity-70">Day {day.day}</span>
                <span className="mt-1 block text-sm font-bold">{day.totals.calories.toFixed(0)} kcal</span>
              </button>
            ))}
          </section>

          {selected && (
            <>
              <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {nutrients.map(([key, label, unit]) => {
                  const targetKey = key === "calories" ? "calories" : `${key}_g`;
                  const target = record.plan.targets[targetKey];
                  const actual = selected.totals[key];
                  const percent = Math.round((actual / target) * 100);
                  return (
                    <article className="surface-card p-4" key={key}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-600">{label}</span>
                        <span className="text-slate-400">{percent}% of target</span>
                      </div>
                      <p className="mt-2 text-xl font-bold text-slate-900">
                        {Math.round(actual).toLocaleString()}
                        <span className="ml-1 text-xs font-medium text-slate-400">
                          / {Math.round(target).toLocaleString()} {unit}
                        </span>
                      </p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            percent > 110 ? "bg-amber-500" : "bg-teal-600"
                          }`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    </article>
                  );
                })}
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                {selected.meals.map((meal) => (
                  <article className="surface-card p-5 sm:p-6" key={meal.name}>
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">
                          Day {selected.day}
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-slate-900">{meal.name}</h2>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">{meal.totals.calories.toFixed(0)} kcal</p>
                        <p className="text-xs text-slate-400">Target ~{meal.target_calories} kcal</p>
                      </div>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {meal.ingredients.map((ingredient) => {
                        const key = `${selectedDay}-${meal.name.toLowerCase()}-${ingredient.food_id}`;
                        return (
                          <li className="flex items-center justify-between gap-3 py-3" key={ingredient.food_id}>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-700">{ingredient.name}</p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                {ingredient.serving_g.toFixed(0)} g · {ingredient.protein.toFixed(1)} g protein
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <span className="text-xs font-semibold text-slate-500">
                                {ingredient.calories.toFixed(0)} kcal
                              </span>
                              <button
                                aria-label={`Swap ${ingredient.name}`}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-teal-800 hover:border-teal-300 hover:bg-teal-50 disabled:opacity-50"
                                disabled={Boolean(substituting)}
                                onClick={() => handleSubstitute(meal.name, ingredient)}
                                type="button"
                              >
                                {substituting === key ? "..." : "Swap"}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <span>P {meal.totals.protein.toFixed(0)}g</span>
                      <span>C {meal.totals.carbs.toFixed(0)}g</span>
                      <span>F {meal.totals.fat.toFixed(0)}g</span>
                    </div>
                  </article>
                ))}
              </section>
            </>
          )}
          <p className="mt-5 text-xs leading-5 text-slate-400">{record.plan.note}</p>
        </>
      ) : error.toLowerCase().includes("profile not found") ? (
        <section className="surface-card px-6 py-12 text-center">
          <h2 className="text-xl font-bold text-slate-900">Add your profile to plan meals</h2>
          <p className="mt-2 text-sm text-slate-500">Your goals and food preference help shape your meal ideas.</p>
          <Link className="primary-button mt-5" to="/profile-setup">Set up my profile →</Link>
        </section>
      ) : null}
    </main>
  );
}

function PlanLoading() {
  return (
    <div className="grid animate-pulse gap-4 lg:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <div className="surface-card h-64 bg-white p-6" key={item}>
          <div className="h-4 w-28 rounded bg-slate-100" />
          <div className="mt-6 h-5 w-40 rounded bg-slate-100" />
          <div className="mt-8 space-y-4">
            <div className="h-4 rounded bg-slate-100" />
            <div className="h-4 rounded bg-slate-100" />
            <div className="h-4 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanError({ error, onRetry }) {
  const missingProfile = error.toLowerCase().includes("profile not found");
  return (
    <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <p role="alert">{error}</p>
      {missingProfile ? (
        <Link className="mt-2 inline-block font-semibold underline underline-offset-2" to="/profile-setup">
          Set up profile
        </Link>
      ) : (
        <button className="mt-2 inline-block font-semibold underline underline-offset-2" onClick={onRetry} type="button">
          Try again
        </button>
      )}
    </div>
  );
}
