import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Media() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [draggingOver, setDraggingOver] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["media"],
    queryFn: () => api.get("/api/media/").then((r) => r.data),
  });

  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", file.name);
      return api.post("/api/media/", fd, {
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
    },
    onSuccess: (_, file) => {
      qc.invalidateQueries({ queryKey: ["media"] });
      setUploadProgress(null);
      toast.success(`"${file.name}" uploaded`);
    },
    onError: () => {
      setUploadProgress(null);
      toast.error("Upload failed — check file type and size (max 200 MB)");
    },
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.patch(`/api/media/${id}/`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media"] });
      setRenaming(null);
      toast.success("File renamed");
    },
    onError: () => toast.error("Rename failed"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/media/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media"] });
      setConfirmDelete(null);
      toast.success("File deleted");
    },
    onError: () => toast.error("Delete failed — file may be in use by a playlist"),
  });

  function onFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((f) => upload.mutate(f));
  }

  const items: any[] = data?.results ?? [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.count ?? 0} files</p>
        </div>
        <Button onClick={() => inputRef.current?.click()}>
          <Upload size={14} />
          Upload files
        </Button>
        <input ref={inputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => onFiles(e.target.files)} />
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${draggingOver ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
        onDragOver={(e) => { e.preventDefault(); setDraggingOver(true); }}
        onDragLeave={() => setDraggingOver(false)}
        onDrop={(e) => { e.preventDefault(); setDraggingOver(false); onFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={20} className="mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">Drop images or videos here, or <span className="text-indigo-600 font-medium">browse</span></p>
        <p className="text-xs text-gray-400 mt-1">JPEG, PNG, GIF, WebP, MP4, WebM · max 200 MB</p>
      </div>

      {/* Upload progress */}
      {uploadProgress !== null && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Uploading…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-gray-100">
              <Skeleton className="aspect-video" />
              <div className="p-3 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Image}
          title="No media yet"
          description="Upload images or videos to start building playlists."
          action={
            <Button onClick={() => inputRef.current?.click()}>
              <Upload size={14} />
              Upload your first file
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((m) => (
            <div key={m.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden group hover:shadow-md hover:border-gray-300 transition-all">
              <div className="relative aspect-video bg-gray-100 overflow-hidden">
                {m.media_type === "image" ? (
                  <img src={m.file_url} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <video src={m.file_url} className="w-full h-full object-cover" muted />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                {/* Delete / Confirm */}
                {confirmDelete === m.id ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60">
                    <p className="text-xs text-white font-medium">Delete this file?</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="danger" loading={remove.isPending} onClick={() => remove.mutate(m.id)}>
                        Delete
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(m.id)}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <div className="p-3">
                {renaming?.id === m.id ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); rename.mutate({ id: m.id, name: renaming.name }); }}
                    className="flex gap-1"
                  >
                    <input
                      autoFocus
                      value={renaming.name}
                      onChange={(e) => setRenaming((r) => r && { ...r, name: e.target.value })}
                      className="flex-1 min-w-0 border border-indigo-400 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button type="submit" className="text-xs text-indigo-600 font-medium px-1.5 hover:underline">Save</button>
                    <button type="button" onClick={() => setRenaming(null)} className="text-xs text-gray-400 px-1 hover:underline">✕</button>
                  </form>
                ) : (
                  <p
                    className="text-xs font-medium text-gray-800 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                    title="Click to rename"
                    onClick={() => setRenaming({ id: m.id, name: m.name })}
                  >
                    {m.name}
                  </p>
                )}
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-gray-400">{formatBytes(m.file_size)}</p>
                  <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{m.media_type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
