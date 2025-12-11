import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

// 1. ACTUALIZAMOS LA INTERFAZ CON LOS NUEVOS DATOS OPCIONALES
export interface IMessage {
  id: string;
  text: string;
  senderId: string;
  senderDisplayName?: string; // Nuevo
  senderPhotoURL?: string;    // Nuevo
  date: any;
  img?: string;
  audio?: string;
}

const Message = ({ message }: { message: IMessage }) => {
  const { currentUser } = useAuth();
  const { data } = useChat();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [message]);

  const isOwner = message.senderId === currentUser?.uid;

  const formatTime = (seconds: number) => {
    if (!seconds) return "";
    const date = new Date(seconds * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      ref={ref}
      className={`flex gap-3 mb-6 ${isOwner ? "flex-row-reverse" : ""}`}
    >
      <div className="flex flex-col items-end gap-1">
        {/* FOTO DE PERFIL */}
        <img
          src={
            isOwner
              ? currentUser?.photoURL || ""
              : message.senderPhotoURL || data.user.photoURL // Si tiene foto propia úsala, si no, usa la del chat (fallback)
          }
          alt=""
          className="w-8 h-8 rounded-full object-cover shadow-sm"
          title={!isOwner ? message.senderDisplayName : "Tú"} // Tooltip al pasar el mouse
        />
      </div>

      <div className={`max-w-[75%] flex flex-col gap-1 ${isOwner ? "items-end" : "items-start"}`}>
        {/* NOMBRE DEL REMITENTE (Solo en grupos y si no soy yo) */}
        {!isOwner && data.user.isGroup && (
          <span className="text-[10px] text-gray-400 font-bold ml-1">
            {message.senderDisplayName || "Usuario"}
          </span>
        )}

        <div
          className={`px-4 py-3 shadow-md relative text-sm font-medium leading-relaxed overflow-hidden
            ${isOwner
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl rounded-tr-sm"
              : "bg-white text-gray-700 rounded-2xl rounded-tl-sm border border-gray-100"
            }`}
        >
          {message.img && (
            <img src={message.img} alt="attached" className="rounded-xl mb-2 max-w-full border-2 border-white/20" />
          )}

          {message.audio && (
            <audio controls className="w-60 h-8 mt-1 mb-1">
              <source src={message.audio} type="audio/webm" />
              Tu navegador no soporta audios.
            </audio>
          )}

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