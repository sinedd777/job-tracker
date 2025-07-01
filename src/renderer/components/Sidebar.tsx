import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-4">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Job Tracker</h1>
      </div>
      <nav className="mt-4">
        <Link
          to="/"
          className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isActive('/') ? 'bg-gray-100 dark:bg-gray-700' : ''
          }`}
        >
          <span className="ml-2">Dashboard</span>
        </Link>
        <Link
          to="/resume"
          className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isActive('/resume') ? 'bg-gray-100 dark:bg-gray-700' : ''
          }`}
        >
          <span className="ml-2">Resumes</span>
        </Link>
        <Link
          to="/mail"
          className={`flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isActive('/mail') ? 'bg-gray-100 dark:bg-gray-700' : ''
          }`}
        >
          <span className="ml-2">Cold Emails</span>
        </Link>
      </nav>
    </aside>
  );
};

export default Sidebar; 