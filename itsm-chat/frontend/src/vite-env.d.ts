/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAT_API_URL: string
  readonly VITE_COMPANY_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
