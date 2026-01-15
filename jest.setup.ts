import "@testing-library/jest-dom";

import path from "node:path";
import { TextDecoder, TextEncoder } from "node:util";

import dotenv from "dotenv";

dotenv.config({
  path: path.join(process.cwd(), ".env.test.local"),
  quiet: true,
});
dotenv.config({ path: path.join(process.cwd(), ".env.test"), quiet: true });

function disableNodeWebStorageGlobals() {
  if (
    typeof (globalThis as unknown as { window?: unknown }).window !==
    "undefined"
  )
    return;

  for (const key of ["localStorage", "sessionStorage"] as const) {
    const desc = Object.getOwnPropertyDescriptor(globalThis, key);
    if (!desc) continue;
    if (!desc.configurable) continue;
    if (typeof desc.get !== "function") continue;
    try {
      Object.defineProperty(globalThis, key, {
        value: undefined,
        configurable: true,
        writable: true,
      });
    } catch {}
  }
}

disableNodeWebStorageGlobals();

if (!globalThis.TextEncoder) {
  globalThis.TextEncoder =
    TextEncoder as unknown as typeof globalThis.TextEncoder;
}

if (!globalThis.TextDecoder) {
  globalThis.TextDecoder =
    TextDecoder as unknown as typeof globalThis.TextDecoder;
}
