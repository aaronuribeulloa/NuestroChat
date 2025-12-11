import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { db, storage } from "../config/firebase";
import { doc, updateDoc, Timestamp, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuid } from "uuid";
import { Image, Send, Smile, X, Mic, Square } from "lucide-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";

const Input = () => {
    const [text, setText] = useState<string>("");
    const [img, setImg] = useState<File | null>(null);
    const [openEmoji, setOpenEmoji] = useState<boolean>(false);
    const [recording, setRecording] = useState<boolean>(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const { currentUser } = useAuth();
    const { data } = useChat();

    const handleEmoji = (e: EmojiClickData) => {
        setText((prev) => prev + e.emoji);
    };

    const startRecording = async () => {
        setRecording(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await sendAudio(audioBlob);
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
            };

            mediaRecorder.start();
        } catch (err) {
            console.error("Error accediendo al micrófono:", err);
            setRecording(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setRecording(false);
        }
    };

    const sendAudio = async (audioBlob: Blob) => {
        const audioId = uuid();
        const storageRef = ref(storage, `chatAudios/${audioId}`);
        const uploadTask = uploadBytesResumable(storageRef, audioBlob);

        uploadTask.on(
            "state_changed",
            null,
            (error) => console.log(error),
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                await sendMessageToFirestore(null, null, downloadURL);
            }
        );
    };

    const handleSend = async () => {
        if (text.trim() === "" && !img) return;
        setOpenEmoji(false);
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
                    await sendMessageToFirestore(textToSend, downloadURL, null);
                }
            );
        } else {
            await sendMessageToFirestore(textToSend, null, null);
        }
    };

    const sendMessageToFirestore = async (text: string | null, imgURL: string | null, audioURL: string | null) => {
        if (!currentUser) return;
        const messageId = uuid();

        // --- CAMBIO CLAVE AQUÍ ---
        // Guardamos nombre y foto del remitente dentro del mensaje
        await setDoc(doc(db, "chats", data.chatId, "messages", messageId), {
            id: messageId,
            text: text || "",
            senderId: currentUser.uid,
            senderDisplayName: currentUser.displayName, // Nuevo
            senderPhotoURL: currentUser.photoURL,       // Nuevo
            date: Timestamp.now(),
            img: imgURL || null,
            audio: audioURL || null,
        });

        let lastMsgText = "📷 Foto";
        if (text) lastMsgText = text;
        if (audioURL) lastMsgText = "🎤 Nota de voz";

        // Actualizamos el último mensaje (LastMessage) para el usuario actual
        await updateDoc(doc(db, "userChats", currentUser.uid), {
            [data.chatId + ".lastMessage"]: { text: lastMsgText },
            [data.chatId + ".date"]: serverTimestamp(),
        });

        // En un grupo, esto es más complejo (habría que actualizar a todos), 
        // pero para la V1 de grupos, actualizar tu vista y confiar en que los otros 
        // escuchen el cambio en 'chats' es aceptable o requeriría una Cloud Function.
        // Por ahora, para mantenerlo simple y funcional en cliente:

        // Si NO es grupo, actualizamos al otro usuario directamente:
        if (!data.user.isGroup) {
            await updateDoc(doc(db, "userChats", data.user.uid), {
                [data.chatId + ".lastMessage"]: { text: lastMsgText },
                [data.chatId + ".date"]: serverTimestamp(),
            });
        }
        // Nota: Si es grupo, para que el "último mensaje" se actualice en la lista de TODOS los miembros
        // necesitaríamos recorrer la lista de miembros aquí o usar una Cloud Function.
        // Por simplicidad en este paso, dejaremos que se actualice solo en TU lista 
        // y la de quien reciba la notificación en tiempo real (si implementamos eso después).
    };

    const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.code === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImg(e.target.files[0]);
        }
    };

    return (
        <div className="h-20 bg-white/80 backdrop-blur-md p-4 flex items-center justify-between border-t border-gray-100 absolute bottom-0 w-full z-30">
            {openEmoji && (
                <div className="absolute bottom-24 left-4 z-40 shadow-2xl rounded-2xl">
                    <EmojiPicker onEmojiClick={handleEmoji} width={300} height={400} />
                </div>
            )}
            <div className="flex items-center gap-2 w-full bg-gray-100 px-4 py-2 rounded-full shadow-inner border border-white">
                <button onClick={() => setOpenEmoji(!openEmoji)} className={`p-1 rounded-full transition-colors ${openEmoji ? "text-yellow-500 bg-yellow-100" : "text-gray-400 hover:text-yellow-500"}`}>
                    <Smile size={22} />
                </button>
                <input type="file" style={{ display: "none" }} id="file" onChange={handleFileChange} />
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
                <button onClick={handleSend} className="ml-3 p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all duration-200 active:scale-95 flex items-center justify-center shadow-lg">
                    <Send size={20} className="translate-x-0.5" />
                </button>
            ) : (
                <button onClick={recording ? stopRecording : startRecording} className={`ml-3 p-3 rounded-full transition-all duration-200 active:scale-95 flex items-center justify-center shadow-lg ${recording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                    {recording ? <Square size={20} className="text-white fill-current" /> : <Mic size={20} className="text-white" />}
                </button>
            )}
        </div>
    );
};

export default Input;