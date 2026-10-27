import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import AppShell from "./components/AppShell.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ToastViewport from "./components/ToastViewport.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import CoachPage from "./pages/CoachPage.jsx";
import DietPage from "./pages/DietPage.jsx";
import ProfileSetup from "./pages/ProfileSetup.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import WorkoutPage from "./pages/WorkoutPage.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const ProgressPage = lazy(() => import("./pages/ProgressPage.jsx"));

function PageLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex min-h-[50vh] items-center justify-center text-sm font-medium text-teal-700" role="status">
      Loading your dashboard...
    </div>
  );
}

function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm font-medium text-teal-700">
        Loading your space...
      </div>
    );
  }
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

function App() {
  return (
    <>
      <ToastViewport />
      <Routes>
        <Route element={<GuestRoute />}>
          <Route element={<LandingPage />} path="/" />
          <Route element={<AuthPage mode="login" />} path="/login" />
          <Route element={<AuthPage mode="register" />} path="/register" />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route
              element={
                <Suspense fallback={<PageLoading />}>
                  <Dashboard />
                </Suspense>
              }
              path="/dashboard"
            />
            <Route element={<WorkoutPage />} path="/workout" />
            <Route element={<DietPage />} path="/diet" />
            <Route element={<CoachPage />} path="/coach" />
            <Route
              element={
                <Suspense fallback={<PageLoading />}>
                  <ProgressPage />
                </Suspense>
              }
              path="/progress"
            />
            <Route element={<ProfileSetup />} path="/profile-setup" />
          </Route>
        </Route>
        <Route element={<Navigate to="/" replace />} path="*" />
      </Routes>
    </>
  );
}

export default App;
