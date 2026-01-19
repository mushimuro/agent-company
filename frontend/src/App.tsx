import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

// Placeholder components
const LoginPage = () => <div className="p-8"><h1>Login Page</h1></div>;
const RegisterPage = () => <div className="p-8"><h1>Register Page</h1></div>;
const DashboardLayout = () => (
  <div className="min-h-screen bg-gray-50">
    <nav className="bg-white shadow p-4 mb-4">
      <h1 className="text-xl font-bold">Agent Company</h1>
    </nav>
    <main className="container mx-auto p-4">
      <Outlet />
    </main>
  </div>
);
const ProjectsPage = () => <div className="card"><h2>Projects</h2><p>List of projects will appear here</p></div>;
const ProjectDetailPage = () => <div className="card"><h2>Project Detail</h2><p>Kanban board will appear here</p></div>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="/projects" replace />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
