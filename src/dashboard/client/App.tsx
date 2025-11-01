import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './components/Dashboard';
import { JobsList } from './components/JobsList';
import { ActivityLog } from './components/ActivityLog';
import { Automation } from './components/Automation';
import { Settings } from './components/Settings';
import { JobNavigationProvider, useJobNavigation } from './contexts/JobNavigationContext';
import { ToastProvider } from './contexts/ToastContext';
import { Icon } from './components/Icon';

const queryClient = new QueryClient();

type View = 'dashboard' | 'jobs' | 'activity' | 'automation' | 'settings';

interface NavItem {
  id: View;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'jobs', label: 'Jobs', icon: 'work' },
  { id: 'activity', label: 'Activity', icon: 'list-alt' },
  { id: 'automation', label: 'Automation', icon: 'precision-manufacturing' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

function AppContent() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { targetJobId, clearNavigation } = useJobNavigation();

  // Auto-navigate to jobs view when a job is targeted
  React.useEffect(() => {
    if (targetJobId && currentView !== 'jobs') {
      setCurrentView('jobs');
    }
  }, [targetJobId, currentView]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-screen bg-white shadow-lg z-40 transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {isSidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Icon icon="work" className="text-white" size={20} />
              </div>
              <h1 className="text-lg font-semibold text-gray-800">Job Automation</h1>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Icon icon={isSidebarOpen ? 'menu-open' : 'menu'} size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="mt-4 px-2">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    currentView === item.id
                      ? 'bg-blue-50 text-blue-600 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  title={!isSidebarOpen ? item.label : undefined}
                >
                  <Icon 
                    icon={item.icon} 
                    size={24} 
                    className={currentView === item.id ? 'text-blue-600' : 'text-gray-600'} 
                  />
                  {isSidebarOpen && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        {isSidebarOpen && (
          <div className="absolute bottom-4 left-0 right-0 px-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-start gap-2">
                <Icon icon="info" size={20} className="text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Pro Tip</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Use the Activity log to track automation progress
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6">
          <h2 className="text-xl font-semibold text-gray-800 capitalize">{currentView}</h2>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Notifications">
              <Icon icon="notifications" size={24} className="text-gray-600" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Help">
              <Icon icon="help" size={24} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'jobs' && <JobsList />}
          {currentView === 'activity' && <ActivityLog />}
          {currentView === 'automation' && <Automation />}
          {currentView === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <JobNavigationProvider>
          <AppContent />
        </JobNavigationProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;

