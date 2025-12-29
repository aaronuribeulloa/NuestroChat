import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db, storage } from "../config/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Send, Heart, MessageSquare, Trash2, Image, X, Loader2, CornerDownRight } from "lucide-react"; // Iconos nuevos
import { v4 as uuid } from "uuid";

// Interfaz para Comentarios
interface IComment {
    id: string;
    uid: string;
    displayName: string;
    photoURL: string;
    text: string;
    createdAt: any;
}

interface IPost {
    id: string;
    uid: string;
    displayName: string;
    photoURL: string;
    text: string;
    img?: string;
    createdAt: any;
    likes?: string[];
    commentsCount?: number; // Opcional: para mostrar contador visualmente
}

const SocialFeed = () => {
    const { currentUser } = useAuth();
    const [posts, setPosts] = useState<IPost[]>([]);

    // Estados del formulario Post
    const [newPost, setNewPost] = useState("");
    const [img, setImg] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    // ESTADOS PARA COMENTARIOS
    const [activePostId, setActivePostId] = useState<string | null>(null); // Cuál post tiene los comentarios abiertos
    const [comments, setComments] = useState<IComment[]>([]); // Lista de comentarios del post activo
    const [newComment, setNewComment] = useState(""); // Texto del nuevo comentario

    // 1. ESCUCHAR POSTS
    useEffect(() => {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as IPost));
            setPosts(postsData);
        });
        return () => unsub();
    }, []);

    // 2. ESCUCHAR COMENTARIOS (Cuando se abre un post)
    useEffect(() => {
        if (!activePostId) {
            setComments([]);
            return;
        }

        // Subcolección: posts -> [ID] -> comments
        const q = query(
            collection(db, "posts", activePostId, "comments"),
            orderBy("createdAt", "asc") // Los más viejos arriba (orden cronológico)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const commentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as IComment));
            setComments(commentsData);
        });

        return () => unsub();
    }, [activePostId]);

    // --- FUNCIONES DE POST ---
    const handlePost = async () => {
        if ((!newPost.trim() && !img) || !currentUser) return;
        setLoading(true);
        try {
            let downloadURL = null;
            if (img) {
                const storageRef = ref(storage, `posts/${uuid()}`);
                const uploadTask = uploadBytesResumable(storageRef, img);
                await new Promise<void>((resolve, reject) => {
                    uploadTask.on("state_changed", null, (error) => reject(error), async () => {
                        downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve();
                    });
                });
            }
            await addDoc(collection(db, "posts"), {
                uid: currentUser.uid,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                text: newPost,
                img: downloadURL,
                createdAt: serverTimestamp(),
                likes: []
            });
            setNewPost("");
            setImg(null);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleLike = async (post: IPost) => {
        if (!currentUser) return;
        const postRef = doc(db, "posts", post.id);
        const isLiked = post.likes?.includes(currentUser.uid);
        if (isLiked) await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
        else await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
    };

    const handleDelete = async (postId: string) => {
        if (window.confirm("¿Borrar publicación?")) await deleteDoc(doc(db, "posts", postId));
    }

    // --- FUNCIONES DE COMENTARIOS ---
    const toggleComments = (postId: string) => {
        if (activePostId === postId) setActivePostId(null); // Cerrar si ya está abierto
        else {
            setActivePostId(postId); // Abrir el nuevo
            setNewComment(""); // Limpiar input
        }
    };

    const handleSendComment = async () => {
        if (!newComment.trim() || !currentUser || !activePostId) return;

        try {
            // Guardar en subcolección
            await addDoc(collection(db, "posts", activePostId, "comments"), {
                uid: currentUser.uid,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                text: newComment,
                createdAt: serverTimestamp()
            });
            setNewComment("");
        } catch (error) {
            console.error("Error al comentar:", error);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "...";
        const date = timestamp.toDate();
        return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div className="flex-1 h-full overflow-y-auto bg-gray-50 dark:bg-slate-950 p-4 md:p-8 custom-scrollbar">
            <div className="max-w-xl mx-auto pb-20">

                {/* CABECERA */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Comunidad</h1>
                    <p className="text-gray-500 dark:text-gray-400">Comparte tus momentos con todos.</p>
                </div>

                {/* COMPOSER */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 mb-8">
                    <div className="flex gap-4">
                        <img src={currentUser?.photoURL || ""} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-slate-700" />
                        <div className="flex-1">
                            <textarea
                                value={newPost}
                                onChange={(e) => setNewPost(e.target.value)}
                                placeholder={`¿Qué estás pensando, ${currentUser?.displayName?.split(" ")[0]}?`}
                                className="w-full bg-transparent resize-none outline-none text-gray-700 dark:text-white placeholder-gray-400 min-h-[60px] text-base"
                            />
                            {img && (
                                <div className="relative mt-2 mb-2 inline-block">
                                    <img src={URL.createObjectURL(img)} alt="preview" className="h-32 w-auto rounded-lg border border-gray-200 dark:border-slate-700 object-cover" />
                                    <button onClick={() => setImg(null)} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow-md hover:bg-red-500 transition-colors"><X size={12} /></button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50 dark:border-slate-800">
                        <div>
                            <input type="file" id="post-img" style={{ display: 'none' }} accept="image/*" onChange={(e) => e.target.files && setImg(e.target.files[0])} />
                            <label htmlFor="post-img" className="flex items-center gap-2 text-indigo-500 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 py-1.5 rounded-full transition-colors font-medium text-sm">
                                <Image size={18} /> Foto
                            </label>
                        </div>
                        <button onClick={handlePost} disabled={(!newPost.trim() && !img) || loading} className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {loading ? "Publicando..." : "Publicar"}
                        </button>
                    </div>
                </div>

                {/* LISTA DE POSTS */}
                <div className="space-y-6">
                    {posts.map(post => {
                        const isLiked = post.likes?.includes(currentUser?.uid || "");
                        const isOwner = post.uid === currentUser?.uid;
                        const isCommentsOpen = activePostId === post.id;

                        return (
                            <div key={post.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">

                                {/* HEADER POST */}
                                <div className="p-4 flex justify-between items-center">
                                    <div className="flex gap-3 items-center">
                                        <img src={post.photoURL} className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100 dark:ring-slate-800" />
                                        <div>
                                            <h3 className="font-bold text-gray-800 dark:text-white text-sm">{post.displayName}</h3>
                                            <span className="text-xs text-gray-400 block">{formatDate(post.createdAt)}</span>
                                        </div>
                                    </div>
                                    {isOwner && (
                                        <button onClick={() => handleDelete(post.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"><Trash2 size={16} /></button>
                                    )}
                                </div>

                                {/* CONTENIDO */}
                                {post.text && <div className="px-4 pb-3"><p className="text-gray-800 dark:text-gray-200 text-[15px] leading-relaxed whitespace-pre-wrap">{post.text}</p></div>}
                                {post.img && <div className="w-full bg-gray-100 dark:bg-slate-950 flex justify-center"><img src={post.img} alt="Post" className="w-full h-auto max-h-[500px] object-contain" loading="lazy" /></div>}

                                {/* ACCIONES */}
                                <div className="p-4 flex items-center gap-6 border-b border-gray-50 dark:border-slate-800">
                                    <button onClick={() => handleLike(post)} className={`flex items-center gap-2 text-sm font-bold transition-all ${isLiked ? "text-red-500 scale-105" : "text-gray-500 dark:text-gray-400 hover:text-red-500"}`}>
                                        <Heart size={22} className={isLiked ? "fill-current" : ""} /> {post.likes?.length || 0}
                                    </button>

                                    <button
                                        onClick={() => toggleComments(post.id)}
                                        className={`flex items-center gap-2 text-sm font-bold transition-colors ${isCommentsOpen ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400 hover:text-indigo-500"}`}
                                    >
                                        <MessageSquare size={22} /> Comentarios
                                    </button>
                                </div>

                                {/* SECCIÓN DE COMENTARIOS (Solo si está abierto) */}
                                {isCommentsOpen && (
                                    <div className="bg-gray-50 dark:bg-slate-950/50 p-4">
                                        {/* Lista de comentarios */}
                                        <div className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                                            {comments.length === 0 ? (
                                                <p className="text-center text-gray-400 text-sm italic py-2">Sé el primero en comentar...</p>
                                            ) : (
                                                comments.map(comment => (
                                                    <div key={comment.id} className="flex gap-3 items-start">
                                                        <img src={comment.photoURL} className="w-7 h-7 rounded-full object-cover mt-1" />
                                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm flex-1">
                                                            <div className="flex justify-between items-baseline mb-1">
                                                                <span className="font-bold text-gray-800 dark:text-white text-xs">{comment.displayName}</span>
                                                                <span className="text-[10px] text-gray-400">{formatDate(comment.createdAt)}</span>
                                                            </div>
                                                            <p className="text-gray-700 dark:text-gray-300 text-sm">{comment.text}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Input Nuevo Comentario */}
                                        <div className="flex gap-2 items-center">
                                            <img src={currentUser?.photoURL || ""} className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-slate-700" />
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                                                    placeholder="Escribe un comentario..."
                                                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full py-2 px-4 text-sm outline-none focus:border-indigo-500 dark:text-white"
                                                />
                                                <button
                                                    onClick={handleSendComment}
                                                    disabled={!newComment.trim()}
                                                    className="absolute right-1 top-1 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-0 transition-all"
                                                >
                                                    <CornerDownRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
};

export default SocialFeed;