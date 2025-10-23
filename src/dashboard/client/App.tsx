import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './components/Dashboard';
import { JobsList } from './components/JobsList';
import { ActivityLog } from './components/ActivityLog';

const queryClient = new QueryClient();

type View = 'dashboard' | 'jobs' | 'activity';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-100">
        {/* Navigation */}
        <nav className="bg-white border-b-2 border-gray-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800">
                🤖 Job Automation
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('jobs')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentView === 'jobs'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Jobs
                </button>
                <button
                  onClick={() => setCurrentView('activity')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentView === 'activity'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Activity
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main>
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'jobs' && <JobsList />}
          {currentView === 'activity' && <ActivityLog />}
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;

