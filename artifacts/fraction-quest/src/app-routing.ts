const ARTIFACT_MOUNT_PATH = '/fraction-quest';

export function getRouterBasePath(baseUrl: string, pathname: string): string {
  const configuredBase = baseUrl.replace(/\/+$/, '');
  if (configuredBase) return configuredBase;

  // Replit mounts this app at /fraction-quest while Vite serves development
  // assets from /. Wouter needs the artifact mount stripped to match its root route.
  if (pathname === ARTIFACT_MOUNT_PATH || pathname === `${ARTIFACT_MOUNT_PATH}/`) {
    return ARTIFACT_MOUNT_PATH;
  }

  return '';
}
