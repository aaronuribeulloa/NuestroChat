import { useEffect, useState } from "react";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Video, Phone, ArrowLeft, LogOut } from "lucide-react";
import Messages from "./Messages";
import Input from "./Input";
import { doc, updateDoc, deleteField, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { IReply } from "./Message";
import DiscoverUsers from "./DiscoverUsers";
import SocialFeed from "./SocialFeed"; // <--- IMPORTANTE: El Muro Social

const ChatWindow = () => {
  const { data, dispatch } = useChat();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Estados
  const [otherUser, setOtherUser] = useState<any>(null);
  const [replyTo, setReplyTo] = useState<IReply | null>(null);

  // 1. LÓGICA DE USUARIO EN LÍNEA
  useEffect(() => {
    // Si es grupo, null, o es el Feed, no buscamos estado online
    if (data.user.isGroup || !data.user.uid || data.user.uid === "feed") {
      setOtherUser(null);
      return;
    }
    // Escuchamos cambios en el perfil del otro usuario
    const unsub = onSnapshot(doc(db, "users", data.user.uid), (doc) => {
      setOtherUser(doc.data());
    });
    return () => unsub();
  }, [data.user.uid, data.user.isGroup]);

  const getStatusText = () => {
    if (data.user.isGroup) return "Grupo";
    if (!otherUser) return "Desconectado";
    if (otherUser.isOnline) return "En línea";

    // Cálculo de "hace cuánto"
    if (otherUser.lastSeen) {
      const lastDate = otherUser.lastSeen.toDate();
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - lastDate.getTime()) / 1000);
      if (diffInSeconds < 60) return "Activo hace un momento";
      if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
      if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    }
    return "Desconectado";
  };

  // 2. FUNCIONES DE ACCIÓN
  const closeChat = () => {
    dispatch({ type: "CHANGE_USER", payload: null });
  };

  const handleVideoCall = () => {
    if (data.chatId && data.chatId !== "null" && data.chatId !== "feed") {
      navigate(`/room/${data.chatId}`);
    }
  };

  const handleLeaveChat = async () => {
    if (!currentUser || !data.chatId) return;
    const isGroup = data.user.isGroup;
    const confirmMessage = isGroup
      ? "¿Seguro que quieres salir de este grupo?"
      : "¿Quieres eliminar este chat de tu lista?";

    if (window.confirm(confirmMessage)) {
      try {
        await updateDoc(doc(db, "userChats", currentUser.uid), {
          [data.chatId]: deleteField()
        });
        dispatch({ type: "RESET" });
      } catch (err) {
        console.error("Error al salir:", err);
      }
    }
  };

  // --- ESTADO 1: MURO SOCIAL (FEED) ---
  if (data.user.uid === "feed") {
    return <SocialFeed />;
  }

  // --- ESTADO 2: PANTALLA DE DESCUBRIMIENTO (Cuando no hay chat) ---
  if (data.chatId === "null") {
    return <DiscoverUsers />;
  }

  // --- ESTADO 3: CHAT ACTIVO ---
  return (
    <div className="flex-1 flex flex-col h-full relative transition-colors duration-300">

      {/* FONDO PATRÓN OSCURO */}
      <div className="absolute inset-0 z-0 bg-[#f3f4f6] dark:bg-slate-950 transition-colors duration-300 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(203, 213, 225, 0.4) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}>
        <div className="absolute inset-0 bg-transparent dark:bg-slate-950/60"></div>
      </div>

      {/* HEADER */}
      <div className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-slate-800/50 flex items-center justify-between px-6 shadow-sm z-20 sticky top-0 transition-colors">
        <div className="flex items-center gap-4">
          <button onClick={closeChat} className="md:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <ArrowLeft size={24} />
          </button>

          <div className="relative">
            <img
              src={data.user?.photoURL}
              alt="User"
              className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm"
            />
            {!data.user.isGroup && otherUser?.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></div>
            )}
          </div>

          <div className="flex flex-col">
            <span className="font-bold text-gray-800 dark:text-white text-lg leading-tight">
              {data.user?.displayName}
            </span>
            <span className={`text-xs font-medium ${otherUser?.isOnline ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
              {getStatusText()}
            </span>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="flex gap-2 text-gray-400 dark:text-gray-500">
          <div onClick={handleVideoCall} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full cursor-pointer hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" title="Videollamada">
            <Video size={20} />
          </div>
          <div className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full cursor-pointer hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors" title="Llamada">
            <Phone size={20} />
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1 self-center"></div>

          <div onClick={handleLeaveChat} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full cursor-pointer hover:text-red-500 transition-colors" title="Opciones">
            <LogOut size={20} />
          </div>
        </div>
      </div>

      {/* BODY DE MENSAJES */}
      <div className="flex-1 overflow-hidden relative z-10">
        <div className="h-full w-full pb-24">
          <Messages setReplyTo={setReplyTo} />
        </div>
      </div>

      {/* FOOTER INPUT */}
      <Input replyTo={replyTo} setReplyTo={setReplyTo} />
    </div>
  );
};

export default ChatWindow;