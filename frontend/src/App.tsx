import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import MainLayout from './components/layout/MainLayout';
import './styles/global.scss';
import useAuthStore from './store/useAuthStore';

const TemplateCenter = lazy(() => import('./pages/TemplateCenter'));
const ResumeLibrary = lazy(() => import('./pages/ResumeLibrary'));
const ReviewOptimize = lazy(() => import('./pages/ReviewOptimize'));
const ExportHistory = lazy(() => import('./pages/ExportHistory'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

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
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>}>
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
        </Suspense>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
