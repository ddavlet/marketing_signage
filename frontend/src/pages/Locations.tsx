import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MapPin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

/** Flatten tree into a list for the dropdown */
function flattenTree(nodes: any[], depth = 0): { id: number; name: string; depth: number }[] {
  const result: { id: number; name: string; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth });
    if (node.children?.length) result.push(...flattenTree(node.children, depth + 1));
  }
  return result;
}

function LocationNode({ loc, depth = 0, onDelete }: { loc: any; depth?: number; onDelete: (id: number) => void }) {
  const [open, setOpen] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const hasChildren = loc.children?.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 group cursor-pointer"
        style={{ paddingLeft: `${16 + depth * 24}px` }}
        onClick={() => hasChildren && setOpen((o) => !o)}
      >
        {hasChildren ? (
          <ChevronRight size={13} className={`text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-90" : ""}`} />
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}
        <MapPin size={13} className="text-gray-300 flex-shrink-0" />
        <span className="text-sm text-gray-800 font-medium">{loc.name}</span>
        {loc.description && <span className="text-xs text-gray-400 ml-1 truncate hidden sm:block">— {loc.description}</span>}
        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {confirm ? (
            <>
              <Button size="sm" variant="danger" onClick={() => onDelete(loc.id)}>Delete</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
            </>
          ) : (
            <button onClick={() => setConfirm(true)} className="text-gray-300 hover:text-red-500 p-1 transition-colors">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
      {open && hasChildren && loc.children.map((child: any) => (
        <LocationNode key={child.id} loc={child} depth={depth + 1} onDelete={onDelete} />
      ))}
    </div>
  );
}

export default function Locations() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.get("/api/locations/").then((r) => r.data),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", parent: "" });

  const locations: any[] = data?.results ?? [];
  const flatLocations = flattenTree(locations);

  const create = useMutation({
    mutationFn: (payload: any) => api.post("/api/locations/", payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      setShowForm(false);
      setForm({ name: "", description: "", parent: "" });
      toast.success(`"${res.data.name}" created`);
    },
    onError: () => toast.error("Failed to create location"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/locations/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location deleted");
    },
    onError: () => toast.error("Delete failed — location may have devices assigned"),
  });

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Region → Store → Zone hierarchy</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={14} />
          Add location
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold text-gray-900">New location</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. London Store"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Parent location</label>
              <select
                value={form.parent}
                onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— root (no parent) —</option>
                {flatLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {"  ".repeat(l.depth)}{l.depth > 0 ? "↳ " : ""}{l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Description <span className="text-gray-400">(optional)</span></label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Main lobby, Ground floor…"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => create.mutate({ name: form.name, description: form.description, parent: form.parent || null })}
              loading={create.isPending}
              disabled={!form.name}
            >
              Create
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 mx-4 my-2 rounded-lg" />)}
        </div>
      ) : locations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No locations yet"
          description="Create locations to organise your devices by region, store, or zone."
          action={<Button onClick={() => setShowForm(true)}><Plus size={14} />Add your first location</Button>}
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-50">
          {locations.map((loc) => (
            <LocationNode key={loc.id} loc={loc} onDelete={(id) => remove.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
}
