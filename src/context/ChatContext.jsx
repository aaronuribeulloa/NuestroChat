import { createContext, useContext, useReducer } from "react";
import { useAuth } from "./AuthContext";

const ChatContext = createContext();

export const useChat = () => {
  return useContext(ChatContext);
};

export const ChatContextProvider = ({ children }) => {
  const { currentUser } = useAuth();

  // Estado inicial: Nadie seleccionado
  const INITIAL_STATE = {
    chatId: "null",
    user: {},
  };

  // El "Reducer" decide qué hacer según la acción
  const chatReducer = (state, action) => {
    switch (action.type) {
      case "CHANGE_USER":
        return {
          user: action.payload, // El otro usuario
          // Creamos un ID único combinando los dos IDs (siempre en el mismo orden)
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