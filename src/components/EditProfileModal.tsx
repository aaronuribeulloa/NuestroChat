import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../config/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { X, Save, MapPin, Briefcase, GraduationCap, Music, Heart } from "lucide-react";

interface Props {
    onClose: () => void;
}

// Lista de intereses predefinidos (puedes añadir más)
const INTERESTS_LIST = ["Desarrollo Web", "Videojuegos", "Música Rock", "Anime", "Fútbol", "Astronomía", "Viajes", "Cocina", "Tecnología", "Arte"];

const EditProfileModal = ({ onClose }: Props) => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);

    // Estados del formulario
    const [bio, setBio] = useState("");
    const [location, setLocation] = useState("");
    const [work, setWork] = useState("");
    const [education, setEducation] = useState("");
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

    // Cargar datos existentes
    useEffect(() => {
        const loadData = async () => {
            if (currentUser) {
                const docSnap = await getDoc(doc(db, "users", currentUser.uid));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setBio(data.bio || "");
                    setLocation(data.location || "");
                    setWork(data.work || "");
                    setEducation(data.education || "");
                    setSelectedInterests(data.interests || []);
                }
            }
        };
        loadData();
    }, [currentUser]);

    const toggleInterest = (interest: string) => {
        if (selectedInterests.includes(interest)) {
            setSelectedInterests(selectedInterests.filter(i => i !== interest));
        } else {
            setSelectedInterests([...selectedInterests, interest]);
        }
    };

    const handleSave = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, "users", currentUser.uid), {
                bio,
                location,
                work,
                education,
                interests: selectedInterests,
                profileCompleted: true // Marca para saber que ya rellenó sus datos
            });
            onClose();
        } catch (error) {
            console.error("Error guardando perfil:", error);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* HEADER */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Editar Perfil</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-500 dark:text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                {/* BODY - SCROLLABLE */}
                <div className="p-6 overflow-y-auto custom-scrollbar">

                    {/* 1. Biografía */}
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Sobre mí</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Cuéntanos algo sobre ti..."
                            className="w-full bg-gray-50 dark:bg-slate-800 dark:text-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24 text-sm"
                        />
                    </div>

                    {/* 2. Información Básica */}
                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 p-2 rounded-xl">
                            <MapPin size={18} className="text-indigo-500 ml-2" />
                            <input type="text" placeholder="Ciudad / País" value={location} onChange={e => setLocation(e.target.value)} className="bg-transparent w-full outline-none text-sm dark:text-white" />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 p-2 rounded-xl">
                            <Briefcase size={18} className="text-indigo-500 ml-2" />
                            <input type="text" placeholder="Lugar de trabajo" value={work} onChange={e => setWork(e.target.value)} className="bg-transparent w-full outline-none text-sm dark:text-white" />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 p-2 rounded-xl">
                            <GraduationCap size={18} className="text-indigo-500 ml-2" />
                            <input type="text" placeholder="Escuela / Universidad" value={education} onChange={e => setEducation(e.target.value)} className="bg-transparent w-full outline-none text-sm dark:text-white" />
                        </div>
                    </div>

                    {/* 3. Intereses */}
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-1">
                            <Heart size={14} /> Gustos e Intereses
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {INTERESTS_LIST.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleInterest(tag)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border
                                ${selectedInterests.includes(tag)
                                            ? "bg-indigo-500 text-white border-indigo-500 shadow-md transform scale-105"
                                            : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-indigo-300"
                                        }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* FOOTER */}
                <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? "Guardando..." : <><Save size={18} /> Guardar Perfil</>}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default EditProfileModal;