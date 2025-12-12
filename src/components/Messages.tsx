import { useEffect, useState, useRef } from "react";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext"; // Importamos Auth para saber quién soy
import { db } from "../config/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import Message, { IMessage } from "./Message";

// URL de un sonido suave de notificación (tipo burbuja)
const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2346/2346-preview.mp3";

const Messages = () => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const { data } = useChat();
  const { currentUser } = useAuth(); // Necesitamos saber quién es el usuario actual

  // Referencia para saber si es la primera carga (y evitar que suene al abrir el chat)
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!data.chatId) return;

    const unSub = onSnapshot(
      query(collection(db, "chats", data.chatId, "messages"), orderBy("date", "asc")),
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => doc.data() as IMessage);
        setMessages(msgs);
      }
    );

    return () => {
      unSub();
      isFirstLoad.current = true; // Reseteamos al salir del chat
    };
  }, [data.chatId]);

  // --- EFECTO DE SONIDO ---
  useEffect(() => {
    // 1. Si no hay mensajes o es la primera carga, no hacemos nada
    if (messages.length === 0) return;

    // 2. Obtenemos el último mensaje
    const lastMsg = messages[messages.length - 1];

    // 3. Si es la primera vez que cargamos este chat, marcamos como "ya cargado" y salimos
    // Esto evita que suene al entrar a un chat viejo.
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    // 4. Si el último mensaje NO es mío, reproducimos sonido
    if (currentUser && lastMsg.senderId !== currentUser.uid) {
      const audio = new Audio(NOTIFICATION_SOUND);
      audio.volume = 0.5; // Volumen al 50%
      audio.play().catch(err => console.log("El navegador bloqueó el audio automático", err));
    }

  }, [messages, currentUser]);

  return (
    <div className="h-full p-4 overflow-y-auto custom-scrollbar">
      {messages.map((m) => (
        <Message message={m} key={m.id} />
      ))}

      {messages.length === 0 && (
        <div className="text-center mt-10 opacity-30 animate-pulse">
          <p>Di "Hola" para comenzar 👋</p>
        </div>
      )}
    </div>
  );
};

export default Messages;