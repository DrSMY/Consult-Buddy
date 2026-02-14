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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/program/peptides" element={<ProtectedRoute><PatientIntake /></ProtectedRoute>} />
            <Route path="/program/weight-loss" element={<ProtectedRoute><WeightLossIntake /></ProtectedRoute>} />
            <Route path="/consultation/:id" element={<ProtectedRoute><Consultation /></ProtectedRoute>} />
            <Route path="/weight-loss/:id" element={<ProtectedRoute><WeightLossConsultation /></ProtectedRoute>} />
            <Route path="/knowledge-base" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
            <Route path="/patient-files" element={<ProtectedRoute><PatientFiles /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
