import 'vite/client';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorHandler?: boolean;
  }
}

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
