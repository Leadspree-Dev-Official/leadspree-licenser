import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Shield, Key, Users, Lock } from "lucide-react";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.status === "pending") {
        navigate("/pending");
      } else if (profile.role === "admin") {
        navigate("/admin");
      } else if (profile.status === "active") {
        navigate("/dashboard");
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 mb-16">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center">
              <Shield className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-5xl font-bold mb-4">LeadSpree</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional License Management System for Software Resellers
            </p>
          </div>
          <Button size="lg" onClick={() => navigate("/auth")} className="px-8">
            Get Started
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
              <Key className="w-6 h-6 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold">License Generation</h3>
            <p className="text-muted-foreground">
              Generate secure license keys with LS-XX-XXXX-XXXX format. Track buyer information
              and limit licenses per customer.
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
              <Users className="w-6 h-6 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold">Reseller Management</h3>
            <p className="text-muted-foreground">
              Approve resellers, allocate license quotas, and monitor usage in real-time.
              Complete control over your distribution network.
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center">
              <Lock className="w-6 h-6 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold">API Integration</h3>
            <p className="text-muted-foreground">
              Secure API endpoints for license validation. Integrate with your software for
              real-time license verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
