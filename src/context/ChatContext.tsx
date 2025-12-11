import { createContext, useContext, useReducer, ReactNode, Dispatch } from "react";
import { useAuth } from "./AuthContext";

// 1. DEFINIMOS LA FORMA DEL ESTADO
interface ChatState {
  chatId: string;
  user: any; // El objeto del otro usuario
}

// 2. DEFINIMOS LAS ACCIONES PERMITIDAS
// Esto evita errores de dedo al escribir el tipo de acción
type ChatAction =
  | { type: "CHANGE_USER"; payload: any }
  | { type: "RESET" };

// 3. DEFINIMOS QUÉ DEVUELVE EL CONTEXTO
interface IChatContext {
  data: ChatState;
  dispatch: Dispatch<ChatAction>;
}

const ChatContext = createContext<IChatContext | null>(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat debe usarse dentro de ChatContextProvider");
  return context;
};

export const ChatContextProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();

  // Estado inicial
  const INITIAL_STATE: ChatState = {
    chatId: "null",
    user: {},
  };

  const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
    switch (action.type) {
      case "CHANGE_USER":
        // Si el payload es null, reseteamos (útil para cerrar chat en móvil)
        if (!action.payload) {
          return INITIAL_STATE;
        }

        // Seguridad: Si por alguna razón no hay usuario logueado, no hacemos nada
        if (!currentUser) return state;

        return {
          user: action.payload,
          chatId:
            currentUser.uid > action.payload.uid
              ? currentUser.uid + action.payload.uid
              : action.payload.uid + currentUser.uid,
        };

      case "RESET":
        return INITIAL_STATE;

      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(chatReducer, INITIAL_STATE);

  return (
    <ChatContext.Provider value={{ data: state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
};