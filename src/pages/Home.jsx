import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { useChat } from "../context/ChatContext"; // Importamos el contexto

const Home = () => {
  const { data } = useChat(); // Necesitamos saber si hay un chat abierto (data.chatId)

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      
      {/* LÓGICA RESPONSIVE:
         1. 'w-full': En móvil ocupa todo el ancho.
         2. 'md:w-[400px]': En PC tiene ancho fijo.
         3. 'hidden': Se oculta si hay chat abierto en móvil.
         4. 'md:flex': En PC siempre se muestra (flex).
      */}
      <div className={`${data.chatId !== "null" ? "hidden" : "flex"} w-full md:w-auto md:flex h-full`}>
        <Sidebar />
      </div>
      
      {/* LÓGICA RESPONSIVE CHAT:
         1. 'hidden': Se oculta si NO hay chat abierto en móvil.
         2. 'md:flex': En PC siempre se muestra.
         3. 'w-full': Ocupa el resto del espacio.
      */}
      <div className={`${data.chatId === "null" ? "hidden" : "flex"} w-full h-full`}>
        <ChatWindow />
      </div>

    </div>
  );
};

export default Home;