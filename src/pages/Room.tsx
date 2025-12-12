import { useParams, useNavigate } from "react-router-dom";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { useAuth } from "../context/AuthContext";

const Room = () => {
    const { roomId } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const myMeeting = async (element: HTMLDivElement) => {
        if (!roomId || !currentUser) return;

        // 1. CONFIGURACIÓN DE ZEGO
        const appID = 1068417042;
        const serverSecret = "3008165671863aad0b16177925c6e9df";

        if (!serverSecret) {
            console.error("Falta el ServerSecret. Cópialo de la consola de ZegoCloud.");
            return;
        }

        // 2. GENERAR TOKEN
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
            appID,
            serverSecret,
            roomId,
            currentUser.uid,
            currentUser.displayName || "Usuario"
        );

        // 3. CREAR INSTANCIA
        const zp = ZegoUIKitPrebuilt.create(kitToken);

        // 4. UNIRSE A LA SALA
        zp.joinRoom({
            container: element,
            sharedLinks: [
                {
                    name: 'Enlace para copiar',
                    url: window.location.origin + '/room/' + roomId,
                },
            ],
            scenario: {
                // CAMBIO IMPORTANTE: Usamos GroupCall para que sirva en chats de 2 y de grupos
                mode: ZegoUIKitPrebuilt.GroupCall,
            },
            showScreenSharingButton: true, // Habilitamos compartir pantalla por si acaso
            onLeaveRoom: () => {
                navigate("/chat");
                window.location.reload();
            },
        });
    };

    return (
        <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
            {currentUser ? (
                <div
                    className="myCallContainer"
                    ref={myMeeting}
                    style={{ width: "100vw", height: "100vh" }}
                ></div>
            ) : (
                <p className="text-white">Cargando sala...</p>
            )}
        </div>
    );
};

export default Room;