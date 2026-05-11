import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

const CHANNELS = ["stable", "beta"] as const;
const OS_OPTIONS = ["linux", "darwin", "windows"] as const;
const ARCH_OPTIONS = ["amd64", "arm64", "arm"] as const;

const EMPTY_FORM = {
  version: "",
  channel: "stable" as (typeof CHANNELS)[number],
  os: "linux" as (typeof OS_OPTIONS)[number],
  arch: "arm64" as (typeof ARCH_OPTIONS)[number],
  sha256: "",
  signature: "",
  notes: "",
  is_active: true,
};

type Form = typeof EMPTY_FORM;

function pill(active: boolean) {
  return cn(
    "flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all",
    active
      ? "bg-gray-900 text-white border-gray-900"
      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
  );
}

async function sha256hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildFormData(form: Form, binary: File | null): FormData {
  const fd = new FormData();
  fd.append("version", form.version);
  fd.append("channel", form.channel);
  fd.append("os", form.os);
  fd.append("arch", form.arch);
  fd.append("sha256", form.sha256);
  fd.append("is_active", String(form.is_active));
  if (form.signature) fd.append("signature", form.signature);
  if (form.notes) fd.append("notes", form.notes);
  if (binary) fd.append("binary", binary);
  return fd;
}

export default function Releases() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["releases"],
    queryFn: () => api.get("/api/player/releases/").then((r) => r.data),
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>({ ...EMPTY_FORM });
  const [binary, setBinary] = useState<File | null>(null);
  const [computingSHA256, setComputingSHA256] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const releases: any[] = data?.results ?? [];

  const create = useMutation({
    mutationFn: (fd: FormData) => api.post("/api/player/releases/", fd),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["releases"] });
      closeForm();
      toast.success(`Release ${res.data.version} created`);
    },
    onError: () => toast.error("Failed to create release"),
  });

  const update = useMutation({
    mutationFn: ({ id, fd }: { id: number; fd: FormData }) =>
      api.patch(`/api/player/releases/${id}/`, fd),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["releases"] });
      closeForm();
      toast.success(`Release ${res.data.version} updated`);
    },
    onError: () => toast.error("Failed to update release"),
  });

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.patch(`/api/player/releases/${id}/`, { is_active }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["releases"] });
      toast.success(vars.is_active ? "Release activated" : "Release deactivated");
    },
    onError: () => toast.error("Failed to update release"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/player/releases/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["releases"] });
      setConfirmDelete(null);
      toast.success("Release deleted");
    },
    onError: () => toast.error("Failed to delete release"),
  });

  function f(field: keyof Form, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function onFileChange(file: File) {
    setBinary(file);
    setComputingSHA256(true);
    try {
      const hash = await sha256hex(file);
      f("sha256", hash);
    } finally {
      setComputingSHA256(false);
    }
  }

  function openEdit(r: any) {
    setForm({
      version: r.version,
      channel: r.channel,
      os: r.os,
      arch: r.arch,
      sha256: r.sha256,
      signature: r.signature ?? "",
      notes: r.notes ?? "",
      is_active: r.is_active,
    });
    setCurrentUrl(r.download_url ?? "");
    setBinary(null);
    setEditingId(r.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setBinary(null);
    setCurrentUrl("");
  }

  function submit() {
    const fd = buildFormData(form, binary);
    if (editingId) {
      update.mutate({ id: editingId, fd });
    } else {
      create.mutate(fd);
    }
  }

  const canSubmit =
    form.version.trim() !== "" &&
    form.sha256.length === 64 &&
    !computingSHA256 &&
    (editingId !== null || binary !== null);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Releases</h1>
          <p className="text-sm text-gray-500 mt-0.5">Player agent binaries served to devices</p>
        </div>
        <Button onClick={() => { setEditingId(null); setShowForm(true); }}>
          <Plus size={14} />
          New release
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">{editingId ? "Edit release" : "New release"}</h2>

          {/* Version */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Version</label>
            <input
              autoFocus
              value={form.version}
              onChange={(e) => f("version", e.target.value)}
              placeholder="e.g. 1.2.3"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Channel / OS / Arch */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Channel</label>
              <div className="flex gap-1.5">
                {CHANNELS.map((ch) => (
                  <button key={ch} type="button" onClick={() => f("channel", ch)} className={pill(form.channel === ch)}>{ch}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">OS</label>
              <div className="flex gap-1">
                {OS_OPTIONS.map((os) => (
                  <button key={os} type="button" onClick={() => f("os", os)} className={pill(form.os === os)}>{os}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Arch</label>
              <div className="flex gap-1">
                {ARCH_OPTIONS.map((a) => (
                  <button key={a} type="button" onClick={() => f("arch", a)} className={pill(form.arch === a)}>{a}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Binary upload */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Binary {editingId && <span className="text-gray-400 font-normal">(leave empty to keep existing)</span>}
            </label>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileChange(file);
              }}
            />
            {binary ? (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
                <UploadCloud size={15} className="text-indigo-500 shrink-0" />
                <span className="text-indigo-700 font-medium truncate flex-1">{binary.name}</span>
                <span className="text-indigo-400 text-xs shrink-0">{(binary.size / 1_000_000).toFixed(1)} MB</span>
                <button
                  type="button"
                  onClick={() => { setBinary(null); f("sha256", ""); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-indigo-400 hover:text-indigo-600 transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-6 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
              >
                <UploadCloud size={16} />
                Click to select binary file
              </button>
            )}
            {editingId && currentUrl && !binary && (
              <p className="mt-1.5 text-xs text-gray-400 truncate">
                Current: <span className="font-mono">{currentUrl}</span>
              </p>
            )}
          </div>

          {/* SHA-256 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              SHA-256
              {computingSHA256 && (
                <span className="ml-2 text-indigo-500 font-normal">computing…</span>
              )}
            </label>
            <input
              value={form.sha256}
              onChange={(e) => f("sha256", e.target.value)}
              placeholder="64-char hex — auto-filled when you upload a file"
              readOnly={computingSHA256}
              className={cn(
                "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500",
                computingSHA256 && "bg-gray-50 text-gray-400"
              )}
            />
          </div>

          {/* Signature + Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Signature <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                value={form.signature}
                onChange={(e) => f("signature", e.target.value)}
                placeholder="ed25519 sig…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Release notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                value={form.notes}
                onChange={(e) => f("notes", e.target.value)}
                placeholder="What changed…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Active */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => f("is_active", e.target.checked)}
              className="rounded"
            />
            Activate immediately
          </label>

          <div className="flex gap-2 pt-1">
            <Button onClick={submit} loading={create.isPending || update.isPending} disabled={!canSubmit}>
              {editingId ? "Save changes" : "Create"}
            </Button>
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
        </div>
      ) : releases.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No releases yet"
          description="Create a release to enable over-the-air updates on player agents."
          action={<Button onClick={() => setShowForm(true)}><Plus size={14} />New release</Button>}
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Version", "Channel", "OS", "Arch", "Status", "Created", ""].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {releases.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-mono font-semibold text-gray-900">{r.version}</p>
                      {r.notes && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{r.notes}</p>}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={r.channel === "beta" ? "warning" : "default"}>{r.channel}</Badge>
                  </td>
                  <td className="px-5 py-4 text-gray-600 font-mono text-xs">{r.os}</td>
                  <td className="px-5 py-4 text-gray-600 font-mono text-xs">{r.arch}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => toggle.mutate({ id: r.id, is_active: !r.is_active })}
                      disabled={toggle.isPending}
                      title={r.is_active ? "Click to deactivate" : "Click to activate"}
                    >
                      <Badge variant={r.is_active ? "success" : "default"}>
                        {r.is_active ? "active" : "inactive"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    {confirmDelete === r.id ? (
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="danger" onClick={() => remove.mutate(r.id)} loading={remove.isPending}>Delete</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(r)} className="text-gray-300 hover:text-indigo-500 p-1 transition-colors" title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setConfirmDelete(r.id)} className="text-gray-300 hover:text-red-500 p-1 transition-colors" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
