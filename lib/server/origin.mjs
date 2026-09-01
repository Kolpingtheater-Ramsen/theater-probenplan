/**
 * Compare a browser Origin with the public or internal hosts supplied by the
 * application server and its reverse proxy.
 *
 * @param {string} origin
 * @param {Array<string | null>} hostHeaders
 */
export function originMatchesHosts(origin, hostHeaders) {
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const requestHosts = hostHeaders
      .flatMap((value) => value?.split(',') ?? [])
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    return requestHosts.includes(originHost);
  } catch {
    return false;
  }
}
