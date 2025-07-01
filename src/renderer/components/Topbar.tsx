import React, { useEffect, useState } from 'react';

const Topbar: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = async () => {
      const darkMode = await window.api.getDarkMode();
      setIsDarkMode(darkMode);
    };
    checkDarkMode();
  }, []);

  const toggleDarkMode = async () => {
    await window.api.toggleDarkMode();
    setIsDarkMode(!isDarkMode);
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Job Applications
          </h2>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar; 