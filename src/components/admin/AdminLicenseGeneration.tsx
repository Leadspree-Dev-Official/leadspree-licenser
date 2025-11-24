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

interface Software {
  id: string;
  name: string;
  type: string;
  version: string;
}

const AdminLicenseGeneration = () => {
  const { user } = useAuth();
  const [software, setSoftware] = useState<Software[]>([]);
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
    fetchSoftware();
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

      // Generate license (no quota check for admins - unlimited)
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

export default AdminLicenseGeneration;
