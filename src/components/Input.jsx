import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { db, storage } from "../config/firebase";
import { doc, updateDoc, Timestamp, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuid } from "uuid";
import { Image, Send, Smile, X, Mic, Square } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

const Input = () => {
    const [text, setText] = useState("");
    const [img, setImg] = useState(null);
    const [openEmoji, setOpenEmoji] = useState(false);

    // Estados para Audio
    const [recording, setRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const { currentUser } = useAuth();
    const { data } = useChat();

    const handleEmoji = (e) => {
        setText((prev) => prev + e.emoji);
    };

    // --- LÓGICA DE GRABACIÓN DE AUDIO ---
    const startRecording = async () => {
        setRecording(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await sendAudio(audioBlob); // Enviamos automáticamente al soltar
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop()); // Apagamos el micro
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

    const sendAudio = async (audioBlob) => {
        const audioId = uuid();
        const storageRef = ref(storage, `chatAudios/${audioId}`);
        const uploadTask = uploadBytesResumable(storageRef, audioBlob);

        uploadTask.on(
            "state_changed",
            null,
            (error) => console.log(error),
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                // Enviamos el mensaje con tipo 'audio'
                await sendMessageToFirestore(null, null, downloadURL);
            }
        );
    };
    // ------------------------------------

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

    // Función universal para enviar (Texto, Img o Audio)
    const sendMessageToFirestore = async (text, imgURL, audioURL) => {
        await setDoc(doc(db, "chats", data.chatId, "messages", uuid()), {
            id: uuid(),
            text: text || "",
            senderId: currentUser.uid,
            date: Timestamp.now(),
            img: imgURL || null,
            audio: audioURL || null, // Guardamos la URL del audio
        });

        let lastMsgText = "📷 Foto";
        if (text) lastMsgText = text;
        if (audioURL) lastMsgText = "🎤 Nota de voz";

        await updateDoc(doc(db, "userChats", currentUser.uid), {
            [data.chatId + ".lastMessage"]: { text: lastMsgText },
            [data.chatId + ".date"]: serverTimestamp(),
        });

        await updateDoc(doc(db, "userChats", data.user.uid), {
            [data.chatId + ".lastMessage"]: { text: lastMsgText },
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
        <div className="h-20 bg-white/80 backdrop-blur-md p-4 flex items-center justify-between border-t border-gray-100 absolute bottom-0 w-full z-30">

            {openEmoji && (
                <div className="absolute bottom-24 left-4 z-40 shadow-2xl rounded-2xl">
                    <EmojiPicker onEmojiClick={handleEmoji} width={300} height={400} />
                </div>
            )}

            <div className="flex items-center gap-2 w-full bg-gray-100 px-4 py-2 rounded-full shadow-inner border border-white">

                <button
                    onClick={() => setOpenEmoji(!openEmoji)}
                    className={`p-1 rounded-full transition-colors ${openEmoji ? "text-yellow-500 bg-yellow-100" : "text-gray-400 hover:text-yellow-500"}`}
                >
                    <Smile size={22} />
                </button>

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
                    placeholder={recording ? "Grabando audio..." : "Escribe un mensaje..."}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKey}
                    value={text}
                    disabled={recording} // Bloqueamos texto si está grabando
                    onClick={() => setOpenEmoji(false)}
                    className={`w-full bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 font-medium ml-2 ${recording ? "animate-pulse text-red-500" : ""}`}
                />

                {img && (
                    <div className="flex items-center gap-1 bg-indigo-100 px-2 py-1 rounded-md">
                        <span className="text-xs text-indigo-600 font-bold">Img</span>
                        <X size={12} className="text-indigo-600 cursor-pointer" onClick={() => setImg(null)} />
                    </div>
                )}
            </div>

            {/* BOTÓN DINÁMICO: Enviar o Grabar */}
            {text || img ? (
                <button
                    onClick={handleSend}
                    className="ml-3 p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all duration-200 active:scale-95 flex items-center justify-center shadow-lg"
                >
                    <Send size={20} className="translate-x-0.5" />
                </button>
            ) : (
                <button
                    // Si está grabando ejecuta stop, si no, start
                    onClick={recording ? stopRecording : startRecording}
                    className={`ml-3 p-3 rounded-full transition-all duration-200 active:scale-95 flex items-center justify-center shadow-lg ${recording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-indigo-600 hover:bg-indigo-700"}`}
                >
                    {recording ? <Square size={20} className="text-white fill-current" /> : <Mic size={20} className="text-white" />}
                </button>
            )}
        </div>
    );
};

export default Input;