import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default config: no incremental-cache bucket is attached, so ISR/`revalidate`
// pages are rendered on demand instead of served from a cache. Fine for this
// store; add an R2 bucket here later if the render cost ever matters.
export default defineCloudflareConfig();
