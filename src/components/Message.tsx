import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { Trash2, MoreVertical } from "lucide-react"; // Iconos nuevos
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";

// Agregamos el campo opcional 'isDeleted'
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
}

const Message = ({ message }: { message: IMessage }) => {
  const { currentUser } = useAuth();
  const { data } = useChat();
  const ref = useRef<HTMLDivElement>(null);

  // Estado para mostrar el botón de eliminar al pasar el mouse
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [message]);

  const isOwner = message.senderId === currentUser?.uid;

  // --- LÓGICA DE ELIMINAR ---
  const handleDelete = async () => {
    if (!data.chatId) return;

    // Preguntamos confirmación
    const confirm = window.confirm("¿Quieres eliminar este mensaje para todos?");
    if (confirm) {
      try {
        // "Soft Delete": No borramos el doc, solo su contenido para mantener el orden
        await updateDoc(doc(db, "chats", data.chatId, "messages", message.id), {
          text: "🚫 Mensaje eliminado",
          img: null,
          audio: null,
          isDeleted: true
        });

        // Si prefieres borrarlo totalmente y que desaparezca del mapa, usa:
        // await deleteDoc(doc(db, "chats", data.chatId, "messages", message.id));
      } catch (err) {
        console.error("Error al eliminar:", err);
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "";
    const date = new Date(seconds * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- RENDERIZADO ---
  return (
    <div
      ref={ref}
      className={`flex gap-3 mb-6 group relative ${isOwner ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex flex-col items-end gap-1">
        <img
          src={
            isOwner
              ? currentUser?.photoURL || ""
              : message.senderPhotoURL || data.user.photoURL
          }
          alt=""
          className="w-8 h-8 rounded-full object-cover shadow-sm"
          title={!isOwner ? message.senderDisplayName : "Tú"}
        />
      </div>

      <div className={`max-w-[75%] flex flex-col gap-1 ${isOwner ? "items-end" : "items-start"}`}>
        {!isOwner && data.user.isGroup && (
          <span className="text-[10px] text-gray-400 font-bold ml-1">
            {message.senderDisplayName || "Usuario"}
          </span>
        )}

        <div className="relative flex items-center gap-2">
          {/* BOTÓN ELIMINAR (Solo aparece si soy el dueño y no está borrado) */}
          {isOwner && showActions && !message.isDeleted && (
            <button
              onClick={handleDelete}
              className="p-1 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded-full transition-all shadow-sm opacity-0 group-hover:opacity-100"
              title="Eliminar para todos"
            >
              <Trash2 size={14} />
            </button>
          )}

          <div
            className={`px-4 py-3 shadow-md relative text-sm font-medium leading-relaxed overflow-hidden
                ${message.isDeleted
                ? "bg-gray-100 text-gray-400 italic border border-gray-200" // Estilo para borrados
                : isOwner
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl rounded-tr-sm"
                  : "bg-white text-gray-700 rounded-2xl rounded-tl-sm border border-gray-100"
              }
                ${message.isDeleted ? "rounded-2xl" : ""} 
            `}
          >
            {/* CONTENIDO DEL MENSAJE */}
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
        </div>

        <span className="text-[10px] text-gray-400 font-medium px-1">
          {formatTime(message.date?.seconds)}
        </span>
      </div>
    </div>
  );
};

export default Message;