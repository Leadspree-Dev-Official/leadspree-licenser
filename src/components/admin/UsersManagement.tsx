import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle, XCircle, Pause, Play, Trash2 } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "reseller";
  status: "pending" | "active" | "paused" | "terminated";
  created_at: string;
}

const UsersManagement = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const updateUserStatus = async (userId: string, status: "active" | "paused" | "terminated") => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("id", userId);

      if (error) throw error;

      toast.success(`User status updated to ${status}`);
      fetchProfiles();
    } catch (error: any) {
      toast.error("Failed to update user status");
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete from profiles (this will cascade to user_roles)
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) throw profileError;

      // Delete from auth.users (admin operation)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        console.warn("Could not delete auth user:", authError);
        // Continue anyway as profile is deleted
      }

      toast.success(`User ${userEmail} deleted successfully`);
      fetchProfiles();
    } catch (error: any) {
      toast.error("Failed to delete user: " + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { className: "bg-status-pending text-warning-foreground" },
      active: { className: "bg-status-active text-accent-foreground" },
      paused: { className: "bg-status-paused text-primary-foreground" },
      terminated: { className: "bg-status-terminated text-destructive-foreground" },
    };

    return (
      <Badge {...(variants[status] || {})} variant="outline">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reseller Management</CardTitle>
        <CardDescription>Approve, pause, or terminate reseller accounts</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell className="font-medium">
                  {profile.full_name || "N/A"}
                </TableCell>
                <TableCell>{profile.email}</TableCell>
                <TableCell>
                  <Badge variant={profile.role === "admin" ? "default" : "secondary"}>
                    {profile.role}
                  </Badge>
                </TableCell>
                <TableCell>{getStatusBadge(profile.status)}</TableCell>
                <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right space-x-2">
                  {profile.role !== "admin" && (
                    <>
                      {profile.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => updateUserStatus(profile.id, "active")}
                          className="gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Approve
                        </Button>
                      )}
                      {profile.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserStatus(profile.id, "paused")}
                          className="gap-1"
                        >
                          <Pause className="w-3 h-3" />
                          Pause
                        </Button>
                      )}
                      {profile.status === "paused" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateUserStatus(profile.id, "active")}
                          className="gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Activate
                        </Button>
                      )}
                      {profile.status !== "terminated" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateUserStatus(profile.id, "terminated")}
                          className="gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          Terminate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteUser(profile.id, profile.email)}
                        className="gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default UsersManagement;
