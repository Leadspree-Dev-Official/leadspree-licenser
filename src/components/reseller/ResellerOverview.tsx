import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Package, Key, Download } from "lucide-react";

interface Allocation {
  id: string;
  license_limit: number;
  licenses_used: number;
  software_id: string;
  software: { name: string; type: string; version: string; download_url: string | null };
}

interface License {
  id: string;
  license_key: string;
  buyer_name: string;
  buyer_email: string;
  created_at: string;
  software: { name: string };
}

const ResellerOverview = () => {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [allocationsRes, licensesRes] = await Promise.all([
        supabase
          .from("reseller_allocations")
          .select("*, software(name, type, version, download_url)")
          .eq("reseller_id", user!.id),
        supabase
          .from("licenses")
          .select("*, software(name)")
          .eq("created_by", user!.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (allocationsRes.error) throw allocationsRes.error;
      if (licensesRes.error) throw licensesRes.error;

      const baseAllocations = allocationsRes.data || [];

      // Enrich allocations with up-to-date usage counts from licenses table
      const allocationsWithUsage = await Promise.all(
        baseAllocations.map(async (allocation: any) => {
          const { count, error: usageError } = await supabase
            .from("licenses")
            .select("*", { count: "exact", head: true })
            .eq("created_by", user!.id)
            .eq("software_id", allocation.software_id);

          if (usageError) {
            console.error("Failed to load allocation usage", usageError);
            return allocation;
          }

          return {
            ...allocation,
            licenses_used: count ?? 0,
          };
        })
      );

      setAllocations(allocationsWithUsage);
      setLicenses(licensesRes.data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocations</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allocations.length}</div>
            <p className="text-xs text-muted-foreground">Active software products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Licenses Generated</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{licenses.length}</div>
            <p className="text-xs text-muted-foreground">Total licenses created</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Software Allocations</CardTitle>
          <CardDescription>Your available license quotas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Software</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((allocation) => {
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
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Licenses</CardTitle>
          <CardDescription>Your latest generated licenses</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>License Key</TableHead>
                <TableHead>Software</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenses.map((license) => (
                <TableRow key={license.id}>
                  <TableCell className="font-mono text-sm">{license.license_key}</TableCell>
                  <TableCell>{license.software.name}</TableCell>
                  <TableCell>{license.buyer_name}</TableCell>
                  <TableCell>{license.buyer_email}</TableCell>
                  <TableCell>{new Date(license.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerOverview;