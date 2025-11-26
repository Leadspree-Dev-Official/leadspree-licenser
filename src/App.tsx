import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PendingApproval from "./pages/PendingApproval";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboardOverview from "./pages/admin/AdminDashboardOverview";
import AdminLicensesPage from "./pages/admin/AdminLicensesPage";
import AdminSoftwarePage from "./pages/admin/AdminSoftwarePage";
import AdminAllocationsPage from "./pages/admin/AdminAllocationsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminApiKeysPage from "./pages/admin/AdminApiKeysPage";
import ResellerLayout from "./pages/reseller/ResellerLayout";
import ResellerDashboardOverview from "./pages/reseller/ResellerDashboardOverview";
import ResellerLicensesPage from "./pages/reseller/ResellerLicensesPage";
import ResellerOverviewPage from "./pages/reseller/ResellerOverviewPage";
import ResellerAllocationsPage from "./pages/reseller/ResellerAllocationsPage";
import ResellerIssuedLicensesPage from "./pages/reseller/ResellerIssuedLicensesPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pending" element={<PendingApproval />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardOverview />} />
              <Route path="licenses" element={<AdminLicensesPage />} />
              <Route path="software" element={<AdminSoftwarePage />} />
              <Route path="allocations" element={<AdminAllocationsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="api-keys" element={<AdminApiKeysPage />} />
            </Route>

            {/* Reseller Routes */}
            <Route path="/dashboard" element={<ResellerLayout />}>
              <Route index element={<ResellerDashboardOverview />} />
              <Route path="overview" element={<ResellerOverviewPage />} />
              <Route path="allocations" element={<ResellerAllocationsPage />} />
              <Route path="licenses" element={<ResellerLicensesPage />} />
              <Route path="issued" element={<ResellerIssuedLicensesPage />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
