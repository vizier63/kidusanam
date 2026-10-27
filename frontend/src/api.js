import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

export function notifyToast(message, type = "success") {
  if (typeof window !== "undefined" && message) {
    window.dispatchEvent(
      new CustomEvent("wellai:toast", { detail: { message, type } }),
    );
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("wellai_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getApiError(error) {
  const detail = error.response?.data?.detail;
  let message;
  if (typeof detail === "string") {
    message = detail;
  } else if (Array.isArray(detail)) {
    message = detail.map((item) => item.msg).filter(Boolean).join(" ");
  } else {
    message = error.response
      ? `Request failed (${error.response.status}). Please try again.`
      : "Unable to reach the WellAI API. Check that the backend is running.";
  }
  notifyToast(message, "error");
  return message;
}
