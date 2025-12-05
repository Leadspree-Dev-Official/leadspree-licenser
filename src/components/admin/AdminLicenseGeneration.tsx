import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Key } from "lucide-react";

interface Software {
  id: string;
  name: string;
  type: string;
  version: string;
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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    software_id: "",
    buyer_name: "",
    buyer_email: "",
    buyer_phone: "",
    platform: "",
    account_type: "buyer",
    start_date: "",
    end_date: "",
    amount: "",
    pay_mode: "",
    reseller_id: "",
    remarks: "",
  });

  useEffect(() => {
    fetchSoftware();
    fetchProfiles();
  }, []);

  // Auto-set dates for demo account
  useEffect(() => {
    if (formData.account_type === "demo") {
      const today = new Date().toISOString().split("T")[0];
      setFormData((prev) => ({
        ...prev,
        start_date: today,
        end_date: today,
        amount: "",
        pay_mode: "",
      }));
    }
  }, [formData.account_type]);

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
          platform: formData.platform || null,
          account_type: formData.account_type,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          amount: formData.account_type === "demo" ? null : (formData.amount ? parseFloat(formData.amount) : null),
          pay_mode: formData.account_type === "demo" ? null : (formData.pay_mode || null),
          reseller_id: formData.reseller_id || null,
          remarks: formData.remarks || null,
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
        platform: "",
        account_type: "buyer",
        start_date: "",
        end_date: "",
        amount: "",
        pay_mode: "",
        reseller_id: "",
        remarks: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to generate license");
    } finally {
      setLoading(false);
    }
  };

  const isDemo = formData.account_type === "demo";

  return (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_type">Account Type *</Label>
              <Select
                value={formData.account_type}
                onValueChange={(value) => setFormData({ ...formData, account_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer A/c</SelectItem>
                  <SelectItem value="demo">Demo A/c</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              <Label htmlFor="platform">Platform</Label>
              <Input
                id="platform"
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                placeholder="e.g., Windows, Mac, Linux"
              />
            </div>
          </div>

          {!isDemo && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
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
                      <SelectItem value="Crypto">Crypto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {isDemo && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Demo account: Start and End dates are automatically set to today's date.
              </p>
            </div>
          )}

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

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Generating..." : "Generate License Key"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminLicenseGeneration;