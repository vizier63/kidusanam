import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getApiError } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import FormField from "../components/FormField.jsx";

const steps = [
  { title: "About you", subtitle: "A few basics help us make your plan personal." },
  { title: "Your direction", subtitle: "Tell us what progress looks like for you." },
  { title: "Health & lifestyle", subtitle: "We'll tailor ideas to fit your everyday life." },
];

const initialForm = {
  age: "",
  gender: "",
  height_cm: "",
  weight_kg: "",
  goal: "",
  activity_level: "",
  medical_conditions: "",
  injuries: "",
  dietary_preference: "",
  equipment: "",
};

const selectClass = "input-control";

function Choice({ checked, children, name, onChange, value }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm font-medium transition ${
        checked
          ? "border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-600"
          : "border-slate-200 text-slate-600 hover:border-teal-300"
      }`}
    >
      <input
        checked={checked}
        className="accent-teal-700"
        name={name}
        onChange={onChange}
        type="radio"
        value={value}
      />
      {children}
    </label>
  );
}

export default function ProfileSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get("/profile")
      .then(({ data }) => {
        if (active) {
          setForm({
            age: String(data.age),
            gender: data.gender,
            height_cm: String(data.height_cm),
            weight_kg: String(data.weight_kg),
            goal: data.goal,
            activity_level: data.activity_level,
            medical_conditions: data.medical_conditions || "",
            injuries: data.injuries || "",
            dietary_preference: data.dietary_preference,
            equipment: data.equipment,
          });
        }
      })
      .catch((requestError) => {
        if (active && requestError.response?.status !== 404) {
          setError(getApiError(requestError));
        }
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validateStep() {
    const requiredByStep = [
      ["age", "gender", "height_cm", "weight_kg"],
      ["goal", "activity_level"],
      ["dietary_preference", "equipment"],
    ][step];
    return requiredByStep.every((field) => String(form[field]).trim());
  }

  async function handleContinue(event) {
    event.preventDefault();
    setError("");
    if (!validateStep()) {
      setError("Please complete each required field to continue.");
      return;
    }
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }

    setSubmitting(true);
    try {
      await api.put("/profile", {
        ...form,
        age: Number(form.age),
        height_cm: Number(form.height_cm),
        weight_kg: Number(form.weight_kg),
        medical_conditions: form.medical_conditions.trim() || null,
        injuries: form.injuries.trim() || null,
      });
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-9 sm:px-6 sm:py-14">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
          Let's get to know you
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {form.age ? "Update your profile" : "Set up your profile"}
        </h1>
        <p className="mt-2 text-slate-500">
        {user?.name ? `Hi ${user.name.split(" ")[0]}, ` : ""}
        your answers help WellAI make recommendations that fit you.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
        {loadingProfile ? (
        <div className="space-y-5 py-5" aria-label="Loading profile">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
          <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        </div>
        ) : (
        <>
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">
              Step {step + 1} of {steps.length}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {Math.round(((step + 1) / steps.length) * 100)}% complete
            </span>
          </div>
          <div aria-label={`Step ${step + 1} of ${steps.length}`} className="flex gap-2">
            {steps.map((item, index) => (
              <div
                className={`h-1.5 flex-1 rounded-full ${
                  index <= step ? "bg-teal-700" : "bg-slate-100"
                }`}
                key={item.title}
              />
            ))}
          </div>
          <h2 className="mt-7 text-xl font-bold text-slate-900">{steps[step].title}</h2>
          <p className="mt-1 text-sm text-slate-500">{steps[step].subtitle}</p>
        </div>

        <form onSubmit={handleContinue}>
          {step === 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Age">
                <input
                  className="input-control"
                  max="120"
                  min="1"
                  onChange={(event) => update("age", event.target.value)}
                  placeholder="e.g. 32"
                  required
                  type="number"
                  value={form.age}
                />
              </FormField>
              <FormField label="Gender" hint="Used for the requested health calculations.">
                <select
                  className={selectClass}
                  onChange={(event) => update("gender", event.target.value)}
                  required
                  value={form.gender}
                >
                  <option value="">Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </FormField>
              <FormField label="Height" hint="Centimeters">
                <input
                  className="input-control"
                  max="300"
                  min="1"
                  onChange={(event) => update("height_cm", event.target.value)}
                  placeholder="e.g. 170"
                  required
                  step="0.1"
                  type="number"
                  value={form.height_cm}
                />
              </FormField>
              <FormField label="Weight" hint="Kilograms">
                <input
                  className="input-control"
                  max="500"
                  min="1"
                  onChange={(event) => update("weight_kg", event.target.value)}
                  placeholder="e.g. 68"
                  required
                  step="0.1"
                  type="number"
                  value={form.weight_kg}
                />
              </FormField>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-7">
              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-slate-700">What's your main goal?</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["weight_loss", "Weight loss"],
                    ["muscle_gain", "Muscle gain"],
                    ["general_fitness", "General fitness"],
                  ].map(([value, label]) => (
                    <Choice
                      checked={form.goal === value}
                      key={value}
                      name="goal"
                      onChange={(event) => update("goal", event.target.value)}
                      value={value}
                    >
                      {label}
                    </Choice>
                  ))}
                </div>
              </fieldset>
              <FormField label="How active are you on a typical week?">
                <select
                  className={selectClass}
                  onChange={(event) => update("activity_level", event.target.value)}
                  required
                  value={form.activity_level}
                >
                  <option value="">Choose activity level</option>
                  <option value="sedentary">Sedentary — mostly sitting</option>
                  <option value="light">Light — some movement, 1–3 days/week</option>
                  <option value="moderate">Moderate — exercise 3–5 days/week</option>
                  <option value="active">Active — exercise 6–7 days/week</option>
                  <option value="very_active">Very active — intense daily activity</option>
                </select>
              </FormField>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <FormField label="Medical conditions" hint="Optional — share anything you'd like us to consider.">
                <textarea
                  className="input-control min-h-24 resize-y"
                  maxLength={2000}
                  onChange={(event) => update("medical_conditions", event.target.value)}
                  placeholder="e.g. asthma, high blood pressure"
                  value={form.medical_conditions}
                />
              </FormField>
              <FormField label="Injuries or movement limitations" hint="Optional">
                <textarea
                  className="input-control min-h-20 resize-y"
                  maxLength={2000}
                  onChange={(event) => update("injuries", event.target.value)}
                  placeholder="Anything that affects your movement?"
                  value={form.injuries}
                />
              </FormField>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Dietary preference">
                  <select
                    className={selectClass}
                    onChange={(event) => update("dietary_preference", event.target.value)}
                    required
                    value={form.dietary_preference}
                  >
                    <option value="">Choose preference</option>
                    <option value="veg">Vegetarian</option>
                    <option value="non_veg">Non-vegetarian</option>
                    <option value="vegan">Vegan</option>
                  </select>
                </FormField>
                <FormField label="Available equipment">
                  <select
                    className={selectClass}
                    onChange={(event) => update("equipment", event.target.value)}
                    required
                    value={form.equipment}
                  >
                    <option value="">Choose equipment</option>
                    <option value="none">No equipment</option>
                    <option value="home">Home equipment</option>
                    <option value="gym">Gym access</option>
                  </select>
                </FormField>
              </div>
            </div>
          )}

          {error && <p className="form-error mt-5" role="alert">{error}</p>}

          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
            <button
              className="secondary-button"
              disabled={step === 0 || submitting}
              onClick={() => {
                setError("");
                setStep((current) => current - 1);
              }}
              type="button"
            >
              Back
            </button>
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? "Saving..." : step === 2 ? "Save my profile" : "Continue"}
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </div>
        </form>
          </>
        )}
      </section>
      <p className="mt-5 text-center text-xs text-slate-400">
        Your health information stays private and is used to personalize your experience.
      </p>
    </main>
  );
}
