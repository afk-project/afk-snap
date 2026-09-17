import { Bot, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { notify } from "../services/notify";

export default function ChatPanel({ roomId }) {
  const [content, setContent] = useState("");
  const [assistantMode, setAssistantMode] = useState(false);
  const [sending, setSending] = useState(false);
  const { messages, typing, assistantTyping } = useSelector((state) => state.chat);
  const userId = useSelector((state) => state.auth.user?.id);
  const dispatch = useDispatch();
  const messagesRef = useRef(null);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, assistantTyping]);

  const sendContent = (rawContent) => {
    const message = rawContent.trim();
    if (!message || sending) return;
    setSending(true);
    dispatch({
      type: assistantMode ? "socket/askAssistant" : "socket/sendMessage",
      payload: { roomId, content: message },
      meta: {
        ack: (response) => {
          setSending(false);
          if (!response?.ok) notify(response?.message || "Pesan gagal dikirim", "error");
        },
      },
    });
    setContent("");
    dispatch({ type: "socket/typingStop", payload: { roomId } });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendContent(content);
  };

  return (
    <section className="flex h-[65vh] min-h-[520px] max-h-[680px] flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
        <div><h2 className="font-black text-[var(--text)]">Chatroom</h2><p className="text-xs text-[var(--muted)]">Sinkron realtime dengan Socket.IO</p></div>
        <button
          onClick={() => setAssistantMode((value) => !value)}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${assistantMode ? "bg-violet-500 text-white" : "bg-[var(--surface-2)] text-[var(--muted)]"}`}
        >
          <Sparkles size={14} /> AI
        </button>
      </div>
      {assistantMode && <div className="flex gap-2 overflow-x-auto border-b border-[var(--border)] px-4 py-3">
        {["Bagaimana cara memakai AFKSnap?", "Jelaskan paket Free, Pro, dan Max", "Bagaimana membuat foto Anime Simpson?"].map((suggestion) => <button key={suggestion} type="button" disabled={sending} onClick={() => sendContent(suggestion)} className="shrink-0 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[10px] font-bold text-violet-500 disabled:opacity-50">{suggestion}</button>)}
      </div>}
      <div ref={messagesRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => {
          const own = message.userId === userId;
          const assistant = message.type === "assistant";
          if (message.type === "system") return <p key={message.id} className="text-center text-xs text-[var(--muted)]">{message.content}</p>;
          return (
            <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${own ? "rounded-br-md bg-orange-500 text-white" : assistant ? "rounded-bl-md bg-violet-500/15 text-[var(--text)]" : "rounded-bl-md bg-[var(--surface-2)] text-[var(--text)]"}`}>
                <p className="mb-1 flex items-center gap-1 text-[10px] font-black opacity-70">{assistant && <Bot size={12} />}{assistant ? "AFKSnap AI" : message.user?.name}</p>
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
            </div>
          );
        })}
        {assistantTyping && <p className="text-xs font-semibold text-violet-500">AFKSnap AI sedang mengetik...</p>}
        {!!typing.length && <p className="text-xs text-[var(--muted)]">{typing.map((item) => item.name).join(", ")} sedang mengetik...</p>}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-[var(--border)] p-3">
        <div className="flex gap-2">
          <input
            disabled={sending}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              dispatch({ type: event.target.value ? "socket/typingStart" : "socket/typingStop", payload: { roomId } });
            }}
            placeholder={assistantMode ? "Tanya cara pakai, paket, atau ide prompt..." : "Tulis pesan..."}
            className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-orange-400"
          />
          <button disabled={sending || !content.trim()} className="grid size-12 place-items-center rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"><Send size={18} className={sending ? "animate-pulse" : ""} /></button>
        </div>
      </form>
    </section>
  );
}
