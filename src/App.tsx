import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PatientIntake from "./pages/PatientIntake";
import WeightLossIntake from "./pages/WeightLossIntake";
import Consultation from "./pages/Consultation";
import WeightLossConsultation from "./pages/WeightLossConsultation";
import KnowledgeBase from "./pages/KnowledgeBase";
import PatientFiles from "./pages/PatientFiles";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Install from "./pages/Install";
import SharedGuide from "./pages/SharedGuide";
import BookAppointment from "./pages/BookAppointment";
import OAuthConsent from "./pages/OAuthConsent";
import InstallBanner from "./components/InstallBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <InstallBanner />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/install" element={<Install />} />
            <Route path="/book" element={<BookAppointment />} />
            <Route path="/shared-guide" element={<SharedGuide />} />
            <Route path="/g/:file" element={<SharedGuide />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/program/peptides" element={<ProtectedRoute><PatientIntake /></ProtectedRoute>} />
            <Route path="/program/weight-loss" element={<ProtectedRoute><WeightLossIntake /></ProtectedRoute>} />
            <Route path="/consultation/:id" element={<ProtectedRoute><Consultation /></ProtectedRoute>} />
            <Route path="/weight-loss/:id" element={<ProtectedRoute><WeightLossConsultation /></ProtectedRoute>} />
            <Route path="/knowledge-base" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
            <Route path="/patient-files" element={<ProtectedRoute><PatientFiles /></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
