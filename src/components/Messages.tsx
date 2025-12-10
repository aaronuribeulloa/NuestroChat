import { useEffect, useState } from "react";
import { useChat } from "../context/ChatContext";
import { db } from "../config/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
// Importamos el componente Y la Interfaz (el molde)
import Message, { IMessage } from "./Message";

const Messages = () => {
  // 1. TIPADO DEL ESTADO
  // Le decimos: "Esto va a ser un array de IMessage". 
  // Si no pones esto, TS grita al intentar guardar datos.
  const [messages, setMessages] = useState<IMessage[]>([]);
  const { data } = useChat();

  useEffect(() => {
    // Si no hay chat seleccionado, no hacemos nada
    if (!data.chatId) return;

    // Conexión en tiempo real
    const unSub = onSnapshot(
      query(collection(db, "chats", data.chatId, "messages"), orderBy("date", "asc")),
      (snapshot) => {
        // 2. CASTING DE DATOS (Type Assertion)
        // Firebase devuelve datos genéricos. Le decimos "as IMessage" para
        // confirmar que esos datos cumplen con nuestro molde.
        const msgs = snapshot.docs.map((doc) => doc.data() as IMessage);
        setMessages(msgs);
      }
    );

    return () => {
      unSub();
    };
  }, [data.chatId]);

  return (
    <div className="h-full p-4 overflow-y-auto custom-scrollbar">
      {messages.map((m) => (
        // Ahora TS sabe que 'm' tiene .id, .text, etc.
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