import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { db, storage } from "../config/firebase";
import { doc, updateDoc, Timestamp, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuid } from "uuid";
import { Image, Send, Smile, X, Mic, Square, CornerUpLeft } from "lucide-react"; // Importamos CornerUpLeft
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { IReply } from "./Message"; // Importamos el tipo

// Props nuevas
interface InputProps {
    replyTo: IReply | null;
    setReplyTo: (reply: IReply | null) => void;
}

const Input = ({ replyTo, setReplyTo }: InputProps) => {
    const [text, setText] = useState<string>("");
    const [img, setImg] = useState<File | null>(null);
    const [openEmoji, setOpenEmoji] = useState<boolean>(false);
    const [recording, setRecording] = useState<boolean>(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const { currentUser } = useAuth();
    const { data } = useChat();

    const handleEmoji = (e: EmojiClickData) => { setText((prev) => prev + e.emoji); };

    // ... (Funciones de Audio: startRecording, stopRecording, sendAudio IDÉNTICAS A ANTES) ...
    // COPIA AQUÍ TUS FUNCIONES DE AUDIO (startRecording, stopRecording, sendAudio)
    // POR ESPACIO LAS OMITO, PERO NO LAS BORRES DE TU CÓDIGO
    const startRecording = async () => { /* ... tu código de audio ... */
        setRecording(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await sendAudio(audioBlob);
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
            };
            mediaRecorder.start();
        } catch (err) { console.error(err); setRecording(false); }
    };
    const stopRecording = () => { if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); setRecording(false); } };
    const sendAudio = async (audioBlob: Blob) => {
        const audioId = uuid();
        const storageRef = ref(storage, `chatAudios/${audioId}`);
        const uploadTask = uploadBytesResumable(storageRef, audioBlob);
        uploadTask.on("state_changed", null, (error) => console.log(error), async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            await sendMessageToFirestore(null, null, downloadURL);
        });
    };
    // ---------------------------------------------------------------------------------

    const handleSend = async () => {
        if (text.trim() === "" && !img) return;
        setOpenEmoji(false);
        const textToSend = text;
        const imgToSend = img;
        const replyToSend = replyTo; // Guardamos la referencia
        setText("");
        setImg(null);
        setReplyTo(null); // Limpiamos la respuesta visualmente

        if (imgToSend) {
            const storageRef = ref(storage, `chatImages/${uuid()}`);
            const uploadTask = uploadBytesResumable(storageRef, imgToSend);
            uploadTask.on(
                "state_changed", null, (error) => { console.error(error); },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    // Enviamos replyToSend también
                    await sendMessageToFirestore(textToSend, downloadURL, null, replyToSend);
                }
            );
        } else {
            await sendMessageToFirestore(textToSend, null, null, replyToSend);
        }
    };

    const sendMessageToFirestore = async (text: string | null, imgURL: string | null, audioURL: string | null, reply: IReply | null = null) => {
        if (!currentUser) return;
        const messageId = uuid();

        await setDoc(doc(db, "chats", data.chatId, "messages", messageId), {
            id: messageId,
            text: text || "",
            senderId: currentUser.uid,
            senderDisplayName: currentUser.displayName,
            senderPhotoURL: currentUser.photoURL,
            date: Timestamp.now(),
            img: imgURL || null,
            audio: audioURL || null,
            replyTo: reply || null // GUARDAMOS LA CITA EN LA BASE DE DATOS
        });

        let lastMsgText = "📷 Foto";
        if (text) lastMsgText = text;
        if (audioURL) lastMsgText = "🎤 Nota de voz";

        if (!data.user.isGroup) {
            await updateDoc(doc(db, "userChats", data.user.uid), {
                [data.chatId + ".lastMessage"]: { text: lastMsgText },
                [data.chatId + ".date"]: serverTimestamp(),
            });
        }
        await updateDoc(doc(db, "userChats", currentUser.uid), {
            [data.chatId + ".lastMessage"]: { text: lastMsgText },
            [data.chatId + ".date"]: serverTimestamp(),
        });
    };

    const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.code === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    return (
        <div className="flex flex-col border-t border-gray-100 absolute bottom-0 w-full z-30 bg-white/80 backdrop-blur-md">

            {/* BARRA DE PREVISUALIZACIÓN DE RESPUESTA */}
            {replyTo && (
                <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200 text-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <CornerUpLeft size={16} className="text-indigo-500 shrink-0" />
                        <div className="flex flex-col">
                            <span className="font-bold text-indigo-600 text-xs">Respondiendo a {replyTo.senderDisplayName}</span>
                            <span className="text-gray-500 truncate max-w-[200px] md:max-w-md italic">{replyTo.text}</span>
                        </div>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-gray-200 rounded-full">
                        <X size={16} className="text-gray-500" />
                    </button>
                </div>
            )}

            {/* INPUT NORMAL */}
            <div className="h-20 p-4 flex items-center justify-between">
                {openEmoji && (
                    <div className="absolute bottom-24 left-4 z-40 shadow-2xl rounded-2xl">
                        <EmojiPicker onEmojiClick={handleEmoji} width={300} height={400} />
                    </div>
                )}
                <div className="flex items-center gap-2 w-full bg-gray-100 px-4 py-2 rounded-full shadow-inner border border-white">
                    <button onClick={() => setOpenEmoji(!openEmoji)} className={`p-1 rounded-full transition-colors ${openEmoji ? "text-yellow-500 bg-yellow-100" : "text-gray-400 hover:text-yellow-500"}`}>
                        <Smile size={22} />
                    </button>
                    <input type="file" style={{ display: "none" }} id="file" onChange={(e) => e.target.files && setImg(e.target.files[0])} />
                    <label htmlFor="file" className="cursor-pointer text-gray-400 hover:text-indigo-500 transition-colors">
                        <Image size={22} />
                    </label>
                    <input type="text" placeholder={recording ? "Grabando audio..." : "Escribe un mensaje..."} onChange={(e) => setText(e.target.value)} onKeyDown={handleKey} value={text} disabled={recording} onClick={() => setOpenEmoji(false)} className={`w-full bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 font-medium ml-2 ${recording ? "animate-pulse text-red-500" : ""}`} />
                    {img && (
                        <div className="flex items-center gap-1 bg-indigo-100 px-2 py-1 rounded-md">
                            <span className="text-xs text-indigo-600 font-bold">Img</span>
                            <X size={12} className="text-indigo-600 cursor-pointer" onClick={() => setImg(null)} />
                        </div>
                    )}
                </div>
                {text || img ? (
                    <button onClick={handleSend} className="ml-3 p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-lg">
                        <Send size={20} className="translate-x-0.5" />
                    </button>
                ) : (
                    <button onClick={recording ? stopRecording : startRecording} className={`ml-3 p-3 rounded-full transition-all shadow-lg ${recording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                        {recording ? <Square size={20} className="text-white fill-current" /> : <Mic size={20} className="text-white" />}
                    </button>
                )}
            </div>
        </div>
    );
};

export default Input;