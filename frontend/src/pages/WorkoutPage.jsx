import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getApiError } from "../api.js";

export default function WorkoutPage() {
  const [record, setRecord] = useState(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/plans/workout");
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

  const currentDay = record?.plan.days.find((day) => day.day === selectedDay);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">A routine built around you</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Your weekly movement
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            A practical seven-day plan based on your goals, equipment, and movement considerations.
          </p>
        </div>
        <button className="secondary-button w-fit" disabled={loading} onClick={loadPlan} type="button">
          <span aria-hidden="true">↻</span> {loading ? "Building plan..." : "Regenerate"}
        </button>
      </header>

      {error && <PlanError error={error} onRetry={loadPlan} />}

      {loading && !record ? (
        <PlanLoading />
      ) : record ? (
        <>
          <section aria-label="Select workout day" className="mb-5 flex gap-2 overflow-x-auto pb-2">
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
                <span className="mt-1 block text-sm font-bold">{day.focus.split(" ")[0]}</span>
              </button>
            ))}
          </section>

          {currentDay && (
            <section className="surface-card p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">
                    Day {currentDay.day}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">{currentDay.focus}</h2>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
                  {record.plan.track}
                </span>
              </div>

              {currentDay.exercises.length ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {currentDay.exercises.map((exercise, index) => (
                    <article
                      className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-[#fbfcfb] p-4 sm:p-5"
                      key={exercise.id}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-100 text-sm font-bold text-teal-800">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900">{exercise.name}</h3>
                        <p className="mt-1 text-xs capitalize text-slate-500">
                          {exercise.muscle_group} · {exercise.difficulty}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {exercise.sets} sets
                          </span>
                          <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {exercise.reps}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
                  Rest and recover today. Gentle movement is optional if it feels comfortable.
                </div>
              )}

              {currentDay.substitutions.length > 0 && (
                <details className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-amber-900">
                    Injury and equipment adjustments ({currentDay.substitutions.length})
                  </summary>
                  <div className="mt-4 space-y-3">
                    {currentDay.substitutions.map((item, index) => (
                      <div className="grid gap-1 text-sm sm:grid-cols-[1fr_auto_1fr]" key={`${item.exercise.id}-${index}`}>
                        <span className="text-slate-600">
                          {item.exercise.name} · {item.conflicts_with.join(", ")}
                        </span>
                        <span aria-hidden="true" className="hidden text-amber-700 sm:block">→</span>
                        <span className="font-semibold text-teal-800">
                          Try: {item.alternative.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </section>
          )}
          <p className="mt-4 text-xs leading-5 text-slate-400">{record.plan.safety_note}</p>
        </>
      ) : error.includes("Profile not found") ? (
        <SetupPrompt />
      ) : null}
    </main>
  );
}

function PlanLoading() {
  return (
    <div className="surface-card animate-pulse p-6">
      <div className="h-5 w-36 rounded bg-slate-100" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <div className="h-24 rounded-2xl bg-slate-100" key={item} />
        ))}
      </div>
    </div>
  );
}

function PlanError({ error, onRetry }) {
  const missingProfile = error.toLowerCase().includes("profile not found");
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
      <p role="alert">{error}</p>
      {missingProfile ? (
        <Link className="font-semibold underline underline-offset-2" to="/profile-setup">
          Set up profile
        </Link>
      ) : (
        <button className="font-semibold underline underline-offset-2" onClick={onRetry} type="button">
          Try again
        </button>
      )}
    </div>
  );
}

function SetupPrompt() {
  return (
    <section className="surface-card px-6 py-12 text-center">
      <h2 className="text-xl font-bold text-slate-900">Your plan starts with your profile</h2>
      <p className="mt-2 text-sm text-slate-500">Add your goals, equipment, and health details first.</p>
      <Link className="primary-button mt-5" to="/profile-setup">Set up my profile →</Link>
    </section>
  );
}
