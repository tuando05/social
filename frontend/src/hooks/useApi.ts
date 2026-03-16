import { useAuth } from "@clerk/clerk-react"
import { useCallback } from "react"

const BASE_URL = import.meta.env.VITE_API_URL

export function useApi() {
  const { getToken } = useAuth()

  const apiFetch = useCallback(async (path: string, options?: RequestInit) => {
    const token = await getToken()
    
    // Create headers
    const headers = new Headers(options?.headers)
    
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }
    
    if (!headers.has("Content-Type") && !(options?.body instanceof FormData)) {
      headers.set("Content-Type", "application/json")
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => null)
      throw new Error(errorData?.message || await res.text() || "An error occurred")
    }

    // Return null if empty response (like 204 No Content)
    const text = await res.text()
    return text ? JSON.parse(text) : null
  }, [getToken])

  return { apiFetch }
}
