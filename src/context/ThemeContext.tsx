import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Definimos los tipos de tema posibles
type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme debe usarse dentro de ThemeProvider");
    return context;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    // 1. Intentamos leer del localStorage, si no, usamos 'light' por defecto
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem("theme");
        return (saved as Theme) || "light";
    });

    // 2. Efecto para aplicar la clase 'dark' al HTML
    useEffect(() => {
        const root = window.document.documentElement;

        if (theme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }

        // Guardar preferencia
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};