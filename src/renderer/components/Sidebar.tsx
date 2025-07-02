import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Mail } from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/resume', label: 'Resumes', icon: FileText },
    { path: '/email', label: 'Cold Emails', icon: Mail },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-200">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">
        ApplyPilot
        </h1>
      </div>
      <nav className="space-y-1 px-3">
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
              isActive(path)
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <Icon className={`w-5 h-5 mr-3 ${
              isActive(path)
                ? 'text-blue-700 dark:text-blue-200'
                : 'text-gray-400 dark:text-gray-500'
            }`} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar; 