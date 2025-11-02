import React from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
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
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminFinancialReport from './pages/admin/AdminFinancialReport';

// Public Pages
import LandingPage from './pages/LandingPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="jobs" element={<AdminJobs />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="financial-report" element={<AdminFinancialReport />} />
            <Route path="notifications" element={<AdminNotifications />} />
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
