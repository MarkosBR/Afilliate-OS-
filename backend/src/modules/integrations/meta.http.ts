export type MetaHttp = typeof fetch;

let metaFetchImpl: MetaHttp = fetch;

export function metaFetch(...args: Parameters<MetaHttp>) {
  return metaFetchImpl(...args);
}

export function setMetaFetch(fn: MetaHttp) {
  metaFetchImpl = fn;
}

export function resetMetaFetch() {
  metaFetchImpl = fetch;
}
