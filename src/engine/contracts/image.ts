/** A catalog URL or browser data, with no consumer-created public URL required. */
export type EngineImageInput =
  | { readonly kind: 'catalog'; readonly url: string }
  // File extends Blob, so local file-picker selections are accepted directly.
  | { readonly kind: 'local'; readonly blob: Blob }
