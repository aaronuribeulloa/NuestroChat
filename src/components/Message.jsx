import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

const Message = ({ message }) => {
  const { currentUser } = useAuth();
  const { data } = useChat();
  const ref = useRef();

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [message]);

  const isOwner = message.senderId === currentUser.uid;

  const formatTime = (seconds) => {
    if (!seconds) return "";
    const date = new Date(seconds * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      ref={ref}
      className={`flex gap-3 mb-6 ${isOwner ? "flex-row-reverse" : ""}`}
    >
      <div className="flex flex-col items-end">
        <img
          src={isOwner ? currentUser.photoURL : data.user.photoURL}
          alt=""
          className="w-8 h-8 rounded-full object-cover shadow-sm"
        />
      </div>

      <div className={`max-w-[75%] flex flex-col gap-1 ${isOwner ? "items-end" : "items-start"}`}>
        <div
          className={`px-4 py-3 shadow-md relative text-sm font-medium leading-relaxed overflow-hidden
            ${isOwner
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl rounded-tr-sm"
              : "bg-white text-gray-700 rounded-2xl rounded-tl-sm border border-gray-100"
            }`}
        >
          {/* 1. SI ES IMAGEN */}
          {message.img && (
            <img src={message.img} alt="attached" className="rounded-xl mb-2 max-w-full border-2 border-white/20" />
          )}

          {/* 2. SI ES AUDIO (Nuevo) */}
          {message.audio && (
            <audio controls className="w-60 h-8 mt-1 mb-1">
              <source src={message.audio} type="audio/webm" />
              Tu navegador no soporta audios.
            </audio>
          )}

          {/* 3. SI ES TEXTO */}
          {message.text && !message.audio && <p>{message.text}</p>}
        </div>

        <span className="text-[10px] text-gray-400 font-medium px-1">
          {formatTime(message.date?.seconds)}
        </span>
      </div>
    </div>
  );
};

export default Message;