import {
  BarChart3,
  CalendarClock,
  Clock,
  Image,
  Layers,
  LayoutDashboard,
  LogOut,
  MapPin,
  Monitor,
  Package,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import { canManageUsers, canWrite } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/media", icon: Image, label: "Media" },
  { to: "/playlists", icon: Layers, label: "Playlists" },
  { to: "/locations", icon: MapPin, label: "Locations" },
  { to: "/devices", icon: Monitor, label: "Devices" },
  { to: "/schedules", icon: CalendarClock, label: "Schedules" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-300",
  manager: "bg-blue-500/20 text-blue-300",
  viewer: "bg-gray-500/20 text-gray-400",
};

export default function AppShell() {
  const { user, logout, refreshToken } = useAuthStore();
  const navigate = useNavigate();

  const { data: pendingData } = useQuery({
    queryKey: ["devices", "pending"],
    queryFn: () => api.get("/api/devices/pending/").then((r) => r.data),
    refetchInterval: 30_000,
    enabled: !!user && canWrite(user.role),
  });
  const pendingCount = Array.isArray(pendingData) ? pendingData.length : 0;

  async function handleLogout() {
    try {
      await api.post("/api/auth/logout/", { refresh: refreshToken });
    } catch { /* ignore */ }
    logout();
    navigate("/login");
    toast.success("Signed out");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-gray-950 text-gray-100 flex flex-col border-r border-gray-800">
        {/* Brand */}
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-gray-800">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <Monitor size={14} className="text-white" />
          </div>
          <span className="font-semibold text-white text-sm tracking-tight">Signage Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <div key={to}>
              <NavLink
                to={to}
                end={exact}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={15} className={isActive ? "text-indigo-400" : ""} />
                    {label}
                  </>
                )}
              </NavLink>
              {to === "/devices" && user && canWrite(user.role) && (
                <>
                  <NavLink
                    to="/devices/pending"
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 pl-9 pr-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        isActive
                          ? "bg-gray-800 text-white"
                          : "text-gray-500 hover:bg-gray-900 hover:text-gray-300"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Clock size={12} className={isActive ? "text-amber-400" : ""} />
                        <span className="flex-1">Pending</span>
                        {pendingCount > 0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                            {pendingCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/releases"
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 pl-9 pr-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        isActive
                          ? "bg-gray-800 text-white"
                          : "text-gray-500 hover:bg-gray-900 hover:text-gray-300"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Package size={12} className={isActive ? "text-indigo-400" : ""} />
                        <span className="flex-1">Releases</span>
                      </>
                    )}
                  </NavLink>
                </>
              )}
            </div>
          ))}
          {user && canManageUsers(user.role) && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Users size={15} className={isActive ? "text-indigo-400" : ""} />
                  Users
                </>
              )}
            </NavLink>
          )}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-900">
            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-300 uppercase">
              {user?.email.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{user?.email}</p>
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize", ROLE_COLORS[user?.role ?? "viewer"])}>
                {user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
