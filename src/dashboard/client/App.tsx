import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './components/Dashboard';
import { JobsList } from './components/JobsList';
import { LeadsList } from './components/LeadsList';
import { CampaignsPage } from './components/CampaignsPage';
import { NetworkMessagingPage } from './components/NetworkMessagingPage';
import { ActivityLog } from './components/ActivityLog';
import { Automation } from './components/Automation';
import { Settings } from './components/Settings';
import { JobNavigationProvider } from './contexts/JobNavigationContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ConfirmDialogProvider } from './contexts/ConfirmDialogContext';
import { ToastContainer } from './components/ToastContainer';
import { Icon } from './components/Icon';
import { LlmHealthIndicator } from './components/LlmHealthIndicator';
import { setupAlertInterceptor } from './lib/interceptAlerts';

const queryClient = new QueryClient();

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/' },
  { id: 'jobs', label: 'Jobs', icon: 'work', path: '/jobs' },
  { id: 'leads', label: 'Leads', icon: 'group', path: '/leads' },
  { id: 'network-messaging', label: 'Network Messaging', icon: 'send', path: '/network-messaging' },
  { id: 'activity', label: 'Activity', icon: 'list-alt', path: '/activity' },
  { id: 'automation', label: 'Automation', icon: 'precision-manufacturing', path: '/automation' },
  { id: 'settings', label: 'Settings', icon: 'settings', path: '/settings' },
];

function AppContent() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toast = useToast();

  // Setup alert interceptor to replace browser alerts with toasts
  useEffect(() => {
    const cleanup = setupAlertInterceptor({ 
      toast,
      debug: import.meta.env.DEV 
    });
    return cleanup;
  }, [toast]);

  // Determine current view from URL path
  const getCurrentView = (): string => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    return path.substring(1).charAt(0).toUpperCase() + path.substring(2);
  };

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
              <h1 className="text-lg font-semibold text-gray-800">Opportunities</h1>
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
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.id}>
                  <Link
                    to={item.path}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    title={!isSidebarOpen ? item.label : undefined}
                  >
                    <Icon 
                      icon={item.icon} 
                      size={24} 
                      className={isActive ? 'text-blue-600' : 'text-gray-600'} 
                    />
                    {isSidebarOpen && (
                      <span className="font-medium">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
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
          <h2 className="text-xl font-semibold text-gray-800 capitalize">{getCurrentView()}</h2>
          <div className="flex items-center gap-4">
            <LlmHealthIndicator />
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
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs" element={<JobsList />} />
            <Route path="/leads" element={<LeadsList />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/network-messaging" element={<NetworkMessagingPage />} />
            <Route path="/activity" element={<ActivityLog />} />
            <Route path="/automation" element={<Automation />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmDialogProvider>
            <JobNavigationProvider>
              <AppContent />
              <ToastContainer />
            </JobNavigationProvider>
          </ConfirmDialogProvider>
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;

