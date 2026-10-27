import { useEffect, useRef, useState } from "react";

export default function ToastViewport() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Set());

  useEffect(() => {
    function onToast(event) {
      const toast = { id: Date.now() + Math.random(), ...event.detail };
      setToasts((current) => [...current.slice(-2), toast]);
      const timer = window.setTimeout(() => {
        timers.current.delete(timer);
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, 5000);
      timers.current.add(timer);
    }

    window.addEventListener("wellai:toast", onToast);
    return () => {
      window.removeEventListener("wellai:toast", onToast);
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  return (
    <div
      aria-atomic="false"
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg ${
            toast.type === "error"
              ? "border-rose-200 bg-white text-rose-800"
              : "border-teal-200 bg-white text-teal-900"
          }`}
          key={toast.id}
          role={toast.type === "error" ? "alert" : "status"}
        >
          <span className="flex-1 leading-5">{toast.message}</span>
          <button
            aria-label="Dismiss notification"
            className="rounded px-1 font-bold opacity-60 hover:opacity-100"
            onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
            type="button"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
