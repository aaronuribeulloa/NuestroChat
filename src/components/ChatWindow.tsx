import { useEffect, useState } from "react";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Video, Phone, ArrowLeft, LogOut } from "lucide-react";
import Messages from "./Messages";
import Input from "./Input";
import { doc, updateDoc, deleteField, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { IReply } from "./Message"; // Importar IReply

const ChatWindow = () => {
  const { data, dispatch } = useChat();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [otherUser, setOtherUser] = useState<any>(null);

  // --- NUEVO ESTADO PARA RESPUESTAS ---
  const [replyTo, setReplyTo] = useState<IReply | null>(null);

  // ... (Tus useEffects y funciones getStatusText, handleVideoCall, handleLeaveChat IDÉNTICAS A ANTES) ...
  // (Omitido para ahorrar espacio, mantén lo que ya tenías)

  // COPIA Y PEGA TUS useEffects Y FUNCIONES AUXILIARES AQUÍ
  useEffect(() => {
    if (data.user.isGroup || !data.user.uid) { setOtherUser(null); return; }
    const unsub = onSnapshot(doc(db, "users", data.user.uid), (doc) => setOtherUser(doc.data()));
    return () => unsub();
  }, [data.user.uid, data.user.isGroup]);
  const getStatusText = () => { /* ... */ return otherUser?.isOnline ? "En línea" : "Desconectado"; };
  const closeChat = () => { dispatch({ type: "CHANGE_USER", payload: null }); };
  const handleVideoCall = () => { if (data.chatId) navigate(`/room/${data.chatId}`); };
  const handleLeaveChat = async () => { /* ... */ };


  if (data.chatId === "null") {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center relative bg-slate-50">
        <MessageCircle size={64} className="text-gray-300 mb-4" />
        <p className="text-gray-500">Selecciona un chat para comenzar</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative transition-colors duration-300"
      style={{
        // Aquí no usamos style inline para el bg, lo movemos a clases de Tailwind para soportar dark mode
      }}
    >
      {/* FONDO PATRÓN OSCURO */}
      <div className="absolute inset-0 z-0 bg-[#f3f4f6] dark:bg-slate-950"
        style={{
          backgroundImage: "radial-gradient(var(--dot-color) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          // Usamos variables CSS para cambiar el color de los puntos
          "--dot-color": "rgba(203, 213, 225, 0.4)" // Ajusta esto o usa clases si prefieres
        } as any}>
        {/* Capa extra para oscurecer los puntos en modo dark si es necesario */}
        <div className="absolute inset-0 bg-transparent dark:bg-slate-950/80"></div>
      </div>

      {/* HEADER */}
      <div className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-slate-800/50 flex items-center justify-between px-6 shadow-sm z-20 sticky top-0 transition-colors">
        {/* ... (Contenido del header: Textos text-gray-800 -> dark:text-white, Iconos hover:bg-gray-100 -> dark:hover:bg-slate-800) ... */}
        <div className="flex flex-col">
          <span className="font-bold text-gray-800 dark:text-white text-lg leading-tight">{data.user?.displayName}</span>
          {/* ... */}
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-hidden relative z-10">
        <div className="h-full w-full pb-24">
          <Messages setReplyTo={setReplyTo} />
        </div>
      </div>

      {/* FOOTER */}
      <Input replyTo={replyTo} setReplyTo={setReplyTo} />
    </div>
  );
};

export default ChatWindow;