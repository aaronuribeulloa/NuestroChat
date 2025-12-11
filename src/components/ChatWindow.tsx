import { useChat } from "../context/ChatContext";
import { MessageCircle, MoreVertical, Video, Phone, ArrowLeft } from "lucide-react";
import Messages from "./Messages";
import Input from "./Input";

const ChatWindow = () => {
  const { data, dispatch } = useChat();

  // Función para volver atrás
  const closeChat = () => {
    dispatch({ type: "CHANGE_USER", payload: null });
  };

  // ESTADO 1: PANTALLA DE BIENVENIDA (Sin chat seleccionado)
  if (data.chatId === "null") {
    return (
      <div
        className="hidden md:flex flex-1 flex-col items-center justify-center relative overflow-hidden"
        style={{
          backgroundColor: "#f8fafc",
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      >
        <div className="text-center p-10 z-10 bg-white/50 backdrop-blur-xl rounded-3xl shadow-xl border border-white">
          <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 p-6 rounded-3xl inline-block mb-6 shadow-lg shadow-black/50">
            <MessageCircle size={64} className="text-yellow-300" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2 font-sans">NuestroChat Web</h2>
          <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
            Envía mensajes, fotos y conecta con tus amigos en tiempo real con una interfaz moderna y rápida.
          </p>
          <div className="mt-8 flex gap-2 justify-center">
            <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-xs font-semibold">Seguro</span>
            <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-semibold">Rápido</span>
          </div>
        </div>

        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      </div>
    );
  }

  // ESTADO 2: CHAT ACTIVO
  return (
    <div
      className="flex-1 flex flex-col h-full relative"
      style={{
        backgroundColor: "#f3f4f6",
        backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
        backgroundSize: "20px 20px"
      }}
    >
      {/* 1. HEADER */}
      <div className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-6 shadow-sm z-20 sticky top-0">
        <div className="flex items-center gap-4">

          <button
            onClick={closeChat}
            className="md:hidden text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="relative">
            <img
              src={data.user?.photoURL}
              alt="User"
              className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>

          <div className="flex flex-col">
            <span className="font-bold text-gray-800 text-lg leading-tight">
              {data.user?.displayName}
            </span>
            <span className="text-xs text-indigo-500 font-medium">
              En línea
            </span>
          </div>
        </div>

        <div className="flex gap-4 text-gray-400">
          <div className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors hover:text-indigo-500">
            <Video size={22} />
          </div>
          <div className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors hover:text-indigo-500">
            <Phone size={22} />
          </div>
          <div className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors hover:text-gray-600">
            <MoreVertical size={22} />
          </div>
        </div>
      </div>

      {/* 2. ÁREA DE MENSAJES */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full w-full pb-24">
          <Messages />
        </div>
      </div>

      {/* 3. INPUT */}
      <Input />
    </div>
  );
};

export default ChatWindow;