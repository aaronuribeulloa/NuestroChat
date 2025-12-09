import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../config/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

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

    // Referencia al usuario en la BD
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    // Guardamos/Actualizamos los datos del usuario
    // IMPORTANTE: 'displayNameLower' nos servirá para la búsqueda insensible a mayúsculas
    const userData = {
      uid: user.uid,
      displayName: user.displayName,
      displayNameLower: user.displayName ? user.displayName.toLowerCase() : "", // <--- ESTO ES NUEVO
      email: user.email,
      photoURL: user.photoURL,
      lastLogin: serverTimestamp(),
    };

    // Si no existe, creamos. Si existe, actualizamos (merge) para asegurar que tenga el campo lowercase
    if (!userSnap.exists()) {
      await setDoc(userRef, { ...userData, createdAt: serverTimestamp() });
    } else {
      await setDoc(userRef, userData, { merge: true });
    }

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