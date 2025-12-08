import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, Users, Lock, Check, ExternalLink, MessageCircle, Sparkles, Zap } from "lucide-react";

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

    // Subscribe to realtime updates for software changes
    const channel = supabase
      .channel("software-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "software",
        },
        () => {
          // Refetch software when any change occurs
          fetchSoftware();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Fixed WhatsApp Chat Button */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 right-6 z-50 group"
        aria-label="Chat on WhatsApp"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-green-500 rounded-full blur-lg opacity-40 group-hover:opacity-60 transition-opacity animate-pulse"></div>
          <div className="relative w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
        </div>
        <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-card border shadow-lg rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Chat with us!
        </span>
      </a>

      {/* Header with Sign In */}
      <header className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">LeadSpree</span>
        </div>
        <Button onClick={() => navigate("/auth")} variant="outline" className="shadow-sm">
          Sign In
        </Button>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="space-y-8 mb-16">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary rounded-2xl blur-xl opacity-30 animate-pulse"></div>
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl">
                <Shield className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text">LeadSpree</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional License Management System for Software Resellers
            </p>
          </div>
          <Button size="lg" onClick={() => navigate("/auth")} className="px-8 shadow-lg hover:shadow-xl transition-shadow">
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-24">
          <div className="bg-card border rounded-xl p-6 space-y-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
              <Key className="w-6 h-6 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold">License Generation</h3>
            <p className="text-muted-foreground">
              Generate secure license keys with LS-XX-XXXX-XXXX format. Track buyer information
              and limit licenses per customer.
            </p>
          </div>

          <div className="bg-card border rounded-xl p-6 space-y-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
              <Users className="w-6 h-6 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold">Reseller Management</h3>
            <p className="text-muted-foreground">
              Approve resellers, allocate license quotas, and monitor usage in real-time.
              Complete control over your distribution network.
            </p>
          </div>

          <div className="bg-card border rounded-xl p-6 space-y-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
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
      <section className="py-20 bg-gradient-to-b from-muted/20 to-muted/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Our Products
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Software Products</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover our range of powerful software solutions designed to help you succeed
            </p>
          </div>

          {loadingSoftware ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : software.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {software.map((item, index) => (
                <Card 
                  key={item.id} 
                  className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-card/80 backdrop-blur-sm"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {item.image_url ? (
                    <div className="h-52 overflow-hidden bg-gradient-to-br from-muted to-muted/50 relative">
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  ) : (
                    <div className="h-52 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                        <Zap className="w-10 h-10 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {item.name}
                      </CardTitle>
                      {item.retail_price && (
                        <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 text-base px-3 py-1 shadow-sm">
                          {item.retail_price.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                    {item.tagline && (
                      <CardDescription className="text-base font-medium text-muted-foreground/80">
                        {item.tagline}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {item.description && (
                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    )}
                    {item.features && item.features.length > 0 && (
                      <ul className="space-y-2">
                        {item.features.slice(0, 4).map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                        {item.features.length > 4 && (
                          <li className="text-sm text-primary font-medium pl-7">
                            +{item.features.length - 4} more features
                          </li>
                        )}
                      </ul>
                    )}
                    {item.learn_more_link && (
                      <Button asChild className="w-full mt-4 group/btn" variant="outline">
                        <a href={item.learn_more_link} target="_blank" rel="noopener noreferrer">
                          Learn More 
                          <ExternalLink className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-lg">No products available at the moment</p>
              <p className="text-muted-foreground/60 text-sm mt-1">Check back soon for exciting new software!</p>
            </div>
          )}
        </div>
      </section>

      {/* Reseller Pricing Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" variant="outline">
            Become a Reseller
          </Badge>
          <h2 className="text-4xl font-bold mb-4">Partner With LeadSpree</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join our network of successful resellers and unlock exclusive benefits
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-primary/50 overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 text-center">
              <h3 className="text-2xl font-bold">Reseller Partnership</h3>
              <p className="opacity-90">Everything you need to succeed</p>
            </div>
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Exclusive Pricing</h4>
                      <p className="text-sm text-muted-foreground">Get special reseller discounts on all software products</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold">License Management Dashboard</h4>
                      <p className="text-sm text-muted-foreground">Generate and track licenses with our intuitive dashboard</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Priority Support</h4>
                      <p className="text-sm text-muted-foreground">Dedicated support team for all your queries</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Marketing Materials</h4>
                      <p className="text-sm text-muted-foreground">Access to banners, brochures, and promotional content</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Flexible Quotas</h4>
                      <p className="text-sm text-muted-foreground">Scale your license allocations as your business grows</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
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
                  className="px-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all"
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