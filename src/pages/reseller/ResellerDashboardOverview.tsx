import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileKey, Package } from "lucide-react";

interface Allocation {
  software: { name: string };
  license_limit: number;
  licenses_used: number;
}

interface License {
  id: string;
  license_key: string;
  buyer_name: string;
  buyer_email: string;
  created_at: string;
  software: { name: string };
}

const ResellerDashboardOverview = () => {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [recentLicenses, setRecentLicenses] = useState<License[]>([]);
  const [totalLicenses, setTotalLicenses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch allocations
      const { data: allocData } = await supabase
        .from("reseller_allocations")
        .select("software(name), license_limit, licenses_used")
        .eq("reseller_id", user!.id);

      setAllocations(allocData || []);

      // Fetch recent licenses
      const { data: licenses } = await supabase
        .from("licenses")
        .select("id, license_key, buyer_name, buyer_email, created_at, software(name)")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentLicenses(licenses || []);

      // Get total license count
      const { count } = await supabase
        .from("licenses")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user!.id);

      setTotalLicenses(count || 0);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalLimit = allocations.reduce((sum, a) => sum + a.license_limit, 0);
  const totalUsed = allocations.reduce((sum, a) => sum + a.licenses_used, 0);

  return (
    <div className="p-4 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Reseller Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your license overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Licenses Generated</CardTitle>
            <FileKey className="w-5 h-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalLicenses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalUsed} of {totalLimit} allocated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Software Allocations</CardTitle>
            <Package className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{allocations.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active products</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Allocations</CardTitle>
          <CardDescription>License limits per software product</CardDescription>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No allocations assigned yet</p>
          ) : (
            <div className="space-y-3">
              {allocations.map((allocation, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{allocation.software.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {allocation.licenses_used} / {allocation.license_limit} licenses used
                    </p>
                  </div>
                  <Badge variant={allocation.licenses_used >= allocation.license_limit ? "destructive" : "default"}>
                    {allocation.license_limit - allocation.licenses_used} remaining
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Licenses</CardTitle>
          <CardDescription>Your latest generated licenses</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLicenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No licenses generated yet</p>
          ) : (
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
                {recentLicenses.map((license) => (
                  <TableRow key={license.id}>
                    <TableCell className="font-mono text-sm">{license.license_key}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{license.software.name}</Badge>
                    </TableCell>
                    <TableCell>{license.buyer_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{license.buyer_email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(license.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerDashboardOverview;
