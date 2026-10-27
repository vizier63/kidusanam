import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, getApiError } from "../api.js";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value, options = { month: "short", day: "numeric" }) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, options);
}

function workoutStreak(logs) {
  const completedDays = new Set(
    logs.filter((log) => log.workout_completed).map((log) => log.date),
  );
  const today = localDateString();
  const yesterday = localDateString(new Date(Date.now() - 86400000));
  let cursor = completedDays.has(today) ? today : yesterday;
  let streak = 0;
  while (completedDays.has(cursor)) {
    streak += 1;
    const previousDay = new Date(`${cursor}T12:00:00`);
    previousDay.setDate(previousDay.getDate() - 1);
    cursor = localDateString(previousDay);
  }
  return streak;
}

export default function ProgressPage() {
  const today = localDateString();
  const [logs, setLogs] = useState([]);
  const [logDate, setLogDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [calories, setCalories] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get("/progress")
      .then(({ data }) => {
        if (active) setLogs(data.logs);
      })
      .catch((requestError) => {
        if (active) setError(getApiError(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const savedLog = logs.find((log) => log.date === logDate);
    setWeight(savedLog?.weight_kg == null ? "" : String(savedLog.weight_kg));
    setWorkoutCompleted(savedLog?.workout_completed ?? false);
    setCalories(savedLog?.calories_consumed == null ? "" : String(savedLog.calories_consumed));
  }, [logs, logDate]);

  const chartData = useMemo(
    () =>
      logs
        .filter((log) => log.weight_kg != null)
        .map((log) => ({
          ...log,
          label: formatDate(log.date),
        })),
    [logs],
  );
  const currentStreak = workoutStreak(logs);
  const completedWorkouts = logs.filter((log) => log.workout_completed).length;
  const latestWeight = [...logs]
    .reverse()
    .find((log) => log.weight_kg != null)?.weight_kg;

  function changeLogDate(value) {
    setLogDate(value);
  }

  async function submitProgress(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const { data } = await api.post("/progress", {
        date: logDate,
        weight_kg: weight === "" ? null : Number(weight),
        workout_completed: workoutCompleted,
        calories_consumed: calories === "" ? null : Number(calories),
      });
      setLogs((current) => {
        const updated = current.filter((log) => log.date !== data.date);
        return [...updated, data].sort((a, b) => a.date.localeCompare(b.date));
      });
      setNotice(`Progress saved for ${formatDate(data.date, { month: "long", day: "numeric", year: "numeric" })}.`);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <header className="mb-7">
        <p className="text-sm font-semibold text-teal-700">Progress at your pace</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Your progress</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Record a simple daily check-in and look for encouraging patterns over time.
        </p>
      </header>

      {error && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
          {notice}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="surface-card p-5 sm:p-6">
          <p className="text-sm font-semibold text-slate-500">Current workout streak</p>
          <p className="mt-4 text-3xl font-bold text-slate-900">{currentStreak}<span className="ml-2 text-sm font-medium text-slate-400">days</span></p>
          <p className="mt-2 text-xs leading-5 text-slate-500">Consecutive completed days, including today or yesterday.</p>
        </article>
        <article className="surface-card p-5 sm:p-6">
          <p className="text-sm font-semibold text-slate-500">Workouts completed</p>
          <p className="mt-4 text-3xl font-bold text-slate-900">{completedWorkouts}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">Logged workout days in your progress history.</p>
        </article>
        <article className="surface-card p-5 sm:p-6">
          <p className="text-sm font-semibold text-slate-500">Latest weight</p>
          <p className="mt-4 text-3xl font-bold text-slate-900">{latestWeight != null ? latestWeight.toFixed(1) : "—"}<span className="ml-2 text-sm font-medium text-slate-400">{latestWeight != null ? "kg" : ""}</span></p>
          <p className="mt-2 text-xs leading-5 text-slate-500">Weight check-ins can fluctuate; long-term patterns matter more.</p>
        </article>
      </section>

      <section className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
        <article className="surface-card min-w-0 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-500">Your check-ins</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Weight over time</h2>
            </div>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
              {chartData.length} {chartData.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          {loading ? (
            <div className="mt-5 h-72 animate-pulse rounded-2xl bg-slate-50" />
          ) : chartData.length > 0 ? (
            <div className="mt-5 h-72 min-w-0">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 12, bottom: 4, left: -18 }}>
                  <CartesianGrid stroke="#e9efed" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    axisLine={false}
                    dataKey="label"
                    minTickGap={24}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickLine={false}
                    tickFormatter={(value) => `${value} kg`}
                    width={58}
                  />
                  <Tooltip
                    contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12 }}
                    formatter={(value) => [`${Number(value).toFixed(1)} kg`, "Weight"]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.date ? formatDate(payload[0].payload.date, { month: "long", day: "numeric", year: "numeric" }) : label}
                  />
                  <Line
                    activeDot={{ r: 6, fill: "#0f766e", stroke: "#fff", strokeWidth: 3 }}
                    dataKey="weight_kg"
                    dot={{ r: 3, fill: "#0f766e", strokeWidth: 0 }}
                    name="Weight"
                    stroke="#0f766e"
                    strokeWidth={3}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-5 flex h-72 flex-col items-center justify-center rounded-2xl bg-slate-50 px-6 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-xl text-teal-700 shadow-sm">↗</span>
              <h3 className="mt-4 font-semibold text-slate-800">{loading ? "Loading your progress..." : "Your chart starts with a check-in"}</h3>
              {!loading && <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">Add your weight in the form to see how it changes over time.</p>}
            </div>
          )}
        </article>

        <section className="surface-card p-5 sm:p-6">
          <h2 className="text-xl font-bold text-slate-900">Daily check-in</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Log what feels useful today. Save again to update that date.</p>
          <form className="mt-5 space-y-4" onSubmit={submitProgress}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Date</span>
              <input
                className="input-control"
                max={today}
                onChange={(event) => changeLogDate(event.target.value)}
                required
                type="date"
                value={logDate}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Weight <span className="font-normal text-slate-400">(optional, kg)</span></span>
              <input
                className="input-control"
                max="500"
                min="1"
                onChange={(event) => setWeight(event.target.value)}
                placeholder="e.g. 68.5"
                step="0.1"
                type="number"
                value={weight}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <span>
                <span className="block text-sm font-semibold text-slate-700">Workout completed</span>
                <span className="mt-0.5 block text-xs text-slate-400">Count this day toward your streak</span>
              </span>
              <input
                checked={workoutCompleted}
                className="h-4 w-4 accent-teal-700"
                onChange={(event) => setWorkoutCompleted(event.target.checked)}
                type="checkbox"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Calories consumed <span className="font-normal text-slate-400">(optional)</span></span>
              <input
                className="input-control"
                max="20000"
                min="0"
                onChange={(event) => setCalories(event.target.value)}
                placeholder="e.g. 2100"
                step="1"
                type="number"
                value={calories}
              />
            </label>
            <button className="primary-button w-full" disabled={saving} type="submit">
              {saving ? "Saving..." : "Save check-in"}
              {!saving && <span aria-hidden="true">→</span>}
            </button>
          </form>
        </section>
      </section>

      <p className="mt-5 text-center text-xs leading-5 text-slate-400">
        Weight and calorie entries are optional estimates. Use them as personal tracking data, not a measure of your worth.
      </p>
    </main>
  );
}
