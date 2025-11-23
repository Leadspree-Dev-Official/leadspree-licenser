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
    buyer_city: "",
    buyer_country: "",
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
      setAllocations(data || []);
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
      // Check buyer email limit (max 5 licenses per email per software)
      const { count, error: countError } = await supabase
        .from("licenses")
        .select("*", { count: "exact", head: true })
        .eq("buyer_email", formData.buyer_email)
        .eq("software_id", formData.software_id);

      if (countError) throw countError;

      if (count && count >= 5) {
        toast.error(
          "This buyer email has already been used 5 times for this software. License generation blocked."
        );
        setLoading(false);
        return;
      }

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

      // Generate license
      const licenseKey = generateLicenseKey();
      const { error: insertError } = await supabase.from("licenses").insert([
        {
          license_key: licenseKey,
          software_id: formData.software_id,
          buyer_name: formData.buyer_name,
          buyer_email: formData.buyer_email,
          buyer_phone: formData.buyer_phone,
          buyer_city: formData.buyer_city || null,
          buyer_country: formData.buyer_country || null,
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
        buyer_city: "",
        buyer_country: "",
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
              <Label htmlFor="buyer_name">Buyer Name *</Label>
              <Input
                id="buyer_name"
                value={formData.buyer_name}
                onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyer_email">Buyer Email *</Label>
              <Input
                id="buyer_email"
                type="email"
                value={formData.buyer_email}
                onChange={(e) => setFormData({ ...formData, buyer_email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="buyer_phone">Buyer Phone *</Label>
              <Input
                id="buyer_phone"
                type="tel"
                value={formData.buyer_phone}
                onChange={(e) => setFormData({ ...formData, buyer_phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyer_city">Buyer City</Label>
              <Input
                id="buyer_city"
                value={formData.buyer_city}
                onChange={(e) => setFormData({ ...formData, buyer_city: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buyer_country">Buyer Country</Label>
            <Input
              id="buyer_country"
              value={formData.buyer_country}
              onChange={(e) => setFormData({ ...formData, buyer_country: e.target.value })}
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

export default LicenseGeneration;
