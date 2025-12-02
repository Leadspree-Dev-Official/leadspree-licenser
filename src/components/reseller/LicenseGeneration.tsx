import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Key } from "lucide-react";

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
  const [formData, setFormData] = useState({
    software_id: "",
    buyer_name: "",
    buyer_email: "",
    buyer_phone: "",
    start_date: "",
    end_date: "",
    amount: "",
    pay_mode: "",
  });

  useEffect(() => {
    if (user) {
      fetchAllocations();
    }
  }, [user]);

  const fetchAllocations = async () => {
    try {
      const { data, error } = await supabase
        .from("reseller_allocations")
        .select("*, software(name)")
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
    setLoading(true);

    try {
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
        .eq("reseller_id", user!.id)
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
      });

      fetchAllocations();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate license");
    } finally {
      setLoading(false);
    }
  };

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

          <div className="space-y-2">
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Generating..." : "Generate License Key"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default LicenseGeneration;
