import { apiCall } from "./api";

export interface AdminProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "admin" | "user" | "ally";
  is_active: boolean;
  profile_completed?: boolean;
  phone: string | null;
  sex: string | null;
}

export function getMe(): Promise<AdminProfile> {
  return apiCall<AdminProfile>("/users/me");
}
