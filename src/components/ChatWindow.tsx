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
    <div className="flex-1 flex flex-col h-full relative" style={{ backgroundColor: "#f3f4f6", backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "20px 20px" }}>

      {/* HEADER (Igual que antes) */}
      <div className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-6 shadow-sm z-20 sticky top-0">
        <div className="flex items-center gap-4">
          <button onClick={closeChat} className="md:hidden text-gray-500 hover:text-gray-700"><ArrowLeft size={24} /></button>
          <div className="relative">
            <img src={data.user?.photoURL} alt="User" className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm" />
            {!data.user.isGroup && otherUser?.isOnline && (<div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>)}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-800 text-lg leading-tight">{data.user?.displayName}</span>
            <span className={`text-xs font-medium ${otherUser?.isOnline ? "text-green-600" : "text-gray-400"}`}>{getStatusText()}</span>
          </div>
        </div>
        <div className="flex gap-2 text-gray-400">
          <div onClick={handleVideoCall} className="p-2 hover:bg-gray-100 rounded-full cursor-pointer hover:text-indigo-500"><Video size={20} /></div>
          <div className="p-2 hover:bg-gray-100 rounded-full cursor-pointer hover:text-indigo-500"><Phone size={20} /></div>
          <div className="w-px h-6 bg-gray-200 mx-1 self-center"></div>
          <div onClick={handleLeaveChat} className="p-2 hover:bg-red-50 rounded-full cursor-pointer hover:text-red-500"><LogOut size={20} /></div>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full w-full pb-24">
          {/* Pasamos el Setter hacia abajo */}
          <Messages setReplyTo={setReplyTo} />
        </div>
      </div>

      {/* FOOTER */}
      {/* Pasamos el Estado y el Setter */}
      <Input replyTo={replyTo} setReplyTo={setReplyTo} />
    </div>
  );
};

export default ChatWindow;