import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Mail, History, PlaneTakeoff } from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'New Jobs', icon: LayoutDashboard },
    { path: '/historical', label: 'Historical', icon: History },
    { path: '/resume', label: 'Resumes', icon: FileText },
    { path: '/email', label: 'Cold Emails', icon: Mail },
  ];

  return (
    <aside className="w-20 h-screen relative z-50">
      <div className="absolute inset-0 glass opacity-95 bg-white/80"></div>
      <div className="relative z-10 w-full h-full flex flex-col items-center">
      <div className="p-4 w-full border-b border-white/10 backdrop-blur-xl">
        <div className="w-12 h-12 mx-auto glass rounded-xl flex items-center justify-center bg-white/30">
          <PlaneTakeoff className="w-6 h-6 text-black drop-shadow-sm" />
        </div>
      </div>

      {/* Glass navigation */}
      <nav className="flex-1 flex flex-col items-center gap-3 p-4 relative">
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className="group/item relative"
            title={label}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                isActive(path)
                  ? 'glass-info shadow-glass-xl transform scale-110 backdrop-blur-xl bg-white/20'
                  : 'glass-surface hover:glass hover:shadow-glass-lg bg-white/10'
              }`}
            >
              <Icon className={`w-5 h-5 transition-colors duration-200 ${
                isActive(path)
                  ? 'text-primary-600 drop-shadow-sm'
                  : 'text-gray-600 group-hover/item:text-primary-500'
              }`} />
              {isActive(path) && (
                <div className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-primary-500 animate-pulse shadow-glass-highlight" />
              )}
            </div>
            <div className="absolute left-full ml-2 px-2 py-1 rounded-lg glass backdrop-blur-xl opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all duration-200 text-sm text-gray-700 font-medium whitespace-nowrap shadow-glass-lg bg-white/90">
              {label}
            </div>
          </Link>
        ))}
      </nav>

      <div className="p-4 w-full mt-auto border-t border-white/10">
        <div className="w-12 h-12 mx-auto glass-surface rounded-xl flex items-center justify-center hover:scale-110 transition-all duration-300 group/logo cursor-help">
          <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">A</span>
          <div className="absolute left-full ml-2 px-2 py-1 rounded-lg glass backdrop-blur-xl opacity-0 invisible group-hover/logo:opacity-100 group-hover/logo:visible transition-all duration-200 text-sm text-gray-800 whitespace-nowrap shadow-glass-lg">
            ApplyPilot
          </div>
        </div>
      </div>
      </div>
    </aside>
  );
};

export default Sidebar; 