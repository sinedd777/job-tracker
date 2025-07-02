import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useDarkMode } from '../contexts/DarkModeContext';

const Topbar: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
      
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar; 