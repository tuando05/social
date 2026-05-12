import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/hooks/useApi"
import type { User } from "@/types/api"

export function useCurrentUserProfile() {
  const { apiFetch } = useApi()

  return useQuery<User>({
    queryKey: ["users", "me"],
    queryFn: () => apiFetch("/api/users/me"),
    staleTime: 5 * 60 * 1000,
  })
}
