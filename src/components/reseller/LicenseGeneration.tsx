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
import { validateLicenseForm } from "@/lib/validation";

interface Allocation {
  id: string;
  software_id: string;
  license_limit: number;
  licenses_used: number;
  software: { name: string };
}

const LicenseGeneration = () => {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    remarks: "",
  });

  useEffect(() => {
    if (user) {
      fetchAllocations();
    }
  }, [user]);

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

  const fetchAllocations = async () => {
    try {
      const { data, error } = await supabase
        .from("reseller_allocations")
        .select("*, software(name), software_id, license_limit, licenses_used")
        .eq("reseller_id", user!.id);

      if (error) throw error;

      const baseAllocations = data || [];

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
            licenses_used: count ?? allocation.licenses_used ?? 0,
          };
        })
      );

      setAllocations(allocationsWithUsage);
    } catch (error: any) {
      toast.error("Failed to load allocations");
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
    setErrors({});

    // Validate form data
    const validation = validateLicenseForm(formData);
    if (!validation.success) {
      setErrors(validation.errors || {});
      toast.error("Please fix the validation errors");
      return;
    }

    setLoading(true);

    try {
      // For demo accounts, always use today's date (calculated fresh at submission)
      let finalStartDate = formData.start_date;
      let finalEndDate = formData.end_date;

      if (formData.account_type === "demo") {
        const today = new Date().toISOString().split("T")[0];
        finalStartDate = today;
        finalEndDate = today;
      }

      // Check if reseller has remaining quota
      const allocation = allocations.find((a) => a.software_id === formData.software_id);
      if (!allocation) {
        toast.error("No allocation found for this software");
        setLoading(false);
        return;
      }

      // Re-check current usage directly from licenses table to avoid stale counts
      const { count, error: usageError } = await supabase
        .from("licenses")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user!.id)
        .eq("software_id", formData.software_id);

      if (usageError) {
        throw usageError;
      }

      const usedCount = count ?? 0;

      if (usedCount >= allocation.license_limit) {
        toast.error("You have reached your license limit for this software");
        setLoading(false);
        return;
      }

      // Calculate is_active based on end_date
      let isActive = true;
      if (finalEndDate) {
        const endDate = new Date(finalEndDate);
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
          buyer_name: formData.buyer_name.trim(),
          buyer_email: formData.buyer_email?.trim() || null,
          buyer_phone: formData.buyer_phone?.trim() || null,
          platform: formData.platform?.trim() || null,
          account_type: formData.account_type,
          start_date: finalStartDate || null,
          end_date: finalEndDate || null,
          amount: formData.account_type === "demo" ? null : (formData.amount ? parseFloat(formData.amount) : null),
          pay_mode: formData.account_type === "demo" ? null : (formData.pay_mode || null),
          reseller_id: user!.id,
          remarks: formData.remarks?.trim() || null,
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
        remarks: "",
      });
      setErrors({});

      fetchAllocations();
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
          <CardTitle>Generate License</CardTitle>
        </div>
        <CardDescription>Create a new license key for your customer</CardDescription>
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
                <SelectTrigger className={errors.software_id ? "border-destructive" : ""}>
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
              {errors.software_id && <p className="text-sm text-destructive">{errors.software_id}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buyer_name">Name *</Label>
              <Input
                id="buyer_name"
                value={formData.buyer_name}
                onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                className={errors.buyer_name ? "border-destructive" : ""}
                maxLength={100}
                required
              />
              {errors.buyer_name && <p className="text-sm text-destructive">{errors.buyer_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyer_email">Email</Label>
              <Input
                id="buyer_email"
                type="email"
                value={formData.buyer_email}
                onChange={(e) => setFormData({ ...formData, buyer_email: e.target.value })}
                className={errors.buyer_email ? "border-destructive" : ""}
                maxLength={255}
              />
              {errors.buyer_email && <p className="text-sm text-destructive">{errors.buyer_email}</p>}
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
                className={errors.buyer_phone ? "border-destructive" : ""}
                maxLength={20}
              />
              {errors.buyer_phone && <p className="text-sm text-destructive">{errors.buyer_phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Input
                id="platform"
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                placeholder="e.g., Windows, Mac, Linux"
                className={errors.platform ? "border-destructive" : ""}
                maxLength={50}
              />
              {errors.platform && <p className="text-sm text-destructive">{errors.platform}</p>}
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
                    className="block w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    min={formData.start_date || undefined}
                    className="block w-full"
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
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className={errors.amount ? "border-destructive" : ""}
                  />
                  {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
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
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Any additional notes..."
              rows={3}
              maxLength={500}
              className={errors.remarks ? "border-destructive" : ""}
            />
            {errors.remarks && <p className="text-sm text-destructive">{errors.remarks}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Generating..." : "Generate License Key"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default LicenseGeneration;
