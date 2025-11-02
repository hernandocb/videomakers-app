import React from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminJobs from './pages/admin/AdminJobs';
import AdminPayments from './pages/admin/AdminPayments';
import AdminConfig from './pages/admin/AdminConfig';
import AdminModeration from './pages/admin/AdminModeration';
import AdminAnalytics from './pages/admin/AdminAnalytics';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Redirect root to admin */}
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="jobs" element={<AdminJobs />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="config" element={<AdminConfig />} />
            <Route path="moderation" element={<AdminModeration />} />
          </Route>
        </Routes>
      </BrowserRouter>
      
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;
