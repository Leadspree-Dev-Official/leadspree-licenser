import { useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardSidebar from "@/components/layouts/DashboardSidebar";
import { MessageCircle } from "lucide-react";

const WHATSAPP_LINK = "https://wa.me/919051822558";

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
        {/* WhatsApp Contact Button - Fixed Top Right */}
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 group"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium">Contact Admin</span>
        </a>
        <Outlet />
      </main>
    </div>
  );
};

export default ResellerLayout;
