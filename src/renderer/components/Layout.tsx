import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Sidebar />
      <div className="flex flex-col flex-1 min-h-0">
        <Topbar />
        <main className="flex-1 overflow-auto p-6 space-y-6 transition-all duration-200">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 