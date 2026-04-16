async function apiFetch(url, options = {}) {
  const apiBaseUrl = (window.API_BASE_URL || '').replace(/\/$/, '');
  const fetchUrl = apiBaseUrl ? `${apiBaseUrl}${url}` : url;
  const headers = {
    'Content-Type': 'application/json',
    ...Auth.getAuthHeaders(),
    ...options.headers
  };

  const res = await fetch(fetchUrl, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem(Auth.TOKEN_KEY);
    localStorage.removeItem(Auth.USER_KEY);
    window.location.href = '/login';
    return;
  }

  const data = await res.json();

  if (!res.ok) {
    throw { status: res.status, data };
  }

  return data;
}
