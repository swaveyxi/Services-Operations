/// <reference types="vite/client" />

// Vite env augmentation requires `interface` (declaration merging); types can't merge.
interface ImportMetaEnv {
  readonly VITE_DEV_BYPASS?: string;
  readonly VITE_DEV_USER?: string;
  readonly VITE_DRAGNET_ERP_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Explicit side-effect declarations for style/asset imports, so resolution does not
// depend on the vite/client reference being loaded by the editor's TS server.
declare module '*.css' {}
declare module '*.svg' {
  const src: string;
  export default src;
}
declare module '*.png' {
  const src: string;
  export default src;
}
