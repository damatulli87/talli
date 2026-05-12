import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeProvider';
import { AnimatePresence, motion } from 'framer-motion';

import Dashboard from '@/pages/Dashboard';
import Settings from '@/pages/Settings';
import History from '@/pages/History';
import AdjustCycle from '@/pages/AdjustCycle';
import Login from '@/pages/Login';

const TAB_PATHS = ['/', '/history', '/settings'];
const isTabPath = (path) => TAB_PATHS.includes(path);

const StackWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: '100%' }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: '100%' }}
    transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
    style={{ height: '100%', position: 'absolute', inset: 0, overflowY: 'auto' }}
  >
    {children}
  </motion.div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const isTab = isTabPath(location.pathname);
  const activePath = location.pathname;

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      {/* Tab pages — always mounted, shown/hidden to preserve scroll & state */}
      <div style={{ display: activePath === '/' ? 'block' : 'none', height: '100%' }}>
        <Dashboard />
      </div>
      <div style={{ display: activePath === '/history' ? 'block' : 'none', height: '100%', overflowY: 'auto', overscrollBehavior: 'none' }}>
        <History />
      </div>
      <div style={{ display: activePath === '/settings' ? 'block' : 'none', height: '100%', overflowY: 'auto', overscrollBehavior: 'none' }}>
        <Settings />
      </div>

      {/* Stack pages — animated, unmounted when gone */}
      <AnimatePresence mode="wait">
        {!isTab && (
          <StackWrapper key={location.pathname}>
            <Routes location={location}>
              <Route path="/adjust-cycle" element={<AdjustCycle />} />
              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </StackWrapper>
        )}
      </AnimatePresence>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <SonnerToaster position="top-center" richColors />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
