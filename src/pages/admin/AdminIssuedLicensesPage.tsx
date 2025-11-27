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

  useEffect(() => {
    if (user) {
      fetchLicenses();
    }
  }, [user]);

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
      const updatedIsActive = editedData.end_date 
        ? calculateStatus(editedData.end_date)
        : true;

      const { error } = await supabase
        .from("licenses")
        .update({
          ...editedData,
          is_active: updatedIsActive,
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
          <CardDescription>Total: {licenses.length} licenses</CardDescription>
        </CardHeader>
        <CardContent>
          {licenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No licenses generated yet</p>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px] sticky left-0 bg-background z-10">Actions</TableHead>
                      <TableHead className="sticky left-[100px] bg-background z-10">Status</TableHead>
                      <TableHead className="whitespace-nowrap">License Key</TableHead>
                      <TableHead>Software</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="whitespace-nowrap">Start Date</TableHead>
                      <TableHead className="whitespace-nowrap">End Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="whitespace-nowrap">Pay Mode</TableHead>
                      <TableHead>Reseller</TableHead>
                      <TableHead className="whitespace-nowrap">Issue Date</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licenses.map((license) => {
                      const computedStatus = calculateStatus(license.end_date);
                      return (
                        <TableRow key={license.id}>
                          <TableCell className="sticky left-0 bg-background">
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
                          <TableCell className="sticky left-[100px] bg-background">
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
                            <Badge variant="outline">{license.software.name}</Badge>
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
                              license.buyer_name
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
                              license.amount ? `$${license.amount}` : "-"
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
                                </SelectContent>
                              </Select>
                            ) : (
                              license.pay_mode || "-"
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {license.profiles?.full_name || license.profiles?.email || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {editingId === license.id ? (
                              <Input
                                type="date"
                                value={editedData.issue_date || ""}
                                onChange={(e) =>
                                  setEditedData({ ...editedData, issue_date: e.target.value })
                                }
                              />
                            ) : (
                              license.issue_date ? new Date(license.issue_date).toLocaleDateString() : "-"
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
