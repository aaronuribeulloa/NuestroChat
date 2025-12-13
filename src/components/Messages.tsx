import { useEffect, useState, useRef } from "react";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../config/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
// Importamos IReply y IMessage
import Message, { IMessage, IReply } from "./Message";

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2346/2346-preview.mp3";

// Recibimos la función setReplyTo como prop
const Messages = ({ setReplyTo }: { setReplyTo: (reply: IReply) => void }) => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const { data } = useChat();
  const { currentUser } = useAuth();
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
    return () => { unSub(); isFirstLoad.current = true; };
  }, [data.chatId]);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    if (currentUser && lastMsg.senderId !== currentUser.uid) {
      const audio = new Audio(NOTIFICATION_SOUND);
      audio.volume = 0.5;
      audio.play().catch(err => console.log(err));
    }
  }, [messages, currentUser]);

  return (
    <div className="h-full p-4 overflow-y-auto custom-scrollbar">
      {messages.map((m) => (
        <Message message={m} key={m.id} setReplyTo={setReplyTo} />
      ))}
      {messages.length === 0 && (
        <div className="text-center mt-10 opacity-30 animate-pulse"><p>Di "Hola" para comenzar 👋</p></div>
      )}
    </div>
  );
};

export default Messages;