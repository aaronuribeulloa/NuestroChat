import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "../config/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

interface IAuthContext {
  currentUser: User | null;
  loginWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<IAuthContext | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    const userData = {
      uid: user.uid,
      displayName: user.displayName,
      displayNameLower: user.displayName ? user.displayName.toLowerCase() : "",
      email: user.email,
      photoURL: user.photoURL,
      lastSeen: serverTimestamp(), // CAMBIADO: Usamos lastSeen en lugar de lastLogin para ser más claros
      isOnline: true, // NUEVO: Estado explícito
    };

    if (!userSnap.exists()) {
      await setDoc(userRef, { ...userData, createdAt: serverTimestamp() });
    } else {
      await setDoc(userRef, userData, { merge: true });
    }

    return result;
  };

  const logout = async () => {
    // Antes de salir, marcamos como offline
    if (currentUser) {
      await updateDoc(doc(db, "users", currentUser.uid), {
        isOnline: false,
        lastSeen: serverTimestamp()
      });
    }
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);

      // Si el usuario entra, marcamos online
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          isOnline: true,
          lastSeen: serverTimestamp()
        });
      }
    });
    return unsubscribe;
  }, []);

  // --- NUEVO: HEARTBEAT (Latido) ---
  // Actualiza el estado "En línea" cada 2 minutos para confirmar que sigue ahí
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(async () => {
      await updateDoc(doc(db, "users", currentUser.uid), {
        lastSeen: serverTimestamp(),
        isOnline: true
      });
    }, 120000); // 2 minutos

    // Manejar cuando cierra la pestaña
    const handleTabClose = () => {
      updateDoc(doc(db, "users", currentUser.uid), {
        isOnline: false,
        lastSeen: serverTimestamp()
      });
    };

    window.addEventListener("beforeunload", handleTabClose);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleTabClose);
    };
  }, [currentUser]);


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