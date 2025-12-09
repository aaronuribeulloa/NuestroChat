import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../config/firebase"; // <--- Asegúrate de importar 'db'
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"; // <--- Nuevos imports

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // --- NUEVO: Guardar usuario en Base de Datos ---
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    // Si el usuario no existe en la BD, lo creamos
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        // Generamos keywords para búsqueda simple (minúsculas)
        searchKeywords: [user.displayName.toLowerCase(), user.email.toLowerCase()] 
      });
    }
    // -----------------------------------------------
    
    return result;
  };

  const logout = () => signOut(auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};