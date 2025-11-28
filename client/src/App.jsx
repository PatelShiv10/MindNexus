import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import Login from './pages/public/Login';
import Register from './pages/public/Register';

// Dashboard Pages
import NexusHome from './pages/dashboard/NexusHome';
import Settings from './pages/dashboard/Settings';
import Archives from './pages/dashboard/Archives';
import Training from './pages/dashboard/Training';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-nexus-dark flex items-center justify-center text-slate-500">
        Initializing Neural Link...
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Layout for other public pages if any */}
            <Route element={<PublicLayout />}>
              {/* Future public pages */}
            </Route>

            {/* Protected Dashboard Routes */}
            <Route 
              path="/nexus" 
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<NexusHome />} />
              <Route path="settings" element={<Settings />} />
              <Route path="archives" element={<Archives />} />
              <Route path="training" element={<Training />} />
              {/* Placeholders for other routes */}
              <Route path="memory" element={<div className="p-8 text-slate-500">Memory Bank Module Loading...</div>} />
              <Route path="chat" element={<div className="p-8 text-slate-500">Neural Chat Module Loading...</div>} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
