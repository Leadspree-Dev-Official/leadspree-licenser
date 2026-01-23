import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Edit, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface License {
  id: string;
  license_key: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  start_date: string | null;
  end_date: string | null;
  amount: number | null;
  pay_mode: string | null;
  issue_date: string | null;
  is_active: boolean;
  created_at: string;
  platform: string | null;
  remarks: string | null;
  account_type: string | null;
  license_type: string | null;
  browser_id: string | null;
  software: { name: string };
  reseller_id: string | null;
  profiles: { full_name: string | null; email: string } | null;
}

const AdminIssuedLicensesPage = () => {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<any>({});
  const [filter, setFilter] = useState<string>("all"); // Keeping for backward compatibility if needed, or remove

  // New Filter States
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [softwareFilter, setSoftwareFilter] = useState<string>("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("all");
  const [licenseTypeFilter, setLicenseTypeFilter] = useState<string>("all");
  const [resellerFilter, setResellerFilter] = useState<string>("all");
  const [nameFilter, setNameFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [softwareList, setSoftwareList] = useState<{ id: string, name: string }[]>([]);
  const [resellerList, setResellerList] = useState<{ id: string, full_name: string | null, email: string }[]>([]);

  useEffect(() => {
    if (user) {
      fetchLicenses();
      fetchFilterData();
    }
  }, [user]);

  const fetchFilterData = async () => {
    const [{ data: softwareData }, { data: resellerData }] = await Promise.all([
      supabase.from("software").select("id, name"),
      supabase.from("profiles").select("id, full_name, email").eq("role", "reseller"),
    ]);
    setSoftwareList(softwareData || []);
    setResellerList(resellerData || []);
  };

  const fetchLicenses = async () => {
    try {
      const { data } = await supabase
        .from("licenses")
        .select(`
          id, 
          license_key, 
          buyer_name, 
          buyer_email, 
          buyer_phone,
          start_date,
          end_date,
          amount,
          pay_mode,
          issue_date,
          is_active,
          created_at,
          platform,
          remarks,
          account_type,
          license_type,
          browser_id,
          software(name),
          reseller_id,
          profiles!reseller_id(full_name, email)
        `)
        .order("created_at", { ascending: false });

      setLicenses(data || []);
    } catch (error) {
      console.error("Error fetching licenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatus = (endDate: string | null) => {
    if (!endDate) return true;
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end >= today;
  };

  const getFilteredLicenses = () => {
    return licenses.filter(license => {
      // Status Filter
      if (statusFilter !== "all") {
        const isActive = statusFilter === "active";
        if (license.is_active !== isActive) return false;
      }

      // Software Filter
      if (softwareFilter !== "all" && license.software?.name !== softwareFilter) return false;

      // Reseller Filter
      if (resellerFilter !== "all") {
        const resellerEmail = license.profiles?.email;
        if (resellerEmail !== resellerFilter) return false;
      }

      // Account Type Filter
      if (accountTypeFilter !== "all") {
        const type = license.account_type || "buyer"; // Default to buyer if null
        if (type !== accountTypeFilter) return false;
      }

      // License Type Filter
      if (licenseTypeFilter !== "all") {
        const type = license.license_type || "Basic"; // Default to Basic if null
        if (type !== licenseTypeFilter) return false;
      }

      // Name Search
      if (nameFilter && !license.buyer_name.toLowerCase().includes(nameFilter.toLowerCase())) return false;

      // Date Range
      if (startDate && new Date(license.created_at) < new Date(startDate)) return false;
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        if (new Date(license.created_at) > endDateTime) return false;
      }

      return true;
    });
  };

  const handleCopyLicense = (licenseKey: string) => {
    navigator.clipboard.writeText(licenseKey);
    toast.success("License key copied to clipboard!");
  };

  const handleEdit = (license: License) => {
    setEditingId(license.id);
    setEditedData(license);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedData({});
  };

  const handleSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from("licenses")
        .update({
          buyer_name: editedData.buyer_name,
          buyer_email: editedData.buyer_email,
          buyer_phone: editedData.buyer_phone,
          start_date: editedData.start_date,
          end_date: editedData.end_date,
          amount: editedData.amount,
          pay_mode: editedData.pay_mode,
          issue_date: editedData.issue_date,
          is_active: editedData.is_active,
          platform: editedData.platform,
          remarks: editedData.remarks,
          account_type: editedData.account_type,
          license_type: editedData.license_type,
          browser_id: editedData.browser_id,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("License updated successfully!");
      setEditingId(null);
      fetchLicenses();
    } catch (error) {
      console.error("Error updating license:", error);
      toast.error("Failed to update license");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this license?")) return;

    try {
      const { error } = await supabase
        .from("licenses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("License deleted successfully!");
      fetchLicenses();
    } catch (error) {
      console.error("Error deleting license:", error);
      toast.error("Failed to delete license");
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
        <h1 className="text-2xl lg:text-3xl font-bold">Licenses Issued</h1>
        <p className="text-muted-foreground">All licenses you've generated</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Licenses</CardTitle>
          <CardDescription>
            Showing {getFilteredLicenses().length} of {licenses.length} licenses
          </CardDescription>
          <div className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
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

              <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Account Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Account Types</SelectItem>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={licenseTypeFilter} onValueChange={setLicenseTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="License Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All License Types</SelectItem>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Pro">Pro</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
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
          </div>
        </CardHeader>
        <CardContent>
          {getFilteredLicenses().length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {licenses.length === 0 ? "No licenses generated yet" : "No licenses match the selected filter"}
            </p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Actions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="whitespace-nowrap">License Key</TableHead>
                      <TableHead className="min-w-[120px]">Software</TableHead>
                      <TableHead className="min-w-[120px]">Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Account Type</TableHead>
                      <TableHead>License Type</TableHead>
                      <TableHead>Extension ID</TableHead>
                      <TableHead className="whitespace-nowrap">Start Date</TableHead>
                      <TableHead className="whitespace-nowrap">End Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Pay Mode</TableHead>
                      <TableHead>Reseller</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredLicenses().map((license) => {
                      const computedStatus = calculateStatus(license.end_date);
                      return (
                        <TableRow key={license.id}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {editingId === license.id ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSave(license.id)}
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(license)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(license.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {editingId === license.id ? (
                              <Select
                                value={editedData.is_active ? "active" : "inactive"}
                                onValueChange={(value) =>
                                  setEditedData({ ...editedData, is_active: value === "active" })
                                }
                              >
                                <SelectTrigger className="w-[110px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant={computedStatus ? "default" : "secondary"}>
                                {computedStatus ? "Active" : "Inactive"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span className="font-mono text-sm">{license.license_key}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyLicense(license.license_key)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="whitespace-nowrap">{license.software.name}</span>
                          </TableCell>
                          <TableCell>
                            {editingId === license.id ? (
                              <Input
                                value={editedData.buyer_name}
                                onChange={(e) =>
                                  setEditedData({ ...editedData, buyer_name: e.target.value })
                                }
                              />
                            ) : (
                              <span className="whitespace-nowrap">{license.buyer_name}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {editingId === license.id ? (
                              <Input
                                value={editedData.buyer_email || ""}
                                onChange={(e) =>
                                  setEditedData({ ...editedData, buyer_email: e.target.value })
                                }
                              />
                            ) : (
                              license.buyer_email
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {editingId === license.id ? (
                              <Input
                                value={editedData.buyer_phone || ""}
                                onChange={(e) =>
                                  setEditedData({ ...editedData, buyer_phone: e.target.value })
                                }
                              />
                            ) : (
                              license.buyer_phone
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {editingId === license.id ? (
                              <Input
                                value={editedData.platform || ""}
                                onChange={(e) =>
                                  setEditedData({ ...editedData, platform: e.target.value })
                                }
                              />
                            ) : (
                              license.platform || "-"
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {editingId === license.id ? (
                              <Select
                                value={editedData.account_type || "buyer"}
                                onValueChange={(value) =>
                                  setEditedData({ ...editedData, account_type: value })
                                }
                              >
                                <SelectTrigger className="w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="buyer">Buyer</SelectItem>
                                  <SelectItem value="demo">Demo</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant={license.account_type === "demo" ? "secondary" : "outline"}>
                                {license.account_type === "demo" ? "Demo" : "Buyer"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {editingId === license.id ? (
                              <Select
                                value={editedData.license_type || "Basic"}
                                onValueChange={(value) =>
                                  setEditedData({ ...editedData, license_type: value })
                                }
                              >
                                <SelectTrigger className="w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Basic">Basic</SelectItem>
                                  <SelectItem value="Pro">Pro</SelectItem>
                                  <SelectItem value="Premium">Premium</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="outline" className="bg-primary/5">
                                {license.license_type || "Basic"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {editingId === license.id ? (
                              <Input
                                value={editedData.browser_id || ""}
                                onChange={(e) =>
                                  setEditedData({ ...editedData, browser_id: e.target.value })
                                }
                                placeholder="Extension ID"
                              />
                            ) : (
                              <span className="font-mono text-xs">{license.browser_id ? license.browser_id.substring(0, 8) + '...' : '-'}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {editingId === license.id ? (
                              <Input
                                type="date"
                                value={editedData.start_date || ""}
                                onChange={(e) =>
                                  setEditedData({ ...editedData, start_date: e.target.value })
                                }
                              />
                            ) : (
                              license.start_date ? new Date(license.start_date).toLocaleDateString() : "-"
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {editingId === license.id ? (
                              <Input
                                type="date"
                                value={editedData.end_date || ""}
                                onChange={(e) =>
                                  setEditedData({ ...editedData, end_date: e.target.value })
                                }
                              />
                            ) : (
                              license.end_date ? new Date(license.end_date).toLocaleDateString() : "-"
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {editingId === license.id ? (
                              <Input
                                type="number"
                                value={editedData.amount || ""}
                                onChange={(e) =>
                                  setEditedData({ ...editedData, amount: parseFloat(e.target.value) })
                                }
                              />
                            ) : (
                              license.amount ? license.amount.toLocaleString() : "-"
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {editingId === license.id ? (
                              <Select
                                value={editedData.pay_mode || ""}
                                onValueChange={(value) =>
                                  setEditedData({ ...editedData, pay_mode: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="UPI">UPI</SelectItem>
                                  <SelectItem value="Bank">Bank</SelectItem>
                                  <SelectItem value="Cash">Cash</SelectItem>
                                  <SelectItem value="Crypto">Crypto</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              license.pay_mode || "-"
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {license.profiles?.full_name || license.profiles?.email || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {editingId === license.id ? (
                              <Input
                                value={editedData.remarks || ""}
                                onChange={(e) =>
                                  setEditedData({ ...editedData, remarks: e.target.value })
                                }
                              />
                            ) : (
                              license.remarks || "-"
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {new Date(license.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminIssuedLicensesPage;