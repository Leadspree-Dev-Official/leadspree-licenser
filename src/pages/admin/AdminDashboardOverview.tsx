import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Package, FileKey, DollarSign, Calendar, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";

interface Stats {
  totalUsers: number;
  totalResellers: number;
  totalSoftware: number;
  totalLicenses: number;
  totalApprovedLicenses: number;
  expiredThisMonth: number;
  expiringThisMonth: number;
  totalAmount: number;
  currentMonthAmount: number;
  currentYearAmount: number;
  previousYearAmount: number;
}

interface License {
  id: string;
  license_key: string;
  buyer_name: string;
  buyer_email: string;
  created_at: string;
  amount: number | null;
  is_active: boolean;
  end_date: string | null;
  software: { name: string };
  reseller: { full_name: string | null; email: string } | null;
}

interface Software {
  id: string;
  name: string;
}

interface Reseller {
  id: string;
  full_name: string | null;
  email: string;
}

const AdminDashboardOverview = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalResellers: 0,
    totalSoftware: 0,
    totalLicenses: 0,
    totalApprovedLicenses: 0,
    expiredThisMonth: 0,
    expiringThisMonth: 0,
    totalAmount: 0,
    currentMonthAmount: 0,
    currentYearAmount: 0,
    previousYearAmount: 0,
  });
  const [allLicenses, setAllLicenses] = useState<License[]>([]);
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [resellerList, setResellerList] = useState<Reseller[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [softwareFilter, setSoftwareFilter] = useState<string>("all");
  const [resellerFilter, setResellerFilter] = useState<string>("all");
  const [nameFilter, setNameFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString();
      const firstDayOfYear = new Date(currentYear, 0, 1).toISOString();
      const firstDayOfPrevYear = new Date(currentYear - 1, 0, 1).toISOString();
      const lastDayOfPrevYear = new Date(currentYear - 1, 11, 31).toISOString();

      // Fetch counts
      const [usersRes, resellersRes, softwareRes, licensesRes, approvedRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "reseller"),
        supabase.from("software").select("*", { count: "exact", head: true }),
        supabase.from("licenses").select("*", { count: "exact", head: true }),
        supabase.from("licenses").select("*", { count: "exact", head: true }).eq("is_active", true),
      ]);

      // Fetch all licenses for calculations
      const { data: allLicenseData } = await supabase
        .from("licenses")
        .select("id, license_key, buyer_name, buyer_email, created_at, amount, is_active, end_date, software(name), reseller:profiles!licenses_reseller_id_fkey(full_name, email)")
        .order("created_at", { ascending: false });

      // Fetch software and resellers for filters
      const [{ data: softwareData }, { data: resellerData }] = await Promise.all([
        supabase.from("software").select("id, name"),
        supabase.from("profiles").select("id, full_name, email").eq("role", "reseller"),
      ]);

      setSoftwareList(softwareData || []);
      setResellerList(resellerData || []);
      setAllLicenses(allLicenseData || []);

      // Calculate amounts
      const licenses = allLicenseData || [];
      const totalAmount = licenses.reduce((sum, l) => sum + (l.amount || 0), 0);
      const currentMonthAmount = licenses
        .filter(l => new Date(l.created_at) >= new Date(firstDayOfMonth))
        .reduce((sum, l) => sum + (l.amount || 0), 0);
      const currentYearAmount = licenses
        .filter(l => new Date(l.created_at) >= new Date(firstDayOfYear))
        .reduce((sum, l) => sum + (l.amount || 0), 0);
      const previousYearAmount = licenses
        .filter(l => {
          const date = new Date(l.created_at);
          return date >= new Date(firstDayOfPrevYear) && date <= new Date(lastDayOfPrevYear);
        })
        .reduce((sum, l) => sum + (l.amount || 0), 0);

      // Calculate expired and expiring
      const expiredThisMonth = licenses.filter(l => {
        if (!l.end_date) return false;
        const endDate = new Date(l.end_date);
        return endDate < now && endDate >= new Date(firstDayOfMonth);
      }).length;

      const expiringThisMonth = licenses.filter(l => {
        if (!l.end_date) return false;
        const endDate = new Date(l.end_date);
        return endDate >= now && endDate <= new Date(lastDayOfMonth);
      }).length;

      setStats({
        totalUsers: usersRes.count || 0,
        totalResellers: resellersRes.count || 0,
        totalSoftware: softwareRes.count || 0,
        totalLicenses: licensesRes.count || 0,
        totalApprovedLicenses: approvedRes.count || 0,
        expiredThisMonth,
        expiringThisMonth,
        totalAmount,
        currentMonthAmount,
        currentYearAmount,
        previousYearAmount,
      });

      // Calculate monthly data for current year
      const monthlyStats = Array.from({ length: 12 }, (_, i) => {
        const monthStart = new Date(currentYear, i, 1);
        const monthEnd = new Date(currentYear, i + 1, 0);
        const monthLicenses = licenses.filter(l => {
          const date = new Date(l.created_at);
          return date >= monthStart && date <= monthEnd;
        });
        return {
          month: monthStart.toLocaleString('default', { month: 'short' }),
          amount: monthLicenses.reduce((sum, l) => sum + (l.amount || 0), 0),
          count: monthLicenses.length,
        };
      });
      setMonthlyData(monthlyStats);

      // Calculate yearly data
      const years = [currentYear - 2, currentYear - 1, currentYear];
      const yearlyStats = years.map(year => {
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        const yearLicenses = licenses.filter(l => {
          const date = new Date(l.created_at);
          return date >= yearStart && date <= yearEnd;
        });
        return {
          year: year.toString(),
          amount: yearLicenses.reduce((sum, l) => sum + (l.amount || 0), 0),
          count: yearLicenses.length,
        };
      });
      setYearlyData(yearlyStats);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLicenses = useMemo(() => {
    return allLicenses.filter(license => {
      if (statusFilter !== "all") {
        const isActive = statusFilter === "active";
        if (license.is_active !== isActive) return false;
      }
      if (softwareFilter !== "all" && license.software?.name !== softwareFilter) return false;
      if (resellerFilter !== "all" && license.reseller?.email !== resellerFilter) return false;
      if (nameFilter && !license.buyer_name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
      if (startDate && new Date(license.created_at) < new Date(startDate)) return false;
      if (endDate && new Date(license.created_at) > new Date(endDate)) return false;
      return true;
    }).slice(0, 20);
  }, [allLicenses, statusFilter, softwareFilter, resellerFilter, nameFilter, startDate, endDate]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const chartConfig = {
    amount: { label: "Amount", color: "hsl(var(--primary))" },
    count: { label: "Licenses", color: "hsl(var(--secondary))" },
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's an overview of your system.</p>
      </div>

      {/* Big Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Resellers</CardTitle>
            <Users className="w-5 h-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold">{stats.totalResellers}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="w-5 h-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold">{stats.totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="w-5 h-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold">{stats.currentMonthAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 border-teal-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Year</CardTitle>
            <TrendingUp className="w-5 h-5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl lg:text-3xl font-bold">{stats.currentYearAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Small Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Software Products</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalSoftware}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Licenses</CardTitle>
            <FileKey className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalLicenses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Approved Licenses</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalApprovedLicenses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Expired This Month</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-500">{stats.expiredThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Expiring This Month</CardTitle>
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-yellow-500">{stats.expiringThisMonth}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Income ({new Date().getFullYear()})</CardTitle>
            <CardDescription>Month-on-month revenue breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yearly Income Comparison</CardTitle>
            <CardDescription>Year-on-year revenue trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="amount" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Licenses with Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Licenses</CardTitle>
          <CardDescription>Latest generated licenses with filters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={softwareFilter} onValueChange={setSoftwareFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Software" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Software</SelectItem>
                {softwareList.map(s => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resellerFilter} onValueChange={setResellerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Reseller" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resellers</SelectItem>
                {resellerList.map(r => (
                  <SelectItem key={r.id} value={r.email}>{r.full_name || r.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Search by name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />

            <Input
              type="date"
              placeholder="Start date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <Input
              type="date"
              placeholder="End date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {filteredLicenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No licenses found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>License Key</TableHead>
                    <TableHead>Software</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Reseller</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLicenses.map((license) => (
                    <TableRow key={license.id}>
                      <TableCell className="font-mono text-sm">{license.license_key}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{license.software?.name}</Badge>
                      </TableCell>
                      <TableCell>{license.buyer_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {license.reseller?.full_name || license.reseller?.email || "Admin"}
                      </TableCell>
                      <TableCell>{(license.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={license.is_active ? "default" : "destructive"}>
                          {license.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(license.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardOverview;
