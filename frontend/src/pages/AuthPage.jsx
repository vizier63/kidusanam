import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, getApiError } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import FormField from "../components/FormField.jsx";

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (isRegister && !name.trim()) {
      setError("Enter your name to create an account.");
      return;
    }
    if (isRegister && new TextEncoder().encode(password).length > 72) {
      setError("Password must be no more than 72 bytes.");
      return;
    }
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(name.trim(), normalizedEmail, password);
        navigate("/profile-setup", { replace: true });
      } else {
        await login(normalizedEmail, password);
        try {
          await api.get("/profile");
          navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
        } catch (requestError) {
          if (requestError.response?.status === 404) {
            navigate("/profile-setup", { replace: true });
          } else {
            throw requestError;
          }
        }
      }
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1fr_0.9fr]">
      <section className="relative hidden overflow-hidden bg-teal-950 px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="absolute -right-36 -top-32 h-[440px] w-[440px] rounded-full border border-white/10" />
        <div className="absolute -right-20 -top-16 h-[310px] w-[310px] rounded-full border border-white/10" />
        <Link className="relative flex items-center gap-3 text-xl font-bold" to="/">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-400 text-teal-950">
            W
          </span>
          WellAI
        </Link>
        <div className="relative max-w-xl pb-16">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-teal-300">
            Your health, made personal
          </p>
          <h1 className="text-5xl font-semibold leading-[1.12] tracking-tight xl:text-6xl">
            Small steps.
            <br />
            Stronger you.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-teal-100/75">
            A thoughtful fitness companion for building a healthier routine at
            your own pace.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm text-teal-100/80">
            <span className="flex -space-x-2">
              {["A", "M", "J"].map((initial, index) => (
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full border-2 border-teal-950 text-xs font-bold text-white ${
                    ["bg-emerald-600", "bg-sky-600", "bg-amber-600"][index]
                  }`}
                  key={initial}
                >
                  {initial}
                </span>
              ))}
            </span>
            <span>Wellness that meets you where you are.</span>
          </div>
        </div>
        <p className="relative text-xs text-teal-100/50">
          Personalized guidance, built around you.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <Link className="mb-12 flex items-center gap-2.5 text-lg font-bold text-slate-900 lg:hidden" to="/">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-800 text-white">W</span>
            WellAI
          </Link>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-700">
            {isRegister ? "Start your journey" : "Welcome back"}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {isRegister ? "Create your account" : "Sign in to WellAI"}
          </h2>
          <p className="mt-2 text-slate-500">
            {isRegister
              ? "A more personal approach to feeling your best."
              : "Your wellness journey is right where you left it."}
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {isRegister && (
              <FormField label="Full name">
                <input
                  autoComplete="name"
                  className="input-control"
                  maxLength={120}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  required
                  value={name}
                />
              </FormField>
            )}
            <FormField label="Email address">
              <input
                autoComplete="email"
                className="input-control"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </FormField>
            <FormField
              hint={isRegister ? "Use at least 8 characters." : undefined}
              label="Password"
            >
              <input
                autoComplete={isRegister ? "new-password" : "current-password"}
                className="input-control"
                minLength={isRegister ? 8 : 1}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                type="password"
                value={password}
              />
            </FormField>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button className="primary-button w-full" disabled={submitting} type="submit">
              {submitting
                ? "Please wait..."
                : isRegister
                  ? "Create account"
                  : "Sign in"}
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            {isRegister ? "Already have an account?" : "New to WellAI?"}{" "}
            <Link
              className="font-semibold text-teal-800 hover:text-teal-950"
              to={isRegister ? "/login" : "/register"}
            >
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <p className="mt-12 text-center text-xs leading-5 text-slate-400">
            By continuing, you agree to use WellAI as a wellness companion,
            not a replacement for professional medical advice.
          </p>
        </div>
      </section>
    </main>
  );
}
