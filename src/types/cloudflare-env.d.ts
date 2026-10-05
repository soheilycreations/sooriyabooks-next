// The R2 bucket bound as MEDIA in wrangler.jsonc. Read it with
// getCloudflareContext().env.MEDIA (see src/lib/media/storage.ts) — never
// process.env, which doesn't carry bindings.
//
// Only the slice of the R2 API this app uses, declared by hand so we don't
// have to pull Cloudflare's full workers-types package (which clashes with
// the DOM types) into the build.
declare global {
  interface MediaBucket {
    put(
      key: string,
      value: ArrayBuffer,
      options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
    ): Promise<unknown>;
    delete(keys: string | string[]): Promise<void>;
  }

  interface CloudflareEnv {
    MEDIA: MediaBucket;
  }
}

export {};
