import { Link } from "react-router-dom";

const features = [
  {
    number: "01",
    title: "A plan that starts with you",
    description:
      "Share your goals, activity level, equipment, and preferences to shape practical workout and meal ideas.",
    icon: "✳",
  },
  {
    number: "02",
    title: "Understand your numbers",
    description:
      "See BMI, BMR, TDEE, calorie targets, and macros with clear explanations of how estimates are calculated.",
    icon: "⌁",
  },
  {
    number: "03",
    title: "Build steady habits",
    description:
      "Log progress, review weight trends, celebrate completed workouts, and chat with a supportive wellness coach.",
    icon: "↗",
  },
];

export default function LandingPage() {
  return (
    <main className="overflow-hidden bg-[#f7faf8]">
      <header className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link aria-label="WellAI home" className="flex items-center gap-2.5" to="/">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-800 text-lg font-bold text-white">W</span>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Well<span className="text-teal-700">AI</span>
          </span>
        </Link>
        <nav aria-label="Account" className="flex items-center gap-2 sm:gap-3">
          <Link className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-teal-800" to="/login">
            Sign in
          </Link>
          <Link className="primary-button min-h-10 px-4 py-2 text-sm" to="/register">
            Get started <span aria-hidden="true">→</span>
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="absolute -right-36 top-8 h-[480px] w-[480px] rounded-full border border-teal-900/[0.06] lg:right-0" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Your wellness, made personal
          </div>
          <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight text-slate-950 sm:text-6xl">
            Small steps.
            <span className="block text-teal-800">Stronger you.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            A thoughtful fitness companion for building routines that fit your goals, your everyday life, and your pace.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="primary-button w-fit px-5 py-3" to="/register">
              Create your free account <span aria-hidden="true">→</span>
            </Link>
            <Link className="secondary-button w-fit px-5 py-3" to="/login">
              I already have an account
            </Link>
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-400">
            General wellness guidance only. Your estimates are informational, not medical advice.
          </p>
        </div>

        <div aria-label="WellAI personalized wellness dashboard preview" className="relative mx-auto w-full max-w-lg lg:ml-auto">
          <div className="absolute -left-7 -top-8 h-28 w-28 rounded-full bg-emerald-100/70 blur-2xl" />
          <div className="absolute -bottom-8 -right-8 h-36 w-36 rounded-full bg-teal-100/80 blur-2xl" />
          <div className="relative rounded-[2rem] border border-white bg-white p-4 shadow-[0_30px_90px_-40px_rgba(15,118,110,0.35)] sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-800 text-sm font-bold text-white">W</span>
                <span className="font-bold text-slate-900">WellAI</span>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Your overview</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4">
              {[
                ["Body mass index", "22.8", "Normal range", "bg-emerald-50 text-emerald-800"],
                ["Daily energy", "2,140", "kcal estimate", "bg-sky-50 text-sky-800"],
              ].map(([label, value, note, color]) => (
                <div className="rounded-2xl border border-slate-100 p-4" key={label}>
                  <p className="text-[11px] font-medium text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${color}`}>{note}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-2xl bg-teal-900 p-4 text-white">
              <p className="text-xs font-semibold text-teal-200">YOUR COACHING TRACK</p>
              <p className="mt-2 text-lg font-bold">General Fitness &amp; Diet</p>
              <p className="mt-1 text-xs leading-5 text-teal-50/75">A balanced plan designed around your goals and daily routine.</p>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#f4f8f6] p-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-teal-800 shadow-sm">↗</span>
              <div>
                <p className="text-xs font-bold text-slate-800">Progress, at your pace</p>
                <p className="mt-1 text-[11px] text-slate-500">Build consistency one check-in at a time.</p>
              </div>
              <span aria-hidden="true" className="ml-auto text-teal-700">→</span>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl border border-white bg-white px-4 py-3 shadow-lg sm:flex">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700">✓</span>
            <div>
              <p className="text-xs font-bold text-slate-800">Made for your routine</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Flexible, personal, encouraging</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">A clearer path forward</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Your wellbeing isn’t one-size-fits-all.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
              WellAI brings helpful tools together in one calm, personal space.
            </p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article className="rounded-3xl border border-slate-100 bg-[#fbfdfc] p-6 sm:p-7" key={feature.number}>
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-lg text-teal-800">{feature.icon}</span>
                  <span className="text-xs font-bold tracking-[0.16em] text-slate-300">{feature.number}</span>
                </div>
                <h3 className="mt-6 text-lg font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-teal-900 px-6 py-9 text-white sm:px-10 sm:py-12 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-semibold text-teal-200">Start wherever you are</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">A little more personal. A little more possible.</h2>
            <p className="mt-2 text-sm leading-6 text-teal-50/70">Create your space and take the next small step that works for you.</p>
          </div>
          <Link className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-teal-900 transition hover:bg-teal-50" to="/register">
            Get started <span aria-hidden="true">→</span>
          </Link>
        </div>
        <footer className="flex flex-col gap-3 pt-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <Link className="text-sm font-bold text-slate-700" to="/">WellAI</Link>
          <p>WellAI provides general wellness information, not medical diagnosis or treatment.</p>
        </footer>
      </section>
    </main>
  );
}
