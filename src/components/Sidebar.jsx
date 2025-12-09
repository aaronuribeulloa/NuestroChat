import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { LogOut, Search, MessageSquarePlus, UserPlus } from "lucide-react";
import { db } from "../config/firebase";
import { collection, query, where, getDocs, setDoc, doc, updateDoc, serverTimestamp, getDoc, onSnapshot } from "firebase/firestore";

const Sidebar = () => {
  const { currentUser, logout } = useAuth();
  const { dispatch } = useChat();

  const [username, setUsername] = useState("");
  const [userFound, setUserFound] = useState(null);
  const [err, setErr] = useState(false);
  const [chats, setChats] = useState([]);

  // 1. ESCUCHAR CHATS EN TIEMPO REAL
  useEffect(() => {
    const getChats = () => {
      const unsub = onSnapshot(doc(db, "userChats", currentUser.uid), (doc) => {
        setChats(doc.data());
      });
      return () => { unsub(); };
    };
    currentUser.uid && getChats();
  }, [currentUser.uid]);

  // 2. BUSCAR USUARIO (MEJORADO)
  const handleSearch = async () => {
    setErr(false);
    setUserFound(null);

    // Convertimos lo que escribes a minúsculas
    const queryText = username.toLowerCase();

    // TRUCO DE FIREBASE PARA "EMPIEZA POR...":
    // Buscamos en 'displayNameLower' todo lo que sea >= que el texto
    // Y menor que el texto + un carácter especial (uf8ff).
    // Esto simula un "LIKE 'texto%'" de SQL.
    const q = query(
      collection(db, "users"),
      where("displayNameLower", ">=", queryText),
      where("displayNameLower", "<=", queryText + '\uf8ff')
    );

    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        // Encontramos al primer usuario que coincida
        setUserFound(querySnapshot.docs[0].data());
      } else {
        setErr(true);
      }
    } catch (error) {
      setErr(true);
      console.log(error);
    }
  };

  // 3. SELECCIONAR USUARIO
  const handleSelect = async () => {
    const combinedId = currentUser.uid > userFound.uid
      ? currentUser.uid + userFound.uid
      : userFound.uid + currentUser.uid;

    try {
      const res = await getDoc(doc(db, "chats", combinedId));

      if (!res.exists()) {
        await setDoc(doc(db, "chats", combinedId), { messages: [] });

        await updateDoc(doc(db, "userChats", currentUser.uid), {
          [combinedId + ".userInfo"]: { uid: userFound.uid, displayName: userFound.displayName, photoURL: userFound.photoURL },
          [combinedId + ".date"]: serverTimestamp(),
        });

        await updateDoc(doc(db, "userChats", userFound.uid), {
          [combinedId + ".userInfo"]: { uid: currentUser.uid, displayName: currentUser.displayName, photoURL: currentUser.photoURL },
          [combinedId + ".date"]: serverTimestamp(),
        });
      }
    } catch (err) {
      await setDoc(doc(db, "userChats", currentUser.uid), {});
      await setDoc(doc(db, "userChats", userFound.uid), {});
      handleSelect();
      return;
    }

    dispatch({ type: "CHANGE_USER", payload: userFound });
    setUserFound(null);
    setUsername("");
  };

  const handleSelectChat = (u) => {
    dispatch({ type: "CHANGE_USER", payload: u });
  };

  const formatTime = (seconds) => {
    if (!seconds) return "";
    const date = new Date(seconds * 1000);
    if (date.toDateString() === new Date().toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  return (
    <div className="w-full md:w-[400px] h-full bg-white border-r border-gray-100 flex flex-col shadow-xl z-20 relative">
      {/* --- HEADER --- */}
      <div className="px-6 py-5 border-b border-gray-50 bg-white z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer">
              <img src={currentUser?.photoURL} alt="Profile" className="w-11 h-11 rounded-full object-cover border-2 border-gray-100 transition-all" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <h2 className="font-bold text-gray-800 text-lg tracking-tight">{currentUser?.displayName?.split(' ')[0]}</h2>
          </div>
          <button onClick={logout} className="p-2 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all duration-200">
            <LogOut size={18} />
          </button>
        </div>

        {/* --- BUSCADOR --- */}
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative group">
          <input
            type="text"
            placeholder="Buscar usuario..."
            className="w-full bg-gray-100 text-gray-700 py-2.5 pl-10 pr-4 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all duration-200 text-sm font-medium placeholder-gray-400"
            onChange={(e) => setUsername(e.target.value)}
            value={username}
          />
          <button type="submit" className="absolute left-3.5 top-2.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors bg-transparent border-none p-0 flex items-center justify-center">
            <Search size={18} />
          </button>
        </form>
        {err && <span className="text-red-500 text-xs ml-2 mt-2 block">Usuario no encontrado</span>}
      </div>

      {/* --- LISTA --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {userFound && (
          <div className="mx-4 mt-4 flex items-center gap-3 p-3 bg-indigo-50 rounded-xl cursor-pointer border border-indigo-100" onClick={handleSelect}>
            <img src={userFound.photoURL} className="w-12 h-12 rounded-full object-cover" />
            <div className="flex-1">
              <span className="font-bold text-indigo-900 text-sm block">{userFound.displayName}</span>
              <p className="text-xs text-indigo-600 font-medium">¡Clic para añadir!</p>
            </div>
            <UserPlus size={18} className="text-indigo-600" />
          </div>
        )}

        <div className="flex flex-col">
          {chats && Object.entries(chats)?.sort((a, b) => b[1].date - a[1].date).map((chat) => {
            if (!chat[1].userInfo) return null;
            return (
              <div
                key={chat[0]}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200 border-b border-gray-50 relative group"
                onClick={() => handleSelectChat(chat[1].userInfo)}
              >
                <div className="relative flex-shrink-0">
                  <img src={chat[1].userInfo.photoURL} className="w-12 h-12 rounded-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-gray-900 text-[15px] truncate">
                      {chat[1].userInfo.displayName}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium flex-shrink-0">
                      {formatTime(chat[1].date?.seconds)}
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-500 truncate group-hover:text-gray-700 transition-colors">
                    {chat[1].lastMessage?.text}
                  </p>
                </div>
              </div>
            );
          })}
          {(!chats || Object.keys(chats).length === 0) && !userFound && (
            <div className="flex flex-col items-center justify-center mt-20 text-center px-6 opacity-60">
              <MessageSquarePlus size={48} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Aún no tienes chats.</p>
              <p className="text-xs text-gray-400">Busca a un amigo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;