import { useQuery } from "@tanstack/react-query";
import { Image, Layers, Monitor, Users } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  to: string;
  loading?: boolean;
  sub?: React.ReactNode;
}

function StatCard({ label, value, icon: Icon, color, to, loading, sub }: StatCardProps) {
  return (
    <Link
      to={to}
      className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-4 hover:shadow-md hover:border-gray-300 transition-all group"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {sub && <div className="mt-2">{sub}</div>}
        </div>
      )}
    </Link>
  );
}

export default function Dashboard() {
  const devices = useQuery({ queryKey: ["devices"], queryFn: () => api.get("/api/devices/").then((r) => r.data) });
  const media = useQuery({ queryKey: ["media"], queryFn: () => api.get("/api/media/").then((r) => r.data) });
  const playlists = useQuery({ queryKey: ["playlists"], queryFn: () => api.get("/api/playlists/").then((r) => r.data) });
  const users = useQuery({ queryKey: ["users"], queryFn: () => api.get("/api/users/").then((r) => r.data) });

  const deviceList: any[] = devices.data?.results ?? [];
  const total = devices.data?.count ?? 0;
  const online = deviceList.filter((d) => d.status === "online").length;
  const pct = total > 0 ? Math.round((online / deviceList.length) * 100) : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your signage network</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Devices"
          value={total}
          icon={Monitor}
          color="bg-indigo-50 text-indigo-600"
          to="/devices"
          loading={devices.isLoading}
          sub={
            devices.isSuccess && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{online} online</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          }
        />
        <StatCard
          label="Media files"
          value={media.data?.count ?? "—"}
          icon={Image}
          color="bg-emerald-50 text-emerald-600"
          to="/media"
          loading={media.isLoading}
        />
        <StatCard
          label="Playlists"
          value={playlists.data?.count ?? "—"}
          icon={Layers}
          color="bg-amber-50 text-amber-600"
          to="/playlists"
          loading={playlists.isLoading}
        />
        <StatCard
          label="Users"
          value={users.data?.count ?? "—"}
          icon={Users}
          color="bg-purple-50 text-purple-600"
          to="/users"
          loading={users.isLoading}
        />
      </div>

      {/* Device status list */}
      {devices.isSuccess && deviceList.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Device status</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {deviceList.slice(0, 8).map((d) => (
              <div key={d.id} className="flex items-center gap-4 px-6 py-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.status === "online" ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="text-sm font-medium text-gray-800 flex-1">{d.name}</span>
                <span className="text-xs text-gray-400">{d.last_seen ? `Last seen ${new Date(d.last_seen).toLocaleString()}` : "Never seen"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
