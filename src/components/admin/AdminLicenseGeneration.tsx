import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Key, Copy, Edit, Save, Trash2 } from "lucide-react";

interface Software {
  id: string;
  name: string;
  type: string;
  version: string;
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
  reseller_id: string | null;
  profiles: { full_name: string | null; email: string } | null;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

const AdminLicenseGeneration = () => {
  const { user } = useAuth();
  const [software, setSoftware] = useState<Software[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
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
    reseller_id: "",
    issue_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchSoftware();
    fetchProfiles();
    fetchRecentLicenses();
  }, []);

  const fetchSoftware = async () => {
    try {
      const { data, error } = await supabase
        .from("software")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setSoftware(data || []);
    } catch (error: any) {
      toast.error("Failed to load software");
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("status", "active")
        .order("full_name");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast.error("Failed to load users");
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
          software(name),
          reseller_id,
          profiles!reseller_id(full_name, email)
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
      // Calculate is_active based on end_date
      let isActive = true;
      if (formData.end_date) {
        const endDate = new Date(formData.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        isActive = endDate >= today;
      }

      // Generate license (no quota check for admins - unlimited)
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
          reseller_id: formData.reseller_id || null,
          issue_date: formData.issue_date || null,
          is_active: isActive,
          created_by: user!.id,
        },
      ]);

      if (insertError) throw insertError;

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
        reseller_id: "",
        issue_date: new Date().toISOString().split('T')[0],
      });

      // Refresh recent licenses
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            <CardTitle>Generate License (Unlimited)</CardTitle>
          </div>
          <CardDescription>Create license keys for any software without quota restrictions</CardDescription>
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
                  {software.map((sw) => (
                    <SelectItem key={sw.id} value={sw.id}>
                      {sw.name} - {sw.type} v{sw.version}
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

            <div className="space-y-2">
              <Label htmlFor="reseller">Reseller</Label>
              <Select
                value={formData.reseller_id}
                onValueChange={(value) => setFormData({ ...formData, reseller_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reseller or admin" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email} ({profile.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Generating..." : "Generate License Key"}
            </Button>
          </form>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>License Key</TableHead>
                    <TableHead>Software</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Pay Mode</TableHead>
                    <TableHead>Reseller</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLicenses.map((license) => {
                    const isEditing = editingId === license.id;
                    return (
                      <TableRow key={license.id}>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-2">
                            {license.license_key}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyLicense(license.license_key)}
                            >
                              <Copy className="w-4 h-4" />
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
                        <TableCell className="text-muted-foreground text-sm">
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
                        <TableCell className="text-muted-foreground text-sm">
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
                        <TableCell>
                          <Badge variant={license.is_active ? "default" : "secondary"}>
                            {license.is_active ? "Active" : "Inactive"}
                          </Badge>
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
                        <TableCell className="text-muted-foreground text-sm">
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
                        <TableCell className="text-muted-foreground text-sm">
                          {license.profiles ? (license.profiles.full_name || license.profiles.email) : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
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
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(license.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
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
                                  Cancel
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLicenseGeneration;
