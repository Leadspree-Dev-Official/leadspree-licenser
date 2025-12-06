import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, Users, Lock, Check, ExternalLink, MessageCircle } from "lucide-react";

interface Software {
  id: string;
  name: string;
  tagline: string | null;
  description: string;
  features: string[] | null;
  retail_price: number | null;
  learn_more_link: string | null;
  image_url: string | null;
  is_active: boolean;
}

const WHATSAPP_LINK = "https://wa.me/1234567890"; // Placeholder - will be updated later

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [software, setSoftware] = useState<Software[]>([]);
  const [loadingSoftware, setLoadingSoftware] = useState(true);

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

  useEffect(() => {
    const fetchSoftware = async () => {
      try {
        const { data, error } = await supabase
          .from("software")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setSoftware(data || []);
      } catch (error) {
        console.error("Failed to load software:", error);
      } finally {
        setLoadingSoftware(false);
      }
    };

    fetchSoftware();
  }, []);

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
      {/* Fixed WhatsApp Button */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
      >
        <MessageCircle className="w-7 h-7 text-white" />
      </a>

      {/* Header with Sign In */}
      <header className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">LeadSpree</span>
        </div>
        <Button onClick={() => navigate("/auth")} variant="outline">
          Sign In
        </Button>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="space-y-8 mb-16">
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

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-24">
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
      </section>

      {/* Software Showcase Section */}
      {software.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Software Products</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover our range of powerful software solutions designed to help you succeed
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {software.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {item.image_url && (
                  <div className="h-48 overflow-hidden bg-muted">
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {item.name}
                    {item.retail_price && (
                      <Badge variant="secondary" className="text-lg">
                        {item.retail_price.toLocaleString()}
                      </Badge>
                    )}
                  </CardTitle>
                  {item.tagline && (
                    <CardDescription className="text-base">{item.tagline}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{item.description}</p>
                  {item.features && item.features.length > 0 && (
                    <ul className="space-y-2">
                      {item.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {item.learn_more_link && (
                    <Button asChild className="w-full" variant="outline">
                      <a href={item.learn_more_link} target="_blank" rel="noopener noreferrer">
                        Learn More <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Reseller Pricing Section */}
      <section className="container mx-auto px-4 py-24 bg-gradient-to-b from-muted/30 to-background">
        <div className="text-center mb-16">
          <Badge className="mb-4" variant="outline">Become a Reseller</Badge>
          <h2 className="text-4xl font-bold mb-4">Partner With LeadSpree</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join our network of successful resellers and unlock exclusive benefits
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-primary overflow-hidden">
            <div className="bg-primary text-primary-foreground p-6 text-center">
              <h3 className="text-2xl font-bold">Reseller Partnership</h3>
              <p className="opacity-90">Everything you need to succeed</p>
            </div>
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Exclusive Pricing</h4>
                      <p className="text-sm text-muted-foreground">Get special reseller discounts on all software products</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">License Management Dashboard</h4>
                      <p className="text-sm text-muted-foreground">Generate and track licenses with our intuitive dashboard</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Priority Support</h4>
                      <p className="text-sm text-muted-foreground">Dedicated support team for all your queries</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Marketing Materials</h4>
                      <p className="text-sm text-muted-foreground">Access to banners, brochures, and promotional content</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Flexible Quotas</h4>
                      <p className="text-sm text-muted-foreground">Scale your license allocations as your business grows</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Real-time Analytics</h4>
                      <p className="text-sm text-muted-foreground">Track your sales and license usage in real-time</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <Button 
                  size="lg" 
                  className="px-12"
                  onClick={() => window.open(WHATSAPP_LINK, "_blank")}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Contact Us on WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold">LeadSpree</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} LeadSpree. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;