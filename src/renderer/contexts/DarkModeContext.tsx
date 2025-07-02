import React, { createContext, useContext, useEffect, useState } from 'react';

interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => Promise<void>;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Initialize dark mode state
    const initDarkMode = async () => {
      try {
        const darkMode = await window.api.getDarkMode();
        setIsDarkMode(darkMode);
        if (darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (error) {
        console.error('Failed to initialize dark mode:', error);
      }
    };
    initDarkMode();
  }, []);

  const toggleDarkMode = async () => {
    try {
      const newDarkMode = await window.api.toggleDarkMode();
      setIsDarkMode(newDarkMode);
      if (newDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Failed to toggle dark mode:', error);
    }
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}; 