import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import MainLayout from './components/layout/MainLayout';
import TemplateCenter from './pages/TemplateCenter';
import ResumeLibrary from './pages/ResumeLibrary';
import ReviewOptimize from './pages/ReviewOptimize';
import ExportHistory from './pages/ExportHistory';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import './styles/global.scss';
import useAuthStore from './store/useAuthStore';

const App: React.FC = () => {
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    refreshMe().catch(() => undefined);
    const onLogout = () => logout();
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [logout, refreshMe]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#764ba2', // Match the purple end of our gradient
          borderRadius: 6,
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f5f7fa',
        },
        components: {
          Button: {
            colorPrimary: '#764ba2',
            algorithm: true, // Enable algorithm to derive hover/active states
          },
          Menu: {
            itemSelectedBg: '#303f9f', // Deep Indigo for high contrast selection
            itemSelectedColor: '#ffffff',
            itemColor: 'rgba(255, 255, 255, 0.65)', // Brighter inactive text
            itemHoverColor: '#ffffff',
          }
        }
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/resumes" replace />} />
            <Route path="templates" element={<TemplateCenter />} />
            <Route path="resumes" element={<ResumeLibrary />} />
            <Route path="review" element={<ReviewOptimize />} />
            <Route path="exports" element={<ExportHistory />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
