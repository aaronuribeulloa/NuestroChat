import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { db } from "../config/firebase";
import { collection, getDocs, limit, query, setDoc, doc, serverTimestamp, getDoc, updateDoc, where } from "firebase/firestore";
import { MessageCircle, MapPin, Briefcase, Heart, UserPlus } from "lucide-react";

interface IUserProfile {
    uid: string;
    displayName: string;
    photoURL: string;
    bio?: string;
    location?: string;
    work?: string;
    interests?: string[]; // Array de gustos
}

const DiscoverUsers = () => {
    const { currentUser } = useAuth();
    const { dispatch } = useChat();
    const [suggestions, setSuggestions] = useState<IUserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    // Estado local de mis propios datos para comparar
    const [myInterests, setMyInterests] = useState<string[]>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            if (!currentUser) return;

            try {
                // 1. Obtener MIS datos primero para saber mis gustos
                const myProfileSnap = await getDoc(doc(db, "users", currentUser.uid));
                const myData = myProfileSnap.data();
                const myTags = myData?.interests || [];
                setMyInterests(myTags);

                // 2. Obtener usuarios (Traemos 20 para filtrar)
                // Nota: En una app real con miles de usuarios, usaríamos Algolia o queries más complejas.
                const usersRef = collection(db, "users");
                const q = query(usersRef, limit(20));
                const querySnapshot = await getDocs(q);

                const users: IUserProfile[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data() as IUserProfile;
                    // No mostrarme a mí mismo
                    if (data.uid !== currentUser.uid) {
                        users.push(data);
                    }
                });

                // 3. EL ALGORITMO DE RECOMENDACIÓN 🧠
                // Ordenamos: Primero los que tengan más intereses en común conmigo
                const sortedUsers = users.sort((a, b) => {
                    const matchesA = a.interests?.filter(tag => myTags.includes(tag)).length || 0;
                    const matchesB = b.interests?.filter(tag => myTags.includes(tag)).length || 0;
                    return matchesB - matchesA; // De mayor a menor coincidencia
                });

                setSuggestions(sortedUsers);
            } catch (err) {
                console.error("Error cargando sugerencias:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [currentUser]);

    // Función para iniciar chat (Misma lógica que el Sidebar)
    const handleStartChat = async (userFound: IUserProfile) => {
        if (!currentUser) return;
        const combinedId = currentUser.uid > userFound.uid
            ? currentUser.uid + userFound.uid
            : userFound.uid + currentUser.uid;

        try {
            const res = await getDoc(doc(db, "chats", combinedId));
            if (!res.exists()) {
                await setDoc(doc(db, "chats", combinedId), { messages: [] });
            }

            // Actualizar chats de ambos
            const userInfoMe = { uid: currentUser.uid, displayName: currentUser.displayName, photoURL: currentUser.photoURL };
            const userInfoOther = { uid: userFound.uid, displayName: userFound.displayName, photoURL: userFound.photoURL };

            await setDoc(doc(db, "userChats", currentUser.uid), {
                [combinedId]: { userInfo: userInfoOther, date: serverTimestamp() }
            }, { merge: true });

            await setDoc(doc(db, "userChats", userFound.uid), {
                [combinedId]: { userInfo: userInfoMe, date: serverTimestamp() }
            }, { merge: true });

            // Abrir el chat inmediatamente
            dispatch({ type: "CHANGE_USER", payload: userInfoOther });

        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-400">Buscando gente cool...</div>;

    return (
        <div className="flex-1 h-full overflow-y-auto p-8 bg-gray-50 dark:bg-slate-950">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Descubrir</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {suggestions.length > 0
                            ? "Gente con tus mismos intereses cerca de ti."
                            : "Aún no hay muchos usuarios, ¡invita a tus amigos!"}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suggestions.map((user) => {
                        // Calcular coincidencias para mostrar
                        const commonInterests = user.interests?.filter(i => myInterests.includes(i)) || [];

                        return (
                            <div key={user.uid} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-slate-800 flex flex-col items-center text-center relative group">
                                <img
                                    src={user.photoURL}
                                    className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-gray-50 dark:border-slate-800"
                                />
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">{user.displayName}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 h-10">
                                    {user.bio || "Sin biografía..."}
                                </p>

                                {/* Datos extra */}
                                <div className="w-full space-y-2 mb-6 text-xs text-gray-500 dark:text-gray-400">
                                    {user.location && (
                                        <div className="flex items-center justify-center gap-1">
                                            <MapPin size={12} /> {user.location}
                                        </div>
                                    )}
                                    {user.work && (
                                        <div className="flex items-center justify-center gap-1">
                                            <Briefcase size={12} /> {user.work}
                                        </div>
                                    )}
                                </div>

                                {/* Tags coincidentes */}
                                <div className="flex flex-wrap gap-1 justify-center mb-6 h-12 overflow-hidden">
                                    {user.interests?.slice(0, 3).map(tag => (
                                        <span key={tag} className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${commonInterests.includes(tag)
                                                ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 border-indigo-200"
                                                : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-transparent"
                                            }`}>
                                            {tag}
                                        </span>
                                    ))}
                                    {(user.interests?.length || 0) > 3 && <span className="text-[10px] text-gray-400">+{(user.interests?.length || 0) - 3} más</span>}
                                </div>

                                <button
                                    onClick={() => handleStartChat(user)}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <MessageCircle size={18} />
                                    Saludar
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default DiscoverUsers;