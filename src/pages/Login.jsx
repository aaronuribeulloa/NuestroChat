import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MessageCircle, Sparkles, Heart, Zap } from "lucide-react"; // Iconos divertidos

const Login = () => {
  const { loginWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate("/chat");
    }
  }, [currentUser, navigate]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Error al entrar:", error);
    }
  };

  return (
    // Contenedor Principal: Pantalla dividida (flex)
    <div className="min-h-screen w-full flex bg-white overflow-hidden font-sans">

      {/* --- MITAD IZQUIERDA: ÉL ÁREA DIVERTIDA Y VISUAL (Solo visible en PC - lg:flex) --- */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 items-center justify-center overflow-hidden">

        {/* Elementos Decorativos Flotantes (Burbujas) */}
        <div className="absolute top-0 left-0 w-full h-full z-0">
          {/* Burbuja 1: Arriba Izquierda */}
          <div className="absolute top-20 left-10 glass-bubble p-4 rounded-2xl rounded-tr-none animate-float-slow opacity-80">
            <MessageCircle size={32} className="text-white mb-2" />
            <p className="text-white text-sm font-medium">¡Hola! ¿Listo para chatear? 👋</p>
          </div>

          {/* Burbuja 2: Abajo Derecha */}
          <div className="absolute bottom-32 right-10 glass-bubble p-5 rounded-[2rem] rounded-bl-none animate-float-medium opacity-90 delay-1000">
            <div className="flex items-center gap-2">
              <Heart size={24} className="text-pink-300" fill="currentColor" />
              <p className="text-white text-lg font-bold">Conecta al instante.</p>
            </div>
          </div>

          {/* Burbuja 3: Pequeña con emoji */}
          <div className="absolute top-1/3 right-20 glass-bubble w-16 h-16 flex items-center justify-center rounded-full animate-float-fast delay-500">
            <span className="text-3xl">🎉</span>
          </div>

          {/* Círculos de fondo sutiles */}
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        </div>

        {/* Texto Principal */}
        <div className="relative z-10 text-center p-12 animate-fade-in-up">
          <div className="bg-white/20 p-4 rounded-full inline-block mb-6 backdrop-blur-md shadow-xl">
            <Sparkles size={48} className="text-yellow-300" />
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight drop-shadow-sm">
            Bienvenido a <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-pink-200">
              NuestroChat
            </span>
          </h1>
          <p className="text-indigo-100 text-lg max-w-md mx-auto font-medium leading-relaxed">
            La forma más divertida, rápida y segura de conectar con tu gente. Únete a la conversación ahora mismo.
          </p>
        </div>
      </div>

      {/* --- MITAD DERECHA: EL FORMULARIO DE LOGIN --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 animate-fade-in-up">
        <div className="max-w-md w-full text-center">
          {/* Logo Móvil (Solo se ve en celular) */}
          <div className="lg:hidden bg-gradient-to-tr from-indigo-500 to-pink-500 p-4 rounded-2xl inline-block mb-8 shadow-lg">
            <MessageCircle size={40} className="text-white" />
          </div>

          <h2 className="text-4xl font-bold text-gray-900 mb-3">¡Holaa Amiguito/a!</h2>
          <p className="text-gray-500 text-lg mb-12">
            Inicia sesión para empezar a chatear.
          </p>

          {/* BOTÓN DE GOOGLE MEJORADO */}
          <button
            onClick={handleLogin}
            className="w-full group relative flex items-center justify-center gap-4 bg-white text-gray-800 px-8 py-4 rounded-full shadow-lg border-2 border-gray-200 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 active:scale-95 font-bold text-lg overflow-hidden"
          >
            {/* Efecto de fondo al hacer hover */}
            <div className="absolute inset-0 w-0 bg-indigo-50 transition-all duration-[350ms] ease-out group-hover:w-full z-0"></div>

            {/* Contenido del botón */}
            <div className="relative z-10 flex items-center gap-4">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-7 h-7" />
              <span>Continuar con Google</span>
              <Zap size={20} className="text-indigo-500 group-hover:animate-bounce" />
            </div>
          </button>

          <p className="mt-8 text-sm text-gray-400 font-medium">
            Al continuar, aceptas ser increíble 🚀
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;