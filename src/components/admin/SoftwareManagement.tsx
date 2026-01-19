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
import { Plus, Pencil, Trash2, X, Download } from "lucide-react";

interface Software {
  id: string;
  name: string;
  slug: string;
  type: string;
  version: string;
  description: string;
  is_active: boolean;
  image_url: string | null;
  tagline: string | null;
  features: string[] | null;
  retail_price: number | null;
  learn_more_link: string | null;
  download_url: string | null;
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
    image_url: "",
    tagline: "",
    features: [] as string[],
    retail_price: "",
    learn_more_link: "",
    download_url: "",
  });
  const [newFeature, setNewFeature] = useState("");

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

    if (!formData.description.trim()) {
      toast.error("Description is mandatory");
      return;
    }

    if (!formData.image_url.trim()) {
      toast.error("Image URL is mandatory");
      return;
    }

    const submitData = {
      name: formData.name,
      slug: formData.slug,
      type: formData.type,
      version: formData.version,
      description: formData.description,
      image_url: formData.image_url || null,
      tagline: formData.tagline || null,
      features: formData.features.length > 0 ? formData.features : null,
      retail_price: formData.retail_price ? parseFloat(formData.retail_price) : null,
      learn_more_link: formData.learn_more_link || null,
      download_url: formData.download_url || null,
    };

    try {
      if (editingSoftware) {
        const { error } = await supabase
          .from("software")
          .update(submitData)
          .eq("id", editingSoftware.id);

        if (error) throw error;
        toast.success("Software updated successfully");
      } else {
        const { error } = await supabase.from("software").insert([submitData]);

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
      image_url: "",
      tagline: "",
      features: [],
      retail_price: "",
      learn_more_link: "",
      download_url: "",
    });
    setNewFeature("");
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
      image_url: item.image_url || "",
      tagline: item.tagline || "",
      features: item.features || [],
      retail_price: item.retail_price?.toString() || "",
      learn_more_link: item.learn_more_link || "",
      download_url: item.download_url || "",
    });
    setDialogOpen(true);
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({ ...formData, features: [...formData.features, newFeature.trim()] });
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                      placeholder="lead-scraper-pro"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Input
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      required
                      placeholder="Desktop, SaaS, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="version">Version *</Label>
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
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="Short catchy tagline for the software"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    required
                    placeholder="Detailed description of the software"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image_url">Image URL *</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    required
                    placeholder="https://example.com/software-image.png"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="retail_price">Retail Price</Label>
                    <Input
                      id="retail_price"
                      type="number"
                      step="0.01"
                      value={formData.retail_price}
                      onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
                      placeholder="99.99"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="learn_more_link">Learn More Link</Label>
                    <Input
                      id="learn_more_link"
                      value={formData.learn_more_link}
                      onChange={(e) => setFormData({ ...formData, learn_more_link: e.target.value })}
                      placeholder="https://example.com/contact"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="download_url">Download URL</Label>
                  <Input
                    id="download_url"
                    value={formData.download_url}
                    onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                    placeholder="https://example.com/download/software.zip"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Features (bullet points)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Add a feature"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addFeature();
                        }
                      }}
                    />
                    <Button type="button" onClick={addFeature} variant="outline">
                      Add
                    </Button>
                  </div>
                  {formData.features.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {formData.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                          <span className="flex-1">• {feature}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFeature(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
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
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Download</TableHead>
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
                <TableCell>{item.retail_price ? item.retail_price.toLocaleString() : '-'}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? "default" : "secondary"}>
                    {item.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.download_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(item.download_url!, '_blank')}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  )}
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