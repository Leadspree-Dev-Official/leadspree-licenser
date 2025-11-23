import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

interface Allocation {
  id: string;
  reseller_id: string;
  software_id: string;
  license_limit: number;
  licenses_used: number;
  profiles: { full_name: string | null; email: string };
  software: { name: string };
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

interface Software {
  id: string;
  name: string;
}

const AllocationsManagement = () => {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [resellers, setResellers] = useState<Profile[]>([]);
  const [software, setSoftware] = useState<Software[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [formData, setFormData] = useState({
    reseller_id: "",
    software_id: "",
    license_limit: 0,
  });

  const fetchData = async () => {
    try {
      const [allocationsRes, resellersRes, softwareRes] = await Promise.all([
        supabase
          .from("reseller_allocations")
          .select("*, profiles(full_name, email), software(name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("role", "reseller")
          .eq("status", "active"),
        supabase.from("software").select("id, name").eq("is_active", true),
      ]);

      if (allocationsRes.error) throw allocationsRes.error;
      if (resellersRes.error) throw resellersRes.error;
      if (softwareRes.error) throw softwareRes.error;

      setAllocations(allocationsRes.data || []);
      setResellers(resellersRes.data || []);
      setSoftware(softwareRes.data || []);
    } catch (error: any) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAllocation) {
        const { error } = await supabase
          .from("reseller_allocations")
          .update({ license_limit: formData.license_limit })
          .eq("id", editingAllocation.id);

        if (error) throw error;
        toast.success("Allocation updated successfully");
      } else {
        const { error } = await supabase.from("reseller_allocations").insert([formData]);

        if (error) throw error;
        toast.success("Allocation created successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save allocation");
    }
  };

  const resetForm = () => {
    setFormData({
      reseller_id: "",
      software_id: "",
      license_limit: 0,
    });
    setEditingAllocation(null);
  };

  const openEditDialog = (allocation: Allocation) => {
    setEditingAllocation(allocation);
    setFormData({
      reseller_id: allocation.reseller_id,
      software_id: allocation.software_id,
      license_limit: allocation.license_limit,
    });
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8">Loading allocations...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>License Allocations</CardTitle>
          <CardDescription>Assign license quotas to resellers</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              New Allocation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingAllocation ? "Edit Allocation" : "Create Allocation"}
                </DialogTitle>
                <DialogDescription>
                  Assign license quota to a reseller for a specific software
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="reseller">Reseller</Label>
                  <Select
                    value={formData.reseller_id}
                    onValueChange={(value) => setFormData({ ...formData, reseller_id: value })}
                    disabled={!!editingAllocation}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reseller" />
                    </SelectTrigger>
                    <SelectContent>
                      {resellers.map((reseller) => (
                        <SelectItem key={reseller.id} value={reseller.id}>
                          {reseller.full_name || reseller.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="software">Software</Label>
                  <Select
                    value={formData.software_id}
                    onValueChange={(value) => setFormData({ ...formData, software_id: value })}
                    disabled={!!editingAllocation}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select software" />
                    </SelectTrigger>
                    <SelectContent>
                      {software.map((sw) => (
                        <SelectItem key={sw.id} value={sw.id}>
                          {sw.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limit">License Limit</Label>
                  <Input
                    id="limit"
                    type="number"
                    min="0"
                    value={formData.license_limit}
                    onChange={(e) =>
                      setFormData({ ...formData, license_limit: parseInt(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingAllocation ? "Update" : "Create"} Allocation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reseller</TableHead>
              <TableHead>Software</TableHead>
              <TableHead>Used / Limit</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((allocation) => (
              <TableRow key={allocation.id}>
                <TableCell className="font-medium">
                  {allocation.profiles.full_name || allocation.profiles.email}
                </TableCell>
                <TableCell>{allocation.software.name}</TableCell>
                <TableCell>
                  {allocation.licenses_used} / {allocation.license_limit}
                </TableCell>
                <TableCell>
                  {allocation.license_limit - allocation.licenses_used}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(allocation)}>
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AllocationsManagement;
