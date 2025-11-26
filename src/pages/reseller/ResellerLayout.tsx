import { useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardSidebar from "@/components/layouts/DashboardSidebar";

const ResellerLayout = () => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        navigate("/auth");
      } else if (profile.role === "admin") {
        navigate("/admin");
      } else if (profile.status !== "active") {
        navigate("/pending");
      }
    }
  }, [profile, loading, navigate]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <DashboardSidebar role="reseller" />
      <main className="flex-1 overflow-auto lg:ml-0">
        <Outlet />
      </main>
    </div>
  );
};

export default ResellerLayout;
