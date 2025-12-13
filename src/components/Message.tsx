import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { Trash2, CornerUpLeft } from "lucide-react"; // Icono de Responder
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";

// 1. DEFINIMOS LA ESTRUCTURA DE UNA RESPUESTA
export interface IReply {
  id: string;
  text: string;
  senderDisplayName: string;
}

export interface IMessage {
  id: string;
  text: string;
  senderId: string;
  senderDisplayName?: string;
  senderPhotoURL?: string;
  date: any;
  img?: string;
  audio?: string;
  isDeleted?: boolean;
  replyTo?: IReply; // 2. NUEVO CAMPO EN EL MENSAJE
}

// 3. RECIBIMOS LA FUNCIÓN setReplyTo DESDE EL PADRE
interface Props {
  message: IMessage;
  setReplyTo: (reply: IReply) => void;
}

const Message = ({ message, setReplyTo }: Props) => {
  const { currentUser } = useAuth();
  const { data } = useChat();
  const ref = useRef<HTMLDivElement>(null);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [message]);

  const isOwner = message.senderId === currentUser?.uid;

  const handleDelete = async () => {
    if (!data.chatId) return;
    const confirm = window.confirm("¿Eliminar para todos?");
    if (confirm) {
      try {
        await updateDoc(doc(db, "chats", data.chatId, "messages", message.id), {
          text: "🚫 Mensaje eliminado",
          img: null,
          audio: null,
          isDeleted: true,
          replyTo: null // Borramos también la cita si se elimina
        });
      } catch (err) { console.error(err); }
    }
  };

  // Función para activar la respuesta
  const handleReply = () => {
    const textPreview = message.text
      ? message.text
      : (message.img ? "📷 Foto" : (message.audio ? "🎤 Audio" : "Mensaje"));

    setReplyTo({
      id: message.id,
      text: textPreview,
      senderDisplayName: message.senderDisplayName || "Usuario"
    });
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "";
    const date = new Date(seconds * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      ref={ref}
      className={`flex gap-3 mb-6 group relative ${isOwner ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex flex-col items-end gap-1">
        <img
          src={isOwner ? currentUser?.photoURL || "" : message.senderPhotoURL || data.user.photoURL}
          alt=""
          className="w-8 h-8 rounded-full object-cover shadow-sm"
        />
      </div>

      <div className={`max-w-[75%] flex flex-col gap-1 ${isOwner ? "items-end" : "items-start"}`}>
        {!isOwner && data.user.isGroup && (
          <span className="text-[10px] text-gray-400 font-bold ml-1">{message.senderDisplayName}</span>
        )}

        <div className={`relative flex items-center gap-2 ${isOwner ? "flex-row-reverse" : ""}`}>

          {/* BOTONES DE ACCIÓN (Responder / Eliminar) */}
          {showActions && !message.isDeleted && (
            <div className="flex gap-1">
              {/* Botón Responder (Para todos) */}
              <button
                onClick={handleReply}
                className="p-1.5 bg-gray-100 hover:bg-indigo-100 text-gray-400 hover:text-indigo-500 rounded-full transition-all shadow-sm"
                title="Responder"
              >
                <CornerUpLeft size={14} />
              </button>
              {/* Botón Eliminar (Solo dueños) */}
              {isOwner && (
                <button
                  onClick={handleDelete}
                  className="p-1.5 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded-full transition-all shadow-sm"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}

          <div className={`px-4 py-3 shadow-md relative text-sm font-medium leading-relaxed overflow-hidden
                ${message.isDeleted
              ? "bg-gray-100 text-gray-400 italic border border-gray-200"
              : isOwner
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl rounded-tr-sm"
                : "bg-white text-gray-700 rounded-2xl rounded-tl-sm border border-gray-100"
            } ${message.isDeleted ? "rounded-2xl" : ""}`}>

            {/* 4. VISUALIZACIÓN DE LA CITA (Si existe) */}
            {message.replyTo && !message.isDeleted && (
              <div className={`mb-2 p-2 rounded-lg text-xs border-l-4 ${isOwner ? "bg-black/10 border-white/50 text-white/90" : "bg-gray-100 border-indigo-500 text-gray-600"}`}>
                <span className="font-bold block mb-0.5">{message.replyTo.senderDisplayName}</span>
                <span className="line-clamp-1 italic opacity-80">{message.replyTo.text}</span>
              </div>
            )}

            {message.img && <img src={message.img} alt="attached" className="rounded-xl mb-2 max-w-full border-2 border-white/20" />}
            {message.audio && <audio controls className="w-60 h-8 mt-1 mb-1"><source src={message.audio} type="audio/webm" /></audio>}
            {message.text && !message.audio && <p>{message.text}</p>}
          </div>
        </div>
        <span className="text-[10px] text-gray-400 font-medium px-1">{formatTime(message.date?.seconds)}</span>
      </div>
    </div>
  );
};

export default Message;