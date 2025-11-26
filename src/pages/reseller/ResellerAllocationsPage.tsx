import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Allocation {
  id: string;
  software: { name: string; type: string; version: string };
  license_limit: number;
  licenses_used: number;
}

const ResellerAllocationsPage = () => {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAllocations();
    }
  }, [user]);

  const fetchAllocations = async () => {
    try {
      const { data } = await supabase
        .from("reseller_allocations")
        .select("id, software(name, type, version), license_limit, licenses_used")
        .eq("reseller_id", user!.id);

      setAllocations(data || []);
    } catch (error) {
      console.error("Error fetching allocations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold">Software Allocation</h1>
        <p className="text-muted-foreground">Your assigned license quotas per software</p>
      </div>

      {allocations.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">No allocations assigned yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allocations.map((allocation) => (
            <Card key={allocation.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{allocation.software.name}</span>
                  <Badge variant={allocation.licenses_used >= allocation.license_limit ? "destructive" : "default"}>
                    {allocation.license_limit - allocation.licenses_used} left
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {allocation.software.type} • Version {allocation.software.version}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Used</span>
                    <span className="font-medium">{allocation.licenses_used}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Limit</span>
                    <span className="font-medium">{allocation.license_limit}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min((allocation.licenses_used / allocation.license_limit) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResellerAllocationsPage;
