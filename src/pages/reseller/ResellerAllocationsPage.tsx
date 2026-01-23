import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download } from "lucide-react";

interface Allocation {
  id: string;
  software: { name: string; type: string; version: string; download_url: string | null };
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
      const { data, error } = await supabase
        .from("reseller_allocations")
        .select("id, software(name, type, version, download_url), license_limit, licenses_used, software_id")
        .eq("reseller_id", user!.id);

      if (error) throw error;

      const baseAllocations = data || [];

      // Enrich allocations with up-to-date usage counts from licenses table
      const allocationsWithUsage = await Promise.all(
        baseAllocations.map(async (allocation: any) => {
          const { count, error: usageError } = await supabase
            .from("licenses")
            .select("*", { count: "exact", head: true })
            .eq("reseller_id", user!.id)
            .eq("software_id", allocation.software_id);

          if (usageError) {
            console.error("Failed to load allocation usage", usageError);
            return allocation;
          }

          return {
            ...allocation,
            licenses_used: count ?? allocation.licenses_used ?? 0,
          };
        })
      );

      setAllocations(allocationsWithUsage);
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
          <div className="h-64 bg-muted rounded"></div>
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Software</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="w-[300px]">Usage</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No allocations assigned yet
                  </TableCell>
                </TableRow>
              ) : (
                allocations.map((allocation) => {
                  const percentage =
                    (allocation.licenses_used / allocation.license_limit) * 100;
                  const remaining = allocation.license_limit - allocation.licenses_used;

                  return (
                    <TableRow key={allocation.id}>
                      <TableCell className="font-medium">{allocation.software.name}</TableCell>
                      <TableCell>{allocation.software.type}</TableCell>
                      <TableCell>{allocation.software.version}</TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>
                              {allocation.licenses_used} / {allocation.license_limit}
                            </span>
                            <span>{percentage.toFixed(0)}%</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{remaining}</span>
                      </TableCell>
                      <TableCell>
                        {allocation.software.download_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(allocation.software.download_url!, '_blank')}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerAllocationsPage;
