import axios from 'axios';

const DEFAULT_SERVER_URL = 'https://micapi.nostep.space';

let serverUrl = null;

export async function initApi() {
  try {
    const stored = await window.micShare?.settings?.get('serverUrl');
    serverUrl = stored && typeof stored === 'string' ? stored : DEFAULT_SERVER_URL;
  } catch {
    serverUrl = DEFAULT_SERVER_URL;
  }
  return serverUrl;
}

export function getServerUrl() {
  return serverUrl || DEFAULT_SERVER_URL;
}

export async function setServerUrl(url) {
  serverUrl = url;
  try {
    await window.micShare?.settings?.set('serverUrl', url);
  } catch {
  }
}

export function createApiClient(token, options = {}) {
  const client = axios.create({
    baseURL: `${getServerUrl()}/api`,
    timeout: options.timeout || 10000,
  });

  client.interceptors.request.use((config) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const autoUnauthorized = options.autoUnauthorized !== false;
      const hadAuth = error.config && error.config.headers && error.config.headers.Authorization;
      if (autoUnauthorized && error.response && error.response.status === 401 && hadAuth) {
        handleUnauthorized();
      }
      return Promise.reject(error);
    }
  );

  return client;
}

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function handleUnauthorized() {
  if (typeof unauthorizedHandler === 'function') unauthorizedHandler();
}

export function extractApiError(err) {
  const data = err.response && err.response.data;
  if (data && Array.isArray(data.details) && data.details.length > 0) {
    return data.details.map((d) => d.message).join('\n');
  }
  if (data && data.message) {
    return data.message;
  }
  if (err.code === 'ECONNABORTED') return 'Server timed out';
  if (err.code === 'ERR_NETWORK') return 'Cannot reach the server';
  return err.message || 'Unexpected error';
}
