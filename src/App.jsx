import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppLayout from "./components/layout/AppLayout";
import SkuVelocityOverview from "./pages/SkuVelocityOverview";
import SkuVelocityDetail from "./pages/SkuVelocityDetail";
import ComponentSkuDetail from "./pages/ComponentSkuDetail";
import SpendForecast from "./pages/SpendForecast";
import SpendAllocator from "./pages/SpendAllocator";
import LoginPage from "./pages/LoginPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        width: "100vw", height: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "#1a1d23", color: "#9ca3af", fontSize: "14px",
      }}>
        Loading...
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/sku-velocity" replace />} />
            <Route path="/sku-velocity" element={<SkuVelocityOverview />} />
            <Route path="/sku-velocity/:skuId" element={<SkuVelocityDetail />} />
            <Route path="/components/:componentId" element={<ComponentSkuDetail />} />
            <Route path="/components" element={<Navigate to="/sku-velocity" replace />} />
            <Route path="/spend-forecast" element={<SpendForecast />} />
            <Route path="/budget-allocator" element={<SpendAllocator />} />
            <Route path="/price-tests" element={<Navigate to="/sku-velocity" replace />} />
            <Route path="/settings" element={<Navigate to="/sku-velocity" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
