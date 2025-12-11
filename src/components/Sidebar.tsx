import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { LogOut, Search, MessageSquarePlus, UserPlus, Users, X, Check, UserMinus } from "lucide-react";
import { db } from "../config/firebase";
import { collection, query, where, getDocs, setDoc, doc, updateDoc, serverTimestamp, getDoc, onSnapshot, DocumentData } from "firebase/firestore";
import { v4 as uuid } from "uuid";

// TIPOS
interface IChatUserInfo {
  uid: string;
  displayName: string;
  photoURL: string;
}

interface IChatData {
  userInfo: IChatUserInfo;
  lastMessage?: { text: string };
  date?: any;
}

const Sidebar = () => {
  const { currentUser, logout } = useAuth();
  const { dispatch } = useChat();

  const [username, setUsername] = useState<string>("");
  const [userFound, setUserFound] = useState<DocumentData | null>(null);
  const [err, setErr] = useState<boolean>(false);
  const [chats, setChats] = useState<DocumentData>({});

  // --- ESTADOS PARA GRUPOS ---
  const [showGroupModal, setShowGroupModal] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>("");
  const [groupSearchName, setGroupSearchName] = useState<string>(""); // Buscador dentro del modal
  const [groupUserFound, setGroupUserFound] = useState<DocumentData | null>(null); // Usuario encontrado en modal
  const [selectedUsers, setSelectedUsers] = useState<DocumentData[]>([]); // Lista de invitados

  // 1. ESCUCHAR CHATS EN TIEMPO REAL
  useEffect(() => {
    if (!currentUser?.uid) return;
    const getChats = () => {
      const unsub = onSnapshot(doc(db, "userChats", currentUser.uid), (doc) => {
        setChats(doc.data() as DocumentData);
      });
      return () => { unsub(); };
    };
    currentUser.uid && getChats();
  }, [currentUser?.uid]);

  // --- BÚSQUEDA GENERAL (Para chats 1vs1) ---
  const handleSearch = async () => {
    setErr(false);
    setUserFound(null);
    const queryText = username.toLowerCase();
    const q = query(
      collection(db, "users"),
      where("displayNameLower", ">=", queryText),
      where("displayNameLower", "<=", queryText + '\uf8ff')
    );
    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setUserFound(querySnapshot.docs[0].data());
      } else {
        setErr(true);
      }
    } catch (error) { setErr(true); }
  };

  const handleSelect = async () => {
    if (!currentUser || !userFound) return;
    const combinedId = currentUser.uid > userFound.uid
      ? currentUser.uid + userFound.uid
      : userFound.uid + currentUser.uid;

    try {
      const res = await getDoc(doc(db, "chats", combinedId));
      if (!res.exists()) {
        await setDoc(doc(db, "chats", combinedId), { messages: [] });
      }
      await setDoc(doc(db, "userChats", currentUser.uid), {
        [combinedId]: {
          userInfo: { uid: userFound.uid, displayName: userFound.displayName, photoURL: userFound.photoURL },
          date: serverTimestamp()
        }
      }, { merge: true });
      await setDoc(doc(db, "userChats", userFound.uid), {
        [combinedId]: {
          userInfo: { uid: currentUser.uid, displayName: currentUser.displayName, photoURL: currentUser.photoURL },
          date: serverTimestamp()
        }
      }, { merge: true });
    } catch (err) { }
    dispatch({ type: "CHANGE_USER", payload: userFound });
    setUserFound(null);
    setUsername("");
  };

  // --- LÓGICA DE GRUPOS ---

  // A. Buscar usuario para agregar al grupo
  const handleGroupSearch = async () => {
    setGroupUserFound(null);
    const queryText = groupSearchName.toLowerCase();
    const q = query(
      collection(db, "users"),
      where("displayNameLower", ">=", queryText),
      where("displayNameLower", "<=", queryText + '\uf8ff')
    );
    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setGroupUserFound(querySnapshot.docs[0].data());
      }
    } catch (err) { console.log(err); }
  };

  // B. Agregar usuario a la lista temporal (evitando duplicados)
  const addUserToGroup = () => {
    if (groupUserFound) {
      const alreadyAdded = selectedUsers.some(u => u.uid === groupUserFound.uid);
      const isMe = groupUserFound.uid === currentUser?.uid;

      if (!alreadyAdded && !isMe) {
        setSelectedUsers([...selectedUsers, groupUserFound]);
      }
      setGroupUserFound(null);
      setGroupSearchName("");
    }
  };

  // C. Crear el grupo y distribuirlo a todos
  const handleCreateGroup = async () => {
    if (!groupName.trim() || !currentUser) return;

    const groupId = uuid();

    try {
      // 1. Crear documento de chat
      await setDoc(doc(db, "chats", groupId), { messages: [] });

      // 2. Definir la info del grupo
      // Nota: En una app real, podrías subir una foto de grupo a Storage.
      // Aquí usamos una imagen generada con las iniciales o un icono default.
      const groupData = {
        userInfo: {
          uid: groupId,
          displayName: groupName,
          photoURL: "https://cdn-icons-png.flaticon.com/512/166/166258.png", // Icono de grupo
          isGroup: true,
          adminId: currentUser.uid // Guardamos quién es el admin
        },
        date: serverTimestamp()
      };

      // 3. Lista de TODOS los participantes (Yo + Seleccionados)
      const allParticipants = [currentUser, ...selectedUsers];

      // 4. Bucle mágico: Agregamos el chat a la lista de CADA participante
      // Usamos Promise.all para que sea rápido y paralelo
      await Promise.all(allParticipants.map(async (user) => {
        if (user.uid) { // Aseguramos que tenga UID
          await updateDoc(doc(db, "userChats", user.uid), {
            [groupId]: groupData
          });
        }
      }));

      // 5. Limpieza y cierre
      setShowGroupModal(false);
      setGroupName("");
      setSelectedUsers([]);

    } catch (err) {
      console.error("Error creando grupo:", err);
    }
  };

  const handleSelectChat = (u: IChatUserInfo) => {
    dispatch({ type: "CHANGE_USER", payload: u });
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "";
    const date = new Date(seconds * 1000);
    if (date.toDateString() === new Date().toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  return (
    <div className="w-full md:w-[400px] h-full bg-white border-r border-gray-100 flex flex-col shadow-xl z-20 relative">

      {/* HEADER */}
      <div className="px-6 py-5 border-b border-gray-50 bg-white z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src={currentUser?.photoURL || ""} alt="Profile" className="w-11 h-11 rounded-full object-cover border-2 border-gray-100" />
            <h2 className="font-bold text-gray-800 text-lg tracking-tight">{currentUser?.displayName?.split(' ')[0]}</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowGroupModal(true)} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-full transition-all" title="Crear Grupo">
              <Users size={18} />
            </button>
            <button onClick={() => logout()} className="p-2 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* BUSCADOR GENERAL */}
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative group">
          <input
            type="text"
            placeholder="Buscar usuario..."
            className="w-full bg-gray-100 text-gray-700 py-2.5 pl-10 pr-4 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all text-sm font-medium"
            onChange={(e) => setUsername(e.target.value)}
            value={username}
          />
          <button type="submit" className="absolute left-3.5 top-2.5 text-gray-400 group-focus-within:text-indigo-500 bg-transparent border-none p-0 flex items-center justify-center">
            <Search size={18} />
          </button>
        </form>
        {err && <span className="text-red-500 text-xs ml-2 mt-2 block">Usuario no encontrado</span>}
      </div>

      {/* LISTA DE CHATS */}
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
            const chatData = chat[1] as IChatData;
            if (!chatData.userInfo) return null;

            // Convertimos 'isGroup' a booleano explícito para que TS no se queje
            const isGroup = (chatData.userInfo as any).isGroup;

            return (
              <div
                key={chat[0]}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200 border-b border-gray-50 relative group"
                onClick={() => handleSelectChat(chatData.userInfo)}
              >
                <div className="relative flex-shrink-0">
                  <img src={chatData.userInfo.photoURL} className="w-12 h-12 rounded-full object-cover" />
                  {isGroup && (
                    <div className="absolute -bottom-1 -right-1 bg-indigo-500 rounded-full p-0.5 border-2 border-white">
                      <Users size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-gray-900 text-[15px] truncate">
                      {chatData.userInfo.displayName}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium flex-shrink-0">
                      {formatTime(chatData.date?.seconds)}
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-500 truncate group-hover:text-gray-700">
                    {chatData.lastMessage?.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODAL PARA CREAR GRUPO --- */}
      {showGroupModal && (
        <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Nuevo Grupo</h3>
              <button onClick={() => setShowGroupModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* 1. Nombre del Grupo */}
            <input
              type="text"
              placeholder="Nombre del grupo"
              className="w-full bg-gray-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />

            {/* 2. Buscador de Participantes */}
            <div className="mb-2 relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Buscar participantes..."
                  className="flex-1 bg-gray-50 border border-gray-200 p-2 rounded-lg text-sm outline-none focus:border-indigo-500"
                  value={groupSearchName}
                  onChange={(e) => setGroupSearchName(e.target.value)}
                  onKeyDown={(e) => e.code === "Enter" && handleGroupSearch()}
                />
                <button onClick={handleGroupSearch} className="bg-gray-200 p-2 rounded-lg text-gray-600 hover:bg-gray-300">
                  <Search size={16} />
                </button>
              </div>
              {/* Resultado de búsqueda rápida */}
              {groupUserFound && (
                <div className="absolute top-full mt-1 w-full bg-white shadow-lg rounded-lg border border-gray-100 p-2 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <img src={groupUserFound.photoURL} className="w-8 h-8 rounded-full" />
                    <span className="text-sm font-medium">{groupUserFound.displayName}</span>
                  </div>
                  <button onClick={addUserToGroup} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded">
                    <UserPlus size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* 3. Lista de Seleccionados (Chips) */}
            <div className="flex-1 overflow-y-auto mb-4 min-h-[100px] border border-dashed border-gray-200 rounded-xl p-2 bg-gray-50/50">
              {selectedUsers.length === 0 ? (
                <p className="text-xs text-center text-gray-400 mt-8">Añade amigos para crear el grupo</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(u => (
                    <div key={u.uid} className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-medium">
                      <img src={u.photoURL} className="w-4 h-4 rounded-full" />
                      <span>{u.displayName?.split(' ')[0]}</span>
                      <button onClick={() => setSelectedUsers(selectedUsers.filter(user => user.uid !== u.uid))} className="hover:text-red-500 ml-1">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Botón Crear */}
            <button
              onClick={handleCreateGroup}
              disabled={selectedUsers.length === 0 || !groupName}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={18} />
              Crear Grupo ({selectedUsers.length + 1})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;