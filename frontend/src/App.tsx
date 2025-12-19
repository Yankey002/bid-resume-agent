import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import TemplateCenter from './pages/TemplateCenter';
import ResumeLibrary from './pages/ResumeLibrary';
import ReviewOptimize from './pages/ReviewOptimize';
import ExportHistory from './pages/ExportHistory';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import './styles/global.scss';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/templates" replace />} />
          <Route path="templates" element={<TemplateCenter />} />
          <Route path="resumes" element={<ResumeLibrary />} />
          <Route path="review" element={<ReviewOptimize />} />
          <Route path="exports" element={<ExportHistory />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
