export type TikTokHttp = typeof fetch;

let tiktokFetchImpl: TikTokHttp = fetch;

export function tiktokFetch(...args: Parameters<TikTokHttp>) {
  return tiktokFetchImpl(...args);
}

export function setTikTokFetch(fn: TikTokHttp) {
  tiktokFetchImpl = fn;
}

export function resetTikTokFetch() {
  tiktokFetchImpl = fetch;
}
