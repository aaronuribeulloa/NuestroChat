import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { db, storage } from "../config/firebase";
import { doc, updateDoc, Timestamp, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuid } from "uuid";
import { Image, Send } from "lucide-react";

const Input = () => {
    const [text, setText] = useState("");
    const [img, setImg] = useState(null);

    const { currentUser } = useAuth();
    const { data } = useChat();

    const handleSend = async () => {
        if (text.trim() === "" && !img) return;

        const textToSend = text;
        const imgToSend = img;
        setText("");
        setImg(null);

        if (imgToSend) {
            const storageRef = ref(storage, `chatImages/${uuid()}`);
            const uploadTask = uploadBytesResumable(storageRef, imgToSend);

            uploadTask.on(
                "state_changed",
                null,
                (error) => { console.error("Error subiendo imagen:", error); },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    await sendMessageToFirestore(textToSend, downloadURL);
                }
            );
        } else {
            await sendMessageToFirestore(textToSend, null);
        }
    };

    const sendMessageToFirestore = async (text, imgURL) => {
        // 1. Guardar mensaje en Chat
        await setDoc(doc(db, "chats", data.chatId, "messages", uuid()), {
            id: uuid(),
            text: text,
            senderId: currentUser.uid,
            date: Timestamp.now(),
            img: imgURL,
        });

        // 2. Actualizar "Last Message" para MI usuario
        await updateDoc(doc(db, "userChats", currentUser.uid), {
            [data.chatId + ".lastMessage"]: {
                text: text || "📷 Foto",
            },
            [data.chatId + ".date"]: serverTimestamp(),
        });

        // 3. Actualizar "Last Message" para el OTRO usuario
        await updateDoc(doc(db, "userChats", data.user.uid), {
            [data.chatId + ".lastMessage"]: {
                text: text || "📷 Foto",
            },
            [data.chatId + ".date"]: serverTimestamp(),
        });
    };

    const handleKey = (e) => {
        if (e.code === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="h-20 bg-white/80 backdrop-blur-md p-4 flex items-center justify-between border-t border-gray-100 absolute bottom-0 w-full z-10">
            <div className="flex items-center gap-4 w-full bg-gray-100 px-4 py-2 rounded-full shadow-inner border border-white">
                <input
                    type="file"
                    style={{ display: "none" }}
                    id="file"
                    onChange={(e) => setImg(e.target.files[0])}
                />
                <label htmlFor="file" className="cursor-pointer text-gray-400 hover:text-indigo-500 transition-colors">
                    <Image size={22} />
                </label>

                <input
                    type="text"
                    placeholder="Escribe un mensaje..."
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKey}
                    value={text}
                    className="w-full bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 font-medium"
                />

                {img && <span className="text-xs text-indigo-600 font-bold bg-indigo-100 px-2 py-1 rounded-md">Img</span>}
            </div>

            <button
                onClick={handleSend}
                className="ml-3 p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 hover:scale-105 hover:shadow-lg transition-all duration-200 active:scale-95"
            >
                <Send size={20} className={text ? "translate-x-0.5" : ""} />
            </button>
        </div>
    );
};

export default Input;