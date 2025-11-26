import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Key, Copy, Edit, Save, Trash2, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Allocation {
  id: string;
  software_id: string;
  license_limit: number;
  licenses_used: number;
  software: { name: string };
}

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
}

const LicenseGeneration = () => {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [recentLicenses, setRecentLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<License>>({});
  const [formData, setFormData] = useState({
    software_id: "",
    buyer_name: "",
    buyer_email: "",
    buyer_phone: "",
    start_date: "",
    end_date: "",
    amount: "",
    pay_mode: "",
    issue_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (user) {
      fetchAllocations();
      fetchRecentLicenses();
    }
  }, [user]);

  const fetchAllocations = async () => {
    try {
      const { data, error } = await supabase
        .from("reseller_allocations")
        .select("*, software(name)")
        .eq("reseller_id", user!.id);

      if (error) throw error;
      setAllocations(data || []);
    } catch (error: any) {
      toast.error("Failed to load allocations");
    }
  };

  const fetchRecentLicenses = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
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
          software(name)
        `)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentLicenses(data || []);
    } catch (error: any) {
      console.error("Failed to load recent licenses:", error);
    }
  };

  const generateLicenseKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const segments = [2, 4, 4]; // LS-XX-XXXX-XXXX
    const key = segments
      .map((length) =>
        Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
      )
      .join("-");
    return `LS-${key}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if reseller has remaining quota
      const allocation = allocations.find((a) => a.software_id === formData.software_id);
      if (!allocation) {
        toast.error("No allocation found for this software");
        setLoading(false);
        return;
      }

      if (allocation.licenses_used >= allocation.license_limit) {
        toast.error("You have reached your license limit for this software");
        setLoading(false);
        return;
      }

      // Calculate is_active based on end_date
      let isActive = true;
      if (formData.end_date) {
        const endDate = new Date(formData.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        isActive = endDate >= today;
      }

      // Generate license
      const licenseKey = generateLicenseKey();
      const { error: insertError } = await supabase.from("licenses").insert([
        {
          license_key: licenseKey,
          software_id: formData.software_id,
          buyer_name: formData.buyer_name,
          buyer_email: formData.buyer_email || null,
          buyer_phone: formData.buyer_phone || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          pay_mode: formData.pay_mode || null,
          reseller_id: user!.id,
          issue_date: formData.issue_date || null,
          is_active: isActive,
          created_by: user!.id,
        },
      ]);

      if (insertError) throw insertError;

      // Update allocation usage count
      const { error: updateError } = await supabase
        .from("reseller_allocations")
        .update({ licenses_used: allocation.licenses_used + 1 })
        .eq("id", allocation.id);

      if (updateError) throw updateError;

      toast.success(`License generated successfully: ${licenseKey}`);

      // Reset form
      setFormData({
        software_id: "",
        buyer_name: "",
        buyer_email: "",
        buyer_phone: "",
        start_date: "",
        end_date: "",
        amount: "",
        pay_mode: "",
        issue_date: new Date().toISOString().split('T')[0],
      });

      fetchAllocations();
      fetchRecentLicenses();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate license");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLicense = (licenseKey: string) => {
    navigator.clipboard.writeText(licenseKey);
    toast.success("License key copied to clipboard");
  };

  const handleEdit = (license: License) => {
    setEditingId(license.id);
    setEditedData(license);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedData({});
  };

  const handleSave = async (licenseId: string) => {
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
          is_active: editedData.end_date 
            ? new Date(editedData.end_date) >= new Date(new Date().setHours(0, 0, 0, 0))
            : true,
        })
        .eq("id", licenseId);

      if (error) throw error;

      toast.success("License updated successfully");
      setEditingId(null);
      setEditedData({});
      fetchRecentLicenses();
    } catch (error: any) {
      toast.error(error.message || "Failed to update license");
    }
  };

  const handleDelete = async (licenseId: string) => {
    if (!confirm("Are you sure you want to delete this license?")) return;

    try {
      const { error } = await supabase
        .from("licenses")
        .delete()
        .eq("id", licenseId);

      if (error) throw error;

      toast.success("License deleted successfully");
      fetchRecentLicenses();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete license");
    }
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          <CardTitle>Generate License</CardTitle>
        </div>
        <CardDescription>Create a new license key for your customer</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="software">Software *</Label>
            <Select
              value={formData.software_id}
              onValueChange={(value) => setFormData({ ...formData, software_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select software" />
              </SelectTrigger>
              <SelectContent>
                {allocations.map((allocation) => (
                  <SelectItem
                    key={allocation.id}
                    value={allocation.software_id}
                    disabled={allocation.licenses_used >= allocation.license_limit}
                  >
                    {allocation.software.name} ({allocation.license_limit - allocation.licenses_used}{" "}
                    remaining)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buyer_name">Name *</Label>
              <Input
                id="buyer_name"
                value={formData.buyer_name}
                onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyer_email">Email</Label>
              <Input
                id="buyer_email"
                type="email"
                value={formData.buyer_email}
                onChange={(e) => setFormData({ ...formData, buyer_email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buyer_phone">Phone</Label>
              <Input
                id="buyer_phone"
                type="tel"
                value={formData.buyer_phone}
                onChange={(e) => setFormData({ ...formData, buyer_phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue_date">Issue Date</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay_mode">Pay Mode</Label>
              <Select
                value={formData.pay_mode}
                onValueChange={(value) => setFormData({ ...formData, pay_mode: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Generating..." : "Generate License Key"}
          </Button>
        </form>
      </CardContent>
    </Card>

    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Recent Licenses</CardTitle>
        <CardDescription>Your latest generated licenses</CardDescription>
      </CardHeader>
      <CardContent>
        {recentLicenses.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No licenses generated yet</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Actions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="whitespace-nowrap">License Key</TableHead>
                  <TableHead>Software</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="whitespace-nowrap">Start Date</TableHead>
                  <TableHead className="whitespace-nowrap">End Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="whitespace-nowrap">Pay Mode</TableHead>
                  <TableHead className="whitespace-nowrap">Issue Date</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLicenses.map((license) => {
                  const isEditing = editingId === license.id;
                  return (
                    <TableRow key={license.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSave(license.id)}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(license)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(license.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
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
                          <Badge variant={license.is_active ? "default" : "secondary"}>
                            {license.is_active ? "Active" : "Inactive"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm whitespace-nowrap">{license.license_key}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyLicense(license.license_key)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{license.software.name}</Badge>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editedData.buyer_name || ""}
                            onChange={(e) =>
                              setEditedData({ ...editedData, buyer_name: e.target.value })
                            }
                            className="w-full"
                          />
                        ) : (
                          license.buyer_name
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {isEditing ? (
                          <Input
                            type="email"
                            value={editedData.buyer_email || ""}
                            onChange={(e) =>
                              setEditedData({ ...editedData, buyer_email: e.target.value })
                            }
                            className="w-full"
                          />
                        ) : (
                          license.buyer_email || "-"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {isEditing ? (
                          <Input
                            type="tel"
                            value={editedData.buyer_phone || ""}
                            onChange={(e) =>
                              setEditedData({ ...editedData, buyer_phone: e.target.value })
                            }
                            className="w-full"
                          />
                        ) : (
                          license.buyer_phone || "-"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editedData.start_date || ""}
                            onChange={(e) =>
                              setEditedData({ ...editedData, start_date: e.target.value })
                            }
                            className="w-full"
                          />
                        ) : license.start_date ? (
                          new Date(license.start_date).toLocaleDateString()
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editedData.end_date || ""}
                            onChange={(e) =>
                              setEditedData({ ...editedData, end_date: e.target.value })
                            }
                            className="w-full"
                          />
                        ) : license.end_date ? (
                          new Date(license.end_date).toLocaleDateString()
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editedData.amount || ""}
                            onChange={(e) =>
                              setEditedData({ ...editedData, amount: parseFloat(e.target.value) })
                            }
                            className="w-full"
                          />
                        ) : license.amount ? (
                          `₹${license.amount.toFixed(2)}`
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {isEditing ? (
                          <Select
                            value={editedData.pay_mode || ""}
                            onValueChange={(value) =>
                              setEditedData({ ...editedData, pay_mode: value })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select" />
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
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editedData.issue_date || ""}
                            onChange={(e) =>
                              setEditedData({ ...editedData, issue_date: e.target.value })
                            }
                            className="w-full"
                          />
                        ) : license.issue_date ? (
                          new Date(license.issue_date).toLocaleDateString()
                        ) : (
                          "-"
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
        )}
      </CardContent>
    </Card>
  </>
  );
};

export default LicenseGeneration;
