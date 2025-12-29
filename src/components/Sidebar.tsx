import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useTheme } from "../context/ThemeContext";
import { LogOut, Search, UserPlus, Users, X, Moon, Sun, Settings, Globe } from "lucide-react"; // <--- Agregamos Globe
import { db } from "../config/firebase";
import { collection, query, where, getDocs, setDoc, doc, updateDoc, serverTimestamp, getDoc, onSnapshot, DocumentData } from "firebase/firestore";
import { v4 as uuid } from "uuid";
import EditProfileModal from "./EditProfileModal";

interface IChatUserInfo { uid: string; displayName: string; photoURL: string; }
interface IChatData { userInfo: IChatUserInfo; lastMessage?: { text: string }; date?: any; }

const Sidebar = () => {
  const { currentUser, logout } = useAuth();
  const { dispatch } = useChat();
  const { theme, toggleTheme } = useTheme();

  const [username, setUsername] = useState<string>("");
  const [userFound, setUserFound] = useState<DocumentData | null>(null);
  const [err, setErr] = useState<boolean>(false);
  const [chats, setChats] = useState<DocumentData>({});

  // Estados de Modales
  const [showGroupModal, setShowGroupModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Estados para creación de grupo
  const [groupName, setGroupName] = useState<string>("");
  const [groupSearchName, setGroupSearchName] = useState<string>("");
  const [groupUserFound, setGroupUserFound] = useState<DocumentData | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<DocumentData[]>([]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(doc(db, "userChats", currentUser.uid), (doc) => {
      setChats(doc.data() as DocumentData);
    });
    return () => { unsub(); };
  }, [currentUser?.uid]);

  const handleSearch = async () => {
    setErr(false); setUserFound(null);
    const queryText = username.toLowerCase();
    const q = query(collection(db, "users"), where("displayNameLower", ">=", queryText), where("displayNameLower", "<=", queryText + '\uf8ff'));
    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) setUserFound(querySnapshot.docs[0].data());
      else setErr(true);
    } catch (error) { setErr(true); }
  };

  const handleSelect = async () => {
    if (!currentUser || !userFound) return;
    const combinedId = currentUser.uid > userFound.uid ? currentUser.uid + userFound.uid : userFound.uid + currentUser.uid;
    try {
      const res = await getDoc(doc(db, "chats", combinedId));
      if (!res.exists()) await setDoc(doc(db, "chats", combinedId), { messages: [] });
      await setDoc(doc(db, "userChats", currentUser.uid), { [combinedId]: { userInfo: { uid: userFound.uid, displayName: userFound.displayName, photoURL: userFound.photoURL }, date: serverTimestamp() } }, { merge: true });
      await setDoc(doc(db, "userChats", userFound.uid), { [combinedId]: { userInfo: { uid: currentUser.uid, displayName: currentUser.displayName, photoURL: currentUser.photoURL }, date: serverTimestamp() } }, { merge: true });
    } catch (err) { }
    dispatch({ type: "CHANGE_USER", payload: userFound });
    setUserFound(null); setUsername("");
  };

  // --- Lógica de Grupos ---
  const handleGroupSearch = async () => {
    setGroupUserFound(null);
    const q = query(collection(db, "users"), where("displayNameLower", ">=", groupSearchName.toLowerCase()), where("displayNameLower", "<=", groupSearchName.toLowerCase() + '\uf8ff'));
    try { const s = await getDocs(q); if (!s.empty) setGroupUserFound(s.docs[0].data()); } catch (e) { }
  };

  const addUserToGroup = () => {
    if (groupUserFound && !selectedUsers.some(u => u.uid === groupUserFound.uid) && groupUserFound.uid !== currentUser?.uid) {
      setSelectedUsers([...selectedUsers, groupUserFound]);
    }
    setGroupUserFound(null);
    setGroupSearchName("");
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !currentUser) return;
    const gid = uuid();
    await setDoc(doc(db, "chats", gid), { messages: [] });
    const gData = { userInfo: { uid: gid, displayName: groupName, photoURL: "https://cdn-icons-png.flaticon.com/512/166/166258.png", isGroup: true, adminId: currentUser.uid }, date: serverTimestamp() };
    const parts = [currentUser, ...selectedUsers];
    await Promise.all(parts.map(async u => { if (u.uid) await updateDoc(doc(db, "userChats", u.uid), { [gid]: gData }); }));
    setShowGroupModal(false); setGroupName(""); setSelectedUsers([]);
  };

  // --- Lógica de Feed ---
  const handleOpenFeed = () => {
    dispatch({
      type: "CHANGE_USER",
      payload: { uid: "feed", displayName: "Comunidad", photoURL: "" }
    });
  };

  const handleSelectChat = (u: IChatUserInfo) => { dispatch({ type: "CHANGE_USER", payload: u }); };
  const formatTime = (seconds: number) => { if (!seconds) return ""; const d = new Date(seconds * 1000); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };

  return (
    <div className="w-full md:w-[400px] h-full bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 flex flex-col shadow-xl z-20 relative transition-colors duration-300">

      {/* HEADER */}
      <div className="px-6 py-5 border-b border-gray-50 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
        <div className="flex items-center justify-between mb-6">

          {/* PERFIL DE USUARIO */}
          <div
            className="flex items-center gap-3 cursor-pointer group select-none"
            onClick={() => setShowProfileModal(true)}
            title="Editar mi perfil"
          >
            <div className="relative">
              <img src={currentUser?.photoURL || ""} className="w-11 h-11 rounded-full object-cover border-2 border-gray-100 dark:border-slate-700 group-hover:border-indigo-500 transition-colors" />
              <div className="absolute -bottom-1 -right-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-full border border-white dark:border-slate-900 shadow-sm">
                <Settings size={10} className="text-gray-500 dark:text-gray-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="font-bold text-gray-800 dark:text-white text-lg tracking-tight leading-none">
                {currentUser?.displayName?.split(' ')[0]}
              </h2>
              <span className="text-[10px] text-indigo-500 font-medium group-hover:underline mt-0.5">
                Editar perfil
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {/* BOTÓN COMUNIDAD / FEED */}
            <button onClick={handleOpenFeed} className="p-2 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-full transition-all" title="Muro Social">
              <Globe size={18} />
            </button>

            <button onClick={toggleTheme} className="p-2 bg-gray-100 dark:bg-slate-800 text-indigo-500 dark:text-yellow-400 rounded-full transition-all">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button onClick={() => setShowGroupModal(true)} className="p-2 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full transition-all" title="Crear grupo">
              <Users size={18} />
            </button>
            <button onClick={() => logout()} className="p-2 bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-red-500 rounded-full transition-all" title="Cerrar sesión">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* BUSCADOR */}
        <form onSubmit={(e) => { e.preventDefault(); handleSearch() }} className="relative group">
          <input
            type="text" placeholder="Buscar usuario..."
            className="w-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 py-2.5 pl-10 pr-4 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm font-medium placeholder-gray-400"
            onChange={(e) => setUsername(e.target.value)} value={username}
          />
          <button type="submit" className="absolute left-3.5 top-2.5 text-gray-400 group-focus-within:text-indigo-500 bg-transparent border-none p-0 flex items-center justify-center">
            <Search size={18} />
          </button>
        </form>
        {err && <span className="text-red-500 text-xs ml-2 mt-2 block">Usuario no encontrado</span>}
      </div>

      {/* LISTA DE CHATS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
        {userFound && (
          <div className="mx-4 mt-4 flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl cursor-pointer border border-indigo-100 dark:border-indigo-800" onClick={handleSelect}>
            <img src={userFound.photoURL} className="w-12 h-12 rounded-full object-cover" />
            <div className="flex-1">
              <span className="font-bold text-indigo-900 dark:text-indigo-100 text-sm block">{userFound.displayName}</span>
              <p className="text-xs text-indigo-600 dark:text-indigo-300 font-medium">¡Clic para añadir!</p>
            </div>
            <UserPlus size={18} className="text-indigo-600 dark:text-indigo-300" />
          </div>
        )}

        <div className="flex flex-col">
          {chats && Object.entries(chats)?.sort((a, b) => b[1].date - a[1].date).map((chat) => {
            const chatData = chat[1] as IChatData;
            if (!chatData.userInfo) return null;
            const isGroup = (chatData.userInfo as any).isGroup;

            return (
              <div key={chat[0]} onClick={() => handleSelectChat(chatData.userInfo)}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors duration-200 border-b border-gray-50 dark:border-slate-800/50 relative group"
              >
                <div className="relative flex-shrink-0">
                  <img src={chatData.userInfo.photoURL} className="w-12 h-12 rounded-full object-cover" />
                  {isGroup && (<div className="absolute -bottom-1 -right-1 bg-indigo-500 rounded-full p-0.5 border-2 border-white dark:border-slate-900"><Users size={10} className="text-white" /></div>)}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-[15px] truncate">{chatData.userInfo.displayName}</span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium flex-shrink-0">{formatTime(chatData.date?.seconds)}</span>
                  </div>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                    {chatData.lastMessage?.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE GRUPO */}
      {showGroupModal && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Nuevo Grupo</h3>
              <button onClick={() => setShowGroupModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
            </div>
            <input type="text" placeholder="Nombre del grupo" className="w-full bg-gray-100 dark:bg-slate-700 dark:text-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 mb-4" value={groupName} onChange={(e) => setGroupName(e.target.value)} />

            {/* Buscador de grupo */}
            <div className="mb-2 flex gap-2">
              <input type="text" placeholder="Buscar amigos..." className="flex-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 p-2 rounded-lg text-sm dark:text-white" value={groupSearchName} onChange={e => setGroupSearchName(e.target.value)} />
              <button onClick={handleGroupSearch} className="bg-gray-200 dark:bg-slate-600 p-2 rounded"><Search size={16} className="dark:text-white" /></button>
            </div>
            {groupUserFound && (
              <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded flex justify-between items-center mb-2">
                <span className="text-sm dark:text-white">{groupUserFound.displayName}</span>
                <button onClick={addUserToGroup}><UserPlus size={16} className="text-indigo-600 dark:text-indigo-400" /></button>
              </div>
            )}
            {/* Lista seleccionados */}
            <div className="flex flex-wrap gap-1 mb-4">
              {selectedUsers.map(u => (
                <span key={u.uid} className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 px-2 py-1 rounded-full">{u.displayName}</span>
              ))}
            </div>

            <button onClick={handleCreateGroup} disabled={selectedUsers.length === 0 || !groupName} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50">Crear</button>
          </div>
        </div>
      )}

      {/* MODAL DE PERFIL */}
      {showProfileModal && (
        <EditProfileModal onClose={() => setShowProfileModal(false)} />
      )}

    </div>
  );
};

export default Sidebar;