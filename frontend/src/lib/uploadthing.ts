import { generateReactHelpers } from "@uploadthing/react"
import type { FileRouter } from "uploadthing/types"

const trimmedApiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "")

const uploadthingApiUrl = trimmedApiBaseUrl
  ? `${trimmedApiBaseUrl}/api/uploadthing`
  : "/api/uploadthing"

export const { useUploadThing } = generateReactHelpers<FileRouter>({
  url: uploadthingApiUrl,
})
