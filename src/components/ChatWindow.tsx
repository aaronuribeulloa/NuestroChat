import { useEffect, useState } from "react"; // IMPORTANTE: Agregamos useState y useEffect
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Video, Phone, ArrowLeft, LogOut } from "lucide-react";
import Messages from "./Messages";
import Input from "./Input";
import { doc, updateDoc, deleteField, onSnapshot } from "firebase/firestore"; // Importamos onSnapshot
import { db } from "../config/firebase";

const ChatWindow = () => {
  const { data, dispatch } = useChat();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Estado local para guardar la info "viva" del otro usuario
  const [otherUser, setOtherUser] = useState<any>(null);

  // --- EFECTO: ESCUCHAR ACTIVIDAD DEL OTRO USUARIO ---
  useEffect(() => {
    // Si es grupo o no hay usuario, no hacemos nada
    if (data.user.isGroup || !data.user.uid) {
      setOtherUser(null);
      return;
    }

    // Nos suscribimos a los cambios del perfil del otro usuario
    const unsub = onSnapshot(doc(db, "users", data.user.uid), (doc) => {
      setOtherUser(doc.data());
    });

    return () => {
      unsub();
    };
  }, [data.user.uid, data.user.isGroup]);


  // --- FUNCIÓN PARA FORMATEAR "ÚLTIMA VEZ" ---
  const getStatusText = () => {
    if (data.user.isGroup) return "Grupo";
    if (!otherUser) return "Desconectado";

    // Si tiene la marca explícita de online
    if (otherUser.isOnline) return "En línea";

    // Si no, calculamos el tiempo desde lastSeen
    if (otherUser.lastSeen) {
      const lastDate = otherUser.lastSeen.toDate();
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - lastDate.getTime()) / 1000);

      if (diffInSeconds < 60) return "Activo hace un momento";
      if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
      if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
      return "Desconectado"; // Más de un día
    }

    return "Desconectado";
  };


  const closeChat = () => {
    dispatch({ type: "CHANGE_USER", payload: null });
  };

  const handleVideoCall = () => {
    if (data.chatId && data.chatId !== "null") {
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

  if (data.chatId === "null") {
    // ... (Mismo código de bienvenida que ya tenías) ...
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center relative bg-slate-50">
        <MessageCircle size={64} className="text-gray-300 mb-4" />
        <p className="text-gray-500">Selecciona un chat para comenzar</p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col h-full relative"
      style={{
        backgroundColor: "#f3f4f6",
        backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
        backgroundSize: "20px 20px"
      }}
    >
      {/* HEADER */}
      <div className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-6 shadow-sm z-20 sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={closeChat} className="md:hidden text-gray-500 hover:text-gray-700">
            <ArrowLeft size={24} />
          </button>

          <div className="relative">
            <img
              src={data.user?.photoURL}
              alt="User"
              className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
            />
            {/* Indicador visual (Bolita verde) */}
            {!data.user.isGroup && otherUser?.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
            )}
          </div>

          <div className="flex flex-col">
            <span className="font-bold text-gray-800 text-lg leading-tight">
              {data.user?.displayName}
            </span>
            {/* Texto de estado dinámico */}
            <span className={`text-xs font-medium ${otherUser?.isOnline ? "text-green-600" : "text-gray-400"}`}>
              {getStatusText()}
            </span>
          </div>
        </div>

        <div className="flex gap-2 text-gray-400">
          <div onClick={handleVideoCall} className="p-2 hover:bg-gray-100 rounded-full cursor-pointer hover:text-indigo-500" title="Videollamada">
            <Video size={20} />
          </div>
          <div className="p-2 hover:bg-gray-100 rounded-full cursor-pointer hover:text-indigo-500" title="Llamada">
            <Phone size={20} />
          </div>
          <div className="w-px h-6 bg-gray-200 mx-1 self-center"></div>
          <div onClick={handleLeaveChat} className="p-2 hover:bg-red-50 rounded-full cursor-pointer hover:text-red-500" title="Opciones">
            <LogOut size={20} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="h-full w-full pb-24">
          <Messages />
        </div>
      </div>

      <Input />
    </div>
  );
};

export default ChatWindow;