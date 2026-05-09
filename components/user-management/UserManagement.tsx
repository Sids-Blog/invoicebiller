import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { dbUtils } from "@/lib/db-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface User {
  id: string;
  username: string;
  role_name: string;
}

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const LIMIT = 15;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const offset = (page - 1) * LIMIT;
    const { data, error } = await dbUtils.execute(`
      SELECT u.id, u.username, r.name as role_name
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ORDER BY u.username
      LIMIT $1 OFFSET $2
    `, [LIMIT, offset]);

    const countRes = await dbUtils.execute(`SELECT COUNT(*) FROM users`);

    if (error) {
      toast({ title: "Error fetching users", description: error, variant: "destructive" });
    } else {
      setUsers(data || []);
      if (countRes.data?.[0]) {
        setTotalUsers(parseInt(countRes.data[0].count || "0"));
      }
    }
    setLoading(false);
  }, [page, toast]);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await dbUtils.select('roles');
    if (error) {
      toast({ title: "Error fetching roles", description: error, variant: "destructive" });
    } else {
      setRoles(data || []);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const openDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      const role = roles.find(r => r.name === user.role_name);
      setSelectedRole(role?.id || '');
      setEmail(user.username);
      setPassword('');
    } else {
      setEditingUser(null);
      setSelectedRole('');
      setEmail('');
      setPassword('');
    }
    setIsDialogOpen(true);
  };

  const saveUser = async () => {
    if (editingUser) {
      // Update user role
      if (!selectedRole) return;

      const { error: deleteError } = await dbUtils.execute(`DELETE FROM user_roles WHERE user_id = $1`, [editingUser.id]);
      if (deleteError) {
        toast({ title: "Error updating user role", description: deleteError, variant: "destructive" });
        return;
      }

      const { error: insertError } = await dbUtils.insert('user_roles', { user_id: editingUser.id, role_id: selectedRole });
      if (insertError) {
        toast({ title: "Error updating user role", description: insertError, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "User role updated." });
        fetchUsers();
        setIsDialogOpen(false);
      }
    } else {
      // Create new user directly in Neon with a hashed password
      if (!email || !password || !selectedRole) {
        toast({ title: "Error", description: "All fields are required.", variant: "destructive" });
        return;
      }

      // Insert user with bcrypt-hashed password via pgcrypto
      const { data: newUserData, error: userError } = await dbUtils.execute(
        `INSERT INTO users (email, username, password_hash)
         VALUES ($1, $2, crypt($3, gen_salt('bf')))
         RETURNING id`,
        [email, email, password]
      );

      if (userError) {
        toast({ title: "Error creating user", description: userError, variant: "destructive" });
        return;
      }

      const newUserId = newUserData?.[0]?.id;
      if (!newUserId) {
        toast({ title: "Error", description: "Failed to create user.", variant: "destructive" });
        return;
      }

      const { error: roleError } = await dbUtils.insert('user_roles', {
        user_id: newUserId,
        role_id: selectedRole
      });

      if (roleError) {
        toast({ title: "Error assigning role", description: roleError, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "User created." });
        fetchUsers();
        setIsDialogOpen(false);
      }
    }
  };

  const deleteUser = async (userId: string) => {
    const { error } = await dbUtils.rpc('delete_user', { user_id_to_delete: userId });
    if (error) {
      toast({ title: "Error deleting user", description: error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "User deleted." });
      fetchUsers();
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "username",
      header: "Username",
    },
    {
      accessorKey: "role_name",
      header: "Role",
      cell: ({ row }) => {
        const role = row.original.role_name;
        return role.charAt(0).toUpperCase() + role.slice(1);
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => openDialog(user)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => deleteUser(user.id)} disabled={user.role_name === 'admin'}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Manage users and their roles.</p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button onClick={() => openDialog()}><Plus className="h-4 w-4 mr-2" />Add User</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
              <DialogDescription>
                {editingUser ? "Change user role and permissions." : "Create a new user and assign a role."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!editingUser} />
              {!editingUser && (
                <>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </>
              )}
              <Label htmlFor="role">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveUser}>{editingUser ? "Update Role" : "Create User"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            pageCount={Math.ceil(totalUsers / LIMIT)}
            pagination={{ pageIndex: page - 1, pageSize: LIMIT }}
            onPaginationChange={(updater) => {
              if (typeof updater === "function") {
                const newState = updater({ pageIndex: page - 1, pageSize: LIMIT });
                setPage(newState.pageIndex + 1);
              } else {
                setPage(updater.pageIndex + 1);
              }
            }}
            manualPagination
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
