import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

const navigation = [
  { label: "Dashboard", to: "/dashboard", icon: "⌂" },
  { label: "Workout", to: "/workout", icon: "↗" },
  { label: "Diet", to: "/diet", icon: "◉" },
  { label: "Coach Chat", to: "/coach", icon: "✳" },
  { label: "Progress", to: "/progress", icon: "▥" },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navRef = useRef(null);
  const activeLinkRef = useRef(null);

  useEffect(() => {
    const nav = navRef.current;
    const activeLink = activeLinkRef.current;
    if (!nav || !activeLink) return;

    const navBounds = nav.getBoundingClientRect();
    const linkBounds = activeLink.getBoundingClientRect();
    const left = nav.scrollLeft + linkBounds.left - navBounds.left;
    const right = left + linkBounds.width;
    if (left < nav.scrollLeft) {
      nav.scrollTo({ left, behavior: "smooth" });
    } else if (right > nav.scrollLeft + nav.clientWidth) {
      nav.scrollTo({ left: right - nav.clientWidth, behavior: "smooth" });
    }
  }, [pathname]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#f5f8f6]">
      <header className="sticky top-0 z-20 border-b border-emerald-950/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <NavLink className="flex shrink-0 items-center gap-2.5" to="/dashboard">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-800 text-lg font-bold text-white">
              W
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Well<span className="text-teal-700">AI</span>
            </span>
          </NavLink>

          <nav
            aria-label="Main navigation"
            className="scrollbar-none absolute inset-x-0 top-[72px] flex gap-1 overflow-x-auto border-b border-emerald-950/5 bg-white px-3 py-2 md:static md:ml-8 md:flex-1 md:justify-center md:overflow-visible md:border-0 md:bg-transparent md:p-0"
            ref={navRef}
          >
            {navigation.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-teal-50 text-teal-800"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
                key={item.to}
                ref={(element) => {
                  if (element && pathname === item.to) activeLinkRef.current = element;
                }}
                to={item.to}
              >
                <span aria-hidden="true" className="text-base">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-sm font-medium text-slate-600 sm:block">
              {user?.name?.split(" ")[0]}
            </span>
            <button
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="h-[54px] md:hidden" />
      <Outlet />
    </div>
  );
}
