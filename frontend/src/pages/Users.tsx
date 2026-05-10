import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/lib/auth-store";

const ROLES = ["admin", "manager", "viewer"] as const;
type Role = (typeof ROLES)[number];

const ROLE_BADGE: Record<Role, "danger" | "info" | "default"> = {
  admin: "danger",
  manager: "info",
  viewer: "default",
};

export default function Users() {
  const qc = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/api/users/").then((r) => r.data),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", role: "viewer" as Role, first_name: "", last_name: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ email: "", first_name: "", last_name: "", role: "viewer" as Role });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const create = useMutation({
    mutationFn: (payload: typeof form) => api.post("/api/users/", payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setShowForm(false);
      setForm({ email: "", password: "", role: "viewer", first_name: "", last_name: "" });
      toast.success(`${res.data.email} invited`);
    },
    onError: () => toast.error("Failed to create user — email may already exist"),
  });

  const toggle = useMutation({
    mutationFn: (id: number) => api.post(`/api/users/${id}/toggle-active/`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(`${res.data.email} ${res.data.is_active ? "activated" : "deactivated"}`);
    },
    onError: () => toast.error("Failed to update user"),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      api.patch(`/api/users/${id}/`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setEditingId(null);
      toast.success("User updated");
    },
    onError: () => toast.error("Failed to update user"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/users/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setConfirmDelete(null);
      toast.success("User deleted");
    },
    onError: () => toast.error("Failed to delete user"),
  });

  function startEdit(u: any) {
    setEditForm({
      email: u.email,
      first_name: u.first_name ?? "",
      last_name: u.last_name ?? "",
      role: u.role,
    });
    setEditingId(u.id);
    setConfirmDelete(null);
  }

  const users: any[] = data?.results ?? [];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.count ?? 0} accounts</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={14} />
          Invite user
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold text-gray-900">Invite user</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} autoFocus className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="user@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Min. 8 characters" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">First name</label>
              <input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Last name</label>
              <input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
            <div className="flex gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setForm((f) => ({ ...f, role: r }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all capitalize ${form.role === r ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={() => create.mutate(form)} loading={create.isPending} disabled={!form.email || !form.password}>
              Send invite
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No users"
          description="Invite team members to manage your signage network."
          action={<Button onClick={() => setShowForm(true)}><Plus size={14} />Invite first user</Button>}
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["User", "Role", "Status", "Joined", ""].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => {
                const isEditing = editingId === u.id;
                const isSelf = u.id === currentUserId;
                if (isEditing) {
                  return (
                    <tr key={u.id} className="bg-indigo-50/40">
                      <td className="px-5 py-3" colSpan={5}>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                              placeholder="Email"
                              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                              value={editForm.first_name}
                              onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                              placeholder="First name"
                              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                              value={editForm.last_name}
                              onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                              placeholder="Last name"
                              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
                            <div className="flex gap-2">
                              {ROLES.map((r) => (
                                <button
                                  key={r}
                                  onClick={() => setEditForm((f) => ({ ...f, role: r }))}
                                  disabled={isSelf}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${editForm.role === r ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"} ${isSelf ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                            {isSelf && <p className="text-[11px] text-gray-400 mt-1">You can't change your own role.</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => update.mutate({ id: u.id, payload: editForm })}
                              loading={update.isPending}
                              disabled={!editForm.email}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 uppercase flex-shrink-0">
                          {u.email.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email}
                          </p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={ROLE_BADGE[u.role as Role]}>{u.role}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={u.is_active ? "success" : "default"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {new Date(u.date_joined).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggle.mutate(u.id)}
                          loading={toggle.isPending}
                          disabled={isSelf}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <button
                          onClick={() => startEdit(u)}
                          className="text-gray-300 hover:text-indigo-500 p-1.5 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        {confirmDelete === u.id ? (
                          <div className="flex gap-1 ml-1">
                            <Button size="sm" variant="danger" onClick={() => remove.mutate(u.id)} loading={remove.isPending}>Delete</Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(u.id)}
                            disabled={isSelf}
                            className="text-gray-300 hover:text-red-500 p-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isSelf ? "Can't delete yourself" : "Delete"}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
