const API_BASE = "http://127.0.0.1:8000";

/* -----------------------------
   GET REQUEST
------------------------------ */
async function apiGet(endpoint, params = {}) {
  const url = new URL(API_BASE + endpoint);
  Object.entries(params).forEach(([k, v]) =>
    url.searchParams.append(k, v)
  );

  const res = await fetch(url);

  // [OK] READ JSON ERROR FROM FASTAPI
  if (!res.ok) {
    let errMsg = "Failed to fetch data";
    try {
      const err = await res.json();
      errMsg = err.detail || errMsg;
    } catch (_) { }
    throw new Error(errMsg);
  }

  return res.json();
}

/* -----------------------------
   POST REQUEST
------------------------------ */
async function apiPost(endpoint, body) {
  const res = await fetch(API_BASE + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    let errMsg = "Request failed";
    try {
      const err = await res.json();
      errMsg = err.detail || errMsg;
    } catch (_) { }
    throw new Error(errMsg);
  }

  return res.json();
}
