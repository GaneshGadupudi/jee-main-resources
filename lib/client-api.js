// Thin fetch wrapper for saving student data. Failures are logged, never thrown, so a network blip can't break the page.
export function api(method, url, body) {
  return fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive: true, // lets the request finish even if the student closes the tab right after
  }).then((response) => {
    if (!response.ok && response.status !== 401) console.error(`${method} ${url} failed with ${response.status}`);
    return response;
  }).catch((error) => {
    console.error(`${method} ${url} failed:`, error);
    return null;
  });
}
