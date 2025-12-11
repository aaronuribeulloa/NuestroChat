import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { useChat } from "../context/ChatContext";

const Home = () => {
  const { data } = useChat();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">

      {/* LÓGICA RESPONSIVE: Ocultar Sidebar si hay chat abierto en móvil */}
      <div className={`${data.chatId !== "null" ? "hidden" : "flex"} w-full md:w-auto md:flex h-full`}>
        <Sidebar />
      </div>

      {/* LÓGICA RESPONSIVE: Ocultar ChatWindow si NO hay chat abierto en móvil */}
      <div className={`${data.chatId === "null" ? "hidden" : "flex"} w-full h-full`}>
        <ChatWindow />
      </div>

    </div>
  );
};

export default Home;