import { createContext, useContext, useReducer, ReactNode, Dispatch } from "react";
import { useAuth } from "./AuthContext";

interface ChatState {
  chatId: string;
  user: any;
}

type ChatAction =
  | { type: "CHANGE_USER"; payload: any }
  | { type: "RESET" };

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

  const INITIAL_STATE: ChatState = {
    chatId: "null",
    user: {},
  };

  const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
    switch (action.type) {
      case "CHANGE_USER":
        // 1. Si no hay payload, reseteamos
        if (!action.payload) return INITIAL_STATE;

        // 2. Si no hay usuario logueado, no hacemos nada
        if (!currentUser) return state;

        // --- CORRECCIÓN CRÍTICA AQUÍ ---
        // A. Si es un GRUPO, el chatId es directamente el UID del grupo.
        if (action.payload.isGroup) {
          return {
            user: action.payload,
            chatId: action.payload.uid
          };
        }

        // B. Si es una PERSONA (1vs1), usamos la fórmula combinada.
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