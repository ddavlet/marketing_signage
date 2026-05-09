import type { Role } from "./auth-store";

export const canWrite = (role: Role) => role === "admin" || role === "manager";
export const canManageUsers = (role: Role) => role === "admin";
