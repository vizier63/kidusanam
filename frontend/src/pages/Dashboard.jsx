import { useCallback, useEffect, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Link } from "react-router-dom";
import { api, getApiError } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

const macroColors = ["#0f766e", "#6db9a4", "#c5e8d9"];

function MetricCard({ label, value, unit, note, accent = "teal" }) {
  const accentClasses = {
    teal: "bg-teal-50 text-teal-800",
    blue: "bg-sky-50 text-sky-800",
    amber: "bg-amber-50 text-amber-800",
    violet: "bg-violet-50 text-violet-800",
  };
  return (
    <article className="surface-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${accentClasses[accent]}`}>
          Daily
        </span>
      </div>
      <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
        {value}
        <span className="ml-1.5 text-sm font-medium text-slate-400">{unit}</span>
      </p>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500" title={note}>
        {note}
      </p>
    </article>
  );
}

function LoadingPanel() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <div className="surface-card h-40 animate-pulse bg-white p-5" key={item}>
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="mt-7 h-8 w-32 rounded bg-slate-100" />
          <div className="mt-4 h-3 w-full rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [coachInsight, setCoachInsight] = useState(null);
  const [coachLoading, setCoachLoading] = useState(true);
  const [coachError, setCoachError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const [profileResponse, metricsResponse] = await Promise.all([
        api.get("/profile", { signal }),
        api.get("/health-metrics", { signal }),
      ]);
      setProfile(profileResponse.data);
      setMetrics(metricsResponse.data);
    } catch (requestError) {
      if (!signal?.aborted) setError(getApiError(requestError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  useEffect(() => {
    let active = true;
    api
      .post("/coach/explain")
      .then(({ data }) => {
        if (active) setCoachInsight(data);
      })
      .catch((requestError) => {
        if (active) setCoachError(getApiError(requestError));
      })
      .finally(() => {
        if (active) setCoachLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const macroData = metrics
    ? [
        { name: "Protein", value: metrics.macros.protein.calories },
        { name: "Fat", value: metrics.macros.fat.calories },
        { name: "Carbs", value: metrics.macros.carbs.calories },
      ]
    : [];
  const bmiCategoryColors = {
    Underweight: "bg-sky-100 text-sky-800",
    "Normal weight": "bg-emerald-100 text-emerald-800",
    Overweight: "bg-amber-100 text-amber-800",
    "Obesity class I": "bg-orange-100 text-orange-800",
    "Obesity class II": "bg-rose-100 text-rose-800",
    "Obesity class III": "bg-red-100 text-red-800",
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <section className="mb-8 flex flex-col justify-between gap-5 sm:mb-9 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">Your personal wellness space</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Good to see you, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            A clearer picture of your health, and a few small steps to keep you moving.
          </p>
        </div>
        <Link className="secondary-button w-fit" to="/profile-setup">
          Update profile <span aria-hidden="true">↗</span>
        </Link>
      </section>

      {error && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <p role="alert">{error}</p>
          <button
            className="w-fit font-semibold underline underline-offset-2"
            onClick={loadDashboard}
            type="button"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <LoadingPanel />
      ) : metrics ? (
        <>
          <section aria-label="Daily health metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="surface-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-500">Body mass index</p>
                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${bmiCategoryColors[metrics.bmi_category.value] || "bg-slate-100 text-slate-700"}`}>
                  {metrics.bmi_category.value}
                </span>
              </div>
              <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
                {metrics.bmi.value.toFixed(1)}
                <span className="ml-1.5 text-sm font-medium text-slate-400">BMI</span>
              </p>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500" title={metrics.bmi_category.explanation}>
                {metrics.bmi.explanation}
              </p>
            </article>
            <MetricCard
              accent="blue"
              label="Resting energy (BMR)"
              note={metrics.bmr_kcal.explanation}
              unit="kcal"
              value={Math.round(metrics.bmr_kcal.value).toLocaleString()}
            />
            <MetricCard
              accent="violet"
              label="Daily burn (TDEE)"
              note={metrics.tdee_kcal.explanation}
              unit="kcal"
              value={Math.round(metrics.tdee_kcal.value).toLocaleString()}
            />
            <MetricCard
              accent="amber"
              label="Daily calorie target"
              note={metrics.calorie_target_kcal.explanation}
              unit="kcal"
              value={Math.round(metrics.calorie_target_kcal.value).toLocaleString()}
            />
          </section>

          <section className="surface-card mt-5 border-teal-100 bg-gradient-to-br from-white to-teal-50/60 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-800 text-lg text-white">
                ✳
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">AI Coach insight</h2>
                  {coachInsight?.used_fallback && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Personalized guidance
                    </span>
                  )}
                  {coachInsight && !coachInsight.used_fallback && (
                    <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-800">
                      AI powered
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {coachLoading
                    ? "Connecting your goals, health estimates, and current plans..."
                    : coachInsight?.insight || coachError}
                </p>
                {coachInsight?.health_metrics && (
                  <p className="mt-2 text-xs text-slate-400">
                    Based on BMI {Number(coachInsight.health_metrics.bmi).toFixed(1)}, BMR{" "}
                    {typeof coachInsight.health_metrics.bmr_kcal === "number"
                      ? `${Math.round(coachInsight.health_metrics.bmr_kcal).toLocaleString()} kcal/day`
                      : "BMR unavailable"}
                    , and TDEE{" "}
                    {typeof coachInsight.health_metrics.tdee_kcal === "number"
                      ? `${Math.round(coachInsight.health_metrics.tdee_kcal).toLocaleString()} kcal/day.`
                      : "unavailable."}
                  </p>
                )}
              </div>
              <Link className="secondary-button shrink-0" to="/coach">
                Ask your coach <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="surface-card p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">A balanced plate</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">Your daily macros</h2>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                  {Math.round(metrics.calorie_target_kcal.value).toLocaleString()} kcal total
                </span>
              </div>
              <div className="mt-4 grid items-center gap-3 sm:grid-cols-[minmax(190px,0.9fr)_1fr]">
                <div className="relative mx-auto h-[230px] w-full max-w-[280px]">
                  <ResponsiveContainer height="100%" width="100%">
                    <PieChart>
                      <Pie
                        data={macroData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius="62%"
                        outerRadius="82%"
                        paddingAngle={4}
                        stroke="none"
                      >
                        {macroData.map((entry, index) => (
                          <Cell fill={macroColors[index]} key={entry.name} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${Math.round(value)} kcal`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-900">
                      {Math.round(metrics.calorie_target_kcal.value).toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400">calories</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    ["protein", "Protein", macroColors[0]],
                    ["fat", "Fat", macroColors[1]],
                    ["carbs", "Carbohydrates", macroColors[2]],
                  ].map(([key, label, color]) => (
                    <div className="flex items-center justify-between gap-3" key={key}>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-700">{label}</p>
                          <p className="text-xs text-slate-400">
                            {metrics.macros[key].calories.toFixed(0)} kcal
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-slate-900">
                        {metrics.macros[key].grams.toFixed(0)}
                        <span className="ml-1 text-xs font-medium text-slate-400">g</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">
                Macro estimates are guidance, not a medical prescription. Individual needs vary.
              </p>
            </article>

            <article className="relative flex min-h-[350px] flex-col overflow-hidden rounded-3xl bg-teal-900 p-6 text-white shadow-sm sm:p-8">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-white/10" />
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full border border-white/10" />
              <div className="relative flex items-center gap-2 text-sm font-semibold text-teal-200">
                <span aria-hidden="true">✳</span> YOUR COACHING TRACK
              </div>
              <h2 className="relative mt-5 max-w-sm text-3xl font-bold leading-tight tracking-tight">
                {profile?.track || "Your personal plan"}
              </h2>
              <p className="relative mt-4 max-w-md text-sm leading-7 text-teal-50/75">
                {trackDescription(profile)}
              </p>
              <div className="relative mt-auto pt-8">
                <div className="flex flex-wrap gap-2">
                  {profile && (
                    <>
                      <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-teal-50">
                        {profile.goal.replaceAll("_", " ")}
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-teal-50">
                        {profile.activity_level.replaceAll("_", " ")} activity
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-5 border-t border-white/15 pt-4 text-xs leading-5 text-teal-100/60">
                  Calculated {new Date(metrics.calculated_at).toLocaleString()}
                </p>
              </div>
            </article>
          </section>
          <p className="mt-5 text-center text-xs leading-5 text-slate-400">
            Wellness estimates are informational and not a substitute for advice from your healthcare professional.
          </p>
        </>
      ) : error ? (
        <section className="surface-card mx-auto max-w-xl px-6 py-12 text-center">
          <h2 className="text-xl font-bold text-slate-900">Metrics are unavailable</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Check your profile details and try again. Some health calculations require a supported gender value.
          </p>
          <Link className="primary-button mt-6" to="/profile-setup">
            Review my profile <span aria-hidden="true">→</span>
          </Link>
        </section>
      ) : (
        <section className="surface-card mx-auto max-w-xl px-6 py-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-2xl text-teal-800">
            ✳
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900">Let's personalize your dashboard</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Add your profile details to get your health metrics and coaching track.
          </p>
          <Link className="primary-button mt-6" to="/profile-setup">
            Set up my profile <span aria-hidden="true">→</span>
          </Link>
        </section>
      )}
    </main>
  );
}

function trackDescription(profile) {
  if (!profile) return "A plan shaped around your goals, health, and everyday routine.";
  if (profile.track === "Elderly / Health-Constrained") {
    return "A thoughtful, health-aware approach that prioritizes comfortable movement and sustainable habits. Consider checking in with your healthcare professional before starting a new routine.";
  }
  if (profile.track === "Muscle & Strength") {
    return "Build strength steadily with a goal-focused approach to movement, recovery, and everyday nutrition.";
  }
  return "A balanced approach to everyday movement and nutrition, designed to support steady, sustainable progress.";
}
