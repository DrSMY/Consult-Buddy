import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Shield, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  approved: boolean;
  rejected: boolean;
  created_at: string;
  roles: AppRole[];
}

export default function UserManagement() {
  const { roles } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const isMainAdmin = roles.includes("admin");

  const fetchUsers = async () => {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, phone, approved, rejected, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading users", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: allRoles } = await supabase.from("user_roles").select("user_id, role");

    const usersWithRoles = (profiles || []).map((p) => ({
      ...p,
      roles: (allRoles || []).filter((r) => r.user_id === p.user_id).map((r) => r.role),
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  };

  useEffect(() => {
    if (isMainAdmin) fetchUsers();
    else setLoading(false);
  }, [isMainAdmin]);

  const approveUser = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approved: true, rejected: false })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User approved" });
      fetchUsers();
    }
  };

  const rejectUser = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approved: false, rejected: true })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User rejected" });
      fetchUsers();
    }
  };

  const changeRole = async (userId: string, newRole: AppRole) => {
    const { error: delError } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delError) {
      toast({ title: "Update failed", description: delError.message, variant: "destructive" });
      return;
    }
    const { error: insError } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (insError) {
      toast({ title: "Update failed", description: insError.message, variant: "destructive" });
      return;
    }
    toast({ title: `Role updated to ${newRole}` });
    fetchUsers();
  };

  if (!isMainAdmin) {
    return (
      <div className="min-h-screen gradient-surface">
        <AppHeader title="User Management" showBack />
        <main className="container mx-auto px-4 py-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-lg font-semibold">Admin Access Required</h2>
          <p className="text-sm text-muted-foreground mt-1">Only administrators can manage users.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-surface">
      <AppHeader title="User Management" subtitle="Approve or revoke user access" showBack />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Registered Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No users found.</p>
            ) : (
              <div className="divide-y divide-border">
                {users.map((u) => (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || "Unnamed"}</p>
                      {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Badge
                        variant={u.approved ? "default" : u.rejected ? "destructive" : "secondary"}
                        className="text-[10px]"
                      >
                        {u.approved ? "Approved" : u.rejected ? "Rejected" : "Pending"}
                      </Badge>
                      <Select
                        value={u.roles[0] || "doctor"}
                        onValueChange={(val) => changeRole(u.user_id, val as AppRole)}
                      >
                        <SelectTrigger className="h-7 w-[100px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="doctor">Doctor</SelectItem>
                          <SelectItem value="nurse">Nurse</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {!u.approved && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => approveUser(u.user_id)}
                          className="gap-1 text-xs"
                        >
                          <CheckCircle className="h-3 w-3" /> Approve
                        </Button>
                      )}
                      {!u.rejected && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectUser(u.user_id)}
                          className="gap-1 text-xs"
                        >
                          <XCircle className="h-3 w-3" /> Reject
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
