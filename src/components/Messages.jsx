import { useEffect, useState } from "react";
import { useChat } from "../context/ChatContext";
import { db } from "../config/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"; // Importante: orderBy
import Message from "./Message"; // Importamos la burbuja que acabamos de crear

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const { data } = useChat();

  useEffect(() => {
    // Si no hay chat seleccionado, no hacemos nada
    if (!data.chatId) return;

    // Conexión en tiempo real a la subcolección "messages"
    // Ordenamos por fecha para que salgan en orden
    const unSub = onSnapshot(
        query(collection(db, "chats", data.chatId, "messages"), orderBy("date", "asc")),
        (snapshot) => {
            setMessages(snapshot.docs.map((doc) => doc.data()));
        }
    );

    // Limpiamos la conexión cuando cambiamos de chat
    return () => {
      unSub();
    };
  }, [data.chatId]);

  return (
    <div className="h-full p-4 overflow-y-auto custom-scrollbar">
        {messages.map((m) => (
            <Message message={m} key={m.id} />
        ))}
        
        {/* Mensaje vacío si no hay conversación */}
        {messages.length === 0 && (
            <div className="text-center mt-10 opacity-30">
                <p>Di "Hola" para comenzar 👋</p>
            </div>
        )}
    </div>
  );
};

export default Messages;