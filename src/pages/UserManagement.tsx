import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Shield, Users } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  approved: boolean;
  created_at: string;
}

export default function UserManagement() {
  const { roles } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = roles.includes("admin");

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, approved, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading users", description: error.message, variant: "destructive" });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
    else setLoading(false);
  }, [isAdmin]);

  const toggleApproval = async (userId: string, currentlyApproved: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approved: !currentlyApproved })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: currentlyApproved ? "Access revoked" : "User approved" });
      fetchUsers();
    }
  };

  if (!isAdmin) {
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
                  <div key={u.id} className="flex items-center justify-between py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={u.approved ? "default" : "destructive"} className="text-[10px]">
                        {u.approved ? "Approved" : "Pending"}
                      </Badge>
                      <Button
                        size="sm"
                        variant={u.approved ? "outline" : "default"}
                        onClick={() => toggleApproval(u.user_id, u.approved)}
                        className="gap-1 text-xs"
                      >
                        {u.approved ? (
                          <><XCircle className="h-3 w-3" /> Revoke</>
                        ) : (
                          <><CheckCircle className="h-3 w-3" /> Approve</>
                        )}
                      </Button>
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
