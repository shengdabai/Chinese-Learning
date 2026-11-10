export function resolveApiBaseUrl(configuredUrl, isDevelopment) {
  // Production serves /api through the same-origin reverse proxy.
  return configuredUrl || (isDevelopment ? 'http://localhost:8001' : '');
}
