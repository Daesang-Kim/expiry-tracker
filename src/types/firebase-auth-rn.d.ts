// The `@firebase/auth` package's "exports" map defines a single top-level "types"
// entry (dist/auth-public.d.ts) shared across all platforms, so TypeScript never
// resolves the platform-specific declarations nested under the "react-native"
// condition (dist/rn/index.rn.d.ts) — even with customConditions set. Metro's own
// resolver picks the correct RN build at runtime; this just restores the missing
// type for static checking. See src/lib/firebase.ts.
export {};

declare module "@firebase/auth" {
  import type { Persistence } from "firebase/auth";

  export function getReactNativePersistence(storage: unknown): Persistence;
}
