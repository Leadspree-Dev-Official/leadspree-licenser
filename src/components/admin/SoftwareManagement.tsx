import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Software {
  id: string;
  name: string;
  slug: string;
  type: string;
  version: string;
  description: string | null;
  is_active: boolean;
}

const SoftwareManagement = () => {
  const [software, setSoftware] = useState<Software[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSoftware, setEditingSoftware] = useState<Software | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    type: "",
    version: "",
    description: "",
  });

  const fetchSoftware = async () => {
    try {
      const { data, error } = await supabase
        .from("software")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSoftware(data || []);
    } catch (error: any) {
      toast.error("Failed to load software");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSoftware();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSoftware) {
        const { error } = await supabase
          .from("software")
          .update(formData)
          .eq("id", editingSoftware.id);

        if (error) throw error;
        toast.success("Software updated successfully");
      } else {
        const { error } = await supabase.from("software").insert([formData]);

        if (error) throw error;
        toast.success("Software added successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchSoftware();
    } catch (error: any) {
      toast.error(error.message || "Failed to save software");
    }
  };

  const deleteSoftware = async (id: string) => {
    if (!confirm("Are you sure you want to delete this software?")) return;

    try {
      const { error } = await supabase.from("software").delete().eq("id", id);

      if (error) throw error;
      toast.success("Software deleted successfully");
      fetchSoftware();
    } catch (error: any) {
      toast.error("Failed to delete software");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      type: "",
      version: "",
      description: "",
    });
    setEditingSoftware(null);
  };

  const openEditDialog = (item: Software) => {
    setEditingSoftware(item);
    setFormData({
      name: item.name,
      slug: item.slug,
      type: item.type,
      version: item.version,
      description: item.description || "",
    });
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8">Loading software...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Software Management</CardTitle>
          <CardDescription>Manage available software products</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Software
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingSoftware ? "Edit Software" : "Add New Software"}
                </DialogTitle>
                <DialogDescription>
                  Enter the details of the software product
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                    placeholder="lead-scraper-pro"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Input
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      required
                      placeholder="Desktop, SaaS, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      required
                      placeholder="1.0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingSoftware ? "Update" : "Add"} Software
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
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {software.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.slug}</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell>{item.version}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? "default" : "secondary"}>
                    {item.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteSoftware(item.id)}
                  >
                    <Trash2 className="w-3 h-3" />
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

export default SoftwareManagement;
