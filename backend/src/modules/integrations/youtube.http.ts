export type YouTubeHttp = typeof fetch;

let youtubeFetchImpl: YouTubeHttp = fetch;

export function youtubeFetch(...args: Parameters<YouTubeHttp>) {
  return youtubeFetchImpl(...args);
}

export function setYouTubeFetch(fn: YouTubeHttp) {
  youtubeFetchImpl = fn;
}

export function resetYouTubeFetch() {
  youtubeFetchImpl = fetch;
}
