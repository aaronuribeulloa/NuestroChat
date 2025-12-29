import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../config/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";
import { Send, Heart, MessageSquare, Trash2, MoreHorizontal } from "lucide-react";

interface IPost {
    id: string;
    uid: string;
    displayName: string;
    photoURL: string;
    text: string;
    createdAt: any;
    likes?: string[]; // Array de UIDs de quienes dieron like
}

const SocialFeed = () => {
    const { currentUser } = useAuth();
    const [posts, setPosts] = useState<IPost[]>([]);
    const [newPost, setNewPost] = useState("");
    const [loading, setLoading] = useState(false);

    // 1. ESCUCHAR POSTS EN TIEMPO REAL
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

    // 2. PUBLICAR NUEVO POST
    const handlePost = async () => {
        if (!newPost.trim() || !currentUser) return;
        setLoading(true);
        try {
            await addDoc(collection(db, "posts"), {
                uid: currentUser.uid,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                text: newPost,
                createdAt: serverTimestamp(),
                likes: []
            });
            setNewPost("");
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    // 3. DAR / QUITAR LIKE
    const handleLike = async (post: IPost) => {
        if (!currentUser) return;
        const postRef = doc(db, "posts", post.id);
        const isLiked = post.likes?.includes(currentUser.uid);

        if (isLiked) {
            await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
        } else {
            await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
        }
    };

    // 4. ELIMINAR MI POST
    const handleDelete = async (postId: string) => {
        if (window.confirm("¿Borrar publicación?")) {
            await deleteDoc(doc(db, "posts", postId));
        }
    }

    // Formatear fecha simple
    const formatDate = (timestamp: any) => {
        if (!timestamp) return "Reciente";
        const date = timestamp.toDate();
        return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div className="flex-1 h-full overflow-y-auto bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">

                {/* CABECERA */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Comunidad</h1>
                    <p className="text-gray-500 dark:text-gray-400">Comparte tus ideas y planes con todos.</p>
                </div>

                {/* COMPOSER (CAJA DE TEXTO) */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 mb-8">
                    <div className="flex gap-4">
                        <img src={currentUser?.photoURL || ""} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-slate-700" />
                        <textarea
                            value={newPost}
                            onChange={(e) => setNewPost(e.target.value)}
                            placeholder={`¿Qué estás pensando, ${currentUser?.displayName?.split(" ")[0]}?`}
                            className="flex-1 bg-transparent resize-none outline-none text-gray-700 dark:text-white placeholder-gray-400 h-20 mt-2"
                        />
                    </div>
                    <div className="flex justify-end mt-2 pt-2 border-t border-gray-50 dark:border-slate-800">
                        <button
                            onClick={handlePost}
                            disabled={!newPost.trim() || loading}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            <Send size={16} /> Publicar
                        </button>
                    </div>
                </div>

                {/* LISTA DE POSTS */}
                <div className="space-y-4">
                    {posts.map(post => {
                        const isLiked = post.likes?.includes(currentUser?.uid || "");
                        const isOwner = post.uid === currentUser?.uid;

                        return (
                            <div key={post.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-slate-700 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex gap-3">
                                        <img src={post.photoURL} className="w-10 h-10 rounded-full object-cover" />
                                        <div>
                                            <h3 className="font-bold text-gray-800 dark:text-white text-sm">{post.displayName}</h3>
                                            <span className="text-xs text-gray-400">{formatDate(post.createdAt)}</span>
                                        </div>
                                    </div>
                                    {isOwner && (
                                        <button onClick={() => handleDelete(post.id)} className="text-gray-400 hover:text-red-500 p-1">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <p className="text-gray-700 dark:text-gray-300 text-[15px] leading-relaxed mb-4 whitespace-pre-wrap">
                                    {post.text}
                                </p>

                                {/* ACCIONES (LIKE) */}
                                <div className="flex items-center gap-6 pt-3 border-t border-gray-50 dark:border-slate-800">
                                    <button
                                        onClick={() => handleLike(post)}
                                        className={`flex items-center gap-2 text-sm font-medium transition-colors ${isLiked ? "text-red-500" : "text-gray-400 hover:text-red-500"
                                            }`}
                                    >
                                        <Heart size={18} className={isLiked ? "fill-current" : ""} />
                                        {post.likes?.length || 0}
                                    </button>

                                    {/* Comentarios (Visual por ahora) */}
                                    <button className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-indigo-500 transition-colors">
                                        <MessageSquare size={18} />
                                        Comentar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
};

export default SocialFeed;