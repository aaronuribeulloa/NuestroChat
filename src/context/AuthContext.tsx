import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "../config/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,           // Tipo oficial de Usuario de Firebase
  UserCredential  // Tipo del resultado del login
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

// 1. DEFINIMOS QUÉ DATOS OFRECE ESTE CONTEXTO (LA INTERFAZ)
interface IAuthContext {
  currentUser: User | null;
  loginWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
}

// Creamos el contexto tipado
const AuthContext = createContext<IAuthContext | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return context;
};

// 2. TIPAMOS LOS PROPS (children)
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // 3. TIPAMOS EL ESTADO
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Referencia al usuario en la BD
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    // Guardamos/Actualizamos los datos del usuario
    const userData = {
      uid: user.uid,
      displayName: user.displayName,
      displayNameLower: user.displayName ? user.displayName.toLowerCase() : "",
      email: user.email,
      photoURL: user.photoURL,
      lastLogin: serverTimestamp(),
    };

    // Si no existe, creamos. Si existe, actualizamos (merge)
    if (!userSnap.exists()) {
      await setDoc(userRef, { ...userData, createdAt: serverTimestamp() });
    } else {
      await setDoc(userRef, userData, { merge: true });
    }

    return result;
  };

  const logout = async () => signOut(auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Objeto con el tipo IAuthContext
  const value: IAuthContext = {
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