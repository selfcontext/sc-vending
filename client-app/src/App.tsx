import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader } from 'lucide-react';

// Pages
import ShoppingPage from '@/pages/ShoppingPage';
import CheckoutPage from '@/pages/CheckoutPage';
import DispensingPage from '@/pages/DispensingPage';
import SuccessPage from '@/pages/SuccessPage';
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AnalyticsPage from '@/pages/admin/AnalyticsPage';
import MachineStatusPage from '@/pages/admin/MachineStatusPage';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto text-white mb-4" />
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Customer Routes */}
        <Route path="/session/:sessionId" element={<ShoppingPage />} />
        <Route path="/checkout/:sessionId" element={<CheckoutPage />} />
        <Route path="/dispensing/:sessionId" element={<DispensingPage />} />
        <Route path="/success/:sessionId" element={<SuccessPage />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/analytics" element={<AnalyticsPage />} />
        <Route path="/admin/machines" element={<MachineStatusPage />} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
