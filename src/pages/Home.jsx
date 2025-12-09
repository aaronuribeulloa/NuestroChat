import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

const Home = () => {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Columna Izquierda: Sidebar */}
      <Sidebar />
      
      {/* Columna Derecha: Ventana de Chat */}
      <ChatWindow />
    </div>
  );
};

export default Home;