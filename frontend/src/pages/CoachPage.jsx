import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, getApiError } from "../api.js";

const suggestedQuestions = [
  "What should I eat today?",
  "Explain my workout",
  "Modify my plan for knee pain",
];

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function MicIcon({ listening }) {
  return listening ? (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V5a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1m7 8v4m-4 0h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  ) : (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V5a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1m7 8v4m-4 0h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export default function CoachPage() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const messageListRef = useRef(null);
  const recognitionRef = useRef(null);
  const draftRef = useRef(draft);
  const voiceBaseDraftRef = useRef("");

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    let active = true;
    api
      .get("/chat/history")
      .then(({ data }) => {
        if (active) setMessages(data.messages);
      })
      .catch((requestError) => {
        if (active) setError(getApiError(requestError));
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });
    return () => {
      active = false;
      recognitionRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, sending]);

  const sendMessage = useCallback(async (text) => {
    const content = text.trim();
    if (!content || sending) return;
    setError("");
    setDraft("");
    setSending(true);
    try {
      const { data } = await api.post("/chat", { message: content });
      setMessages((current) => [
        ...current,
        data.user_message,
        data.assistant_message,
      ]);
    } catch (requestError) {
      setDraft(content);
      setError(getApiError(requestError));
    } finally {
      setSending(false);
    }
  }, [sending]);

  function submitMessage(event) {
    event.preventDefault();
    sendMessage(draft);
  }

  function handleComposerKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(draft);
    }
  }

  function toggleVoiceInput() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported by this browser. You can type your message instead.");
      return;
    }

    setError("");
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    voiceBaseDraftRef.current = draftRef.current;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("");
      const base = voiceBaseDraftRef.current;
      setDraft(`${base}${base ? " " : ""}${transcript}`);
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setError("Voice input could not be completed. Please try again or type your message.");
      }
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
      setError("Voice input could not be started. Please try again or type your message.");
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-126px)] max-w-5xl flex-col px-3 py-4 sm:px-6 sm:py-7">
      <section className="flex min-h-[min(760px,calc(100vh-150px))] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
          <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-800 text-lg font-bold text-white">
            W
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-bold text-slate-900">WellAI Coach</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Here to support your wellness journey
            </p>
          </div>
          <Link
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-800"
            to="/dashboard"
          >
            Dashboard
          </Link>
        </header>

        <div
          aria-live="polite"
          className="chat-wallpaper flex-1 space-y-4 overflow-y-auto px-3 py-5 sm:px-6"
          ref={messageListRef}
        >
          <div className="mx-auto w-fit rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 shadow-sm">
            Your private coaching chat
          </div>
          <article className="flex max-w-[88%] items-end gap-2 sm:max-w-[75%]">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-800 text-[10px] font-bold text-white">W</span>
            <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
              <p>Hi! I can help you understand your workout, meal plan, or find a comfortable adjustment. What would you like to chat about?</p>
              <p className="mt-1 text-right text-[10px] text-slate-400">WellAI Coach</p>
            </div>
          </article>

          {loadingHistory && (
            <div className="mx-auto w-fit rounded-full bg-white/80 px-3 py-1.5 text-xs text-slate-500 shadow-sm">
              Loading your conversation...
            </div>
          )}

          {messages.map((message) => (
            <article
              className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : ""}`}
              key={message.id}
            >
              {message.role === "assistant" && (
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-800 text-[10px] font-bold text-white">W</span>
              )}
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-6 shadow-sm sm:max-w-[75%] ${
                  message.role === "user"
                    ? "rounded-br-md bg-teal-800 text-white"
                    : "rounded-bl-md bg-white text-slate-700"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p className={`mt-1 text-right text-[10px] ${message.role === "user" ? "text-teal-100" : "text-slate-400"}`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </article>
          ))}

          {sending && (
            <div className="flex items-end gap-2" role="status" aria-label="Coach is typing">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-800 text-[10px] font-bold text-white">W</span>
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
                <span className="typing-dot" />
                <span className="typing-dot animation-delay-150" />
                <span className="typing-dot animation-delay-300" />
              </div>
            </div>
          )}

          {!loadingHistory && messages.length === 0 && !sending && (
            <div className="pt-4">
              <p className="mb-2 text-center text-xs font-medium text-slate-500">Try asking</p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedQuestions.map((question) => (
                  <button
                    className="rounded-full border border-teal-100 bg-white px-3 py-2 text-xs font-medium text-teal-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
                    key={question}
                    onClick={() => sendMessage(question)}
                    type="button"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-3 mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 sm:mx-6" role="alert">
            {error}
            {error.toLowerCase().includes("profile") && (
              <Link className="ml-1 font-semibold underline" to="/profile-setup">Set up profile</Link>
            )}
          </div>
        )}

        <div className="border-t border-slate-100 bg-white px-3 py-3 sm:px-5 sm:py-4">
          {messages.length > 0 && !sending && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {suggestedQuestions.map((question) => (
                <button
                  className="shrink-0 rounded-full bg-teal-50 px-3 py-1.5 text-[11px] font-medium text-teal-800 transition hover:bg-teal-100"
                  key={question}
                  onClick={() => sendMessage(question)}
                  type="button"
                >
                  {question}
                </button>
              ))}
            </div>
          )}
          {listening && (
            <p className="mb-2 text-center text-xs font-medium text-rose-600" role="status">
              Listening... speak clearly, then pause
            </p>
          )}
          <form className="flex items-end gap-2" onSubmit={submitMessage}>
            <button
              aria-label={listening ? "Stop voice input" : "Start voice input"}
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition ${
                listening ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-800"
              }`}
              onClick={toggleVoiceInput}
              title="Voice input"
              type="button"
            >
              <MicIcon listening={listening} />
            </button>
            <label className="sr-only" htmlFor="coach-message">Message your coach</label>
            <textarea
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
              id="coach-message"
              maxLength={2000}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Message your coach..."
              value={draft}
            />
            <button
              aria-label="Send message"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-800 text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!draft.trim() || sending}
              type="submit"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
            </button>
          </form>
          <p className="mt-2 text-center text-[10px] leading-4 text-slate-400">
            General wellness guidance only — not a medical diagnosis or treatment.
          </p>
        </div>
      </section>
    </main>
  );
}
