/**
 * Configures the Firebase App Check debug token on the window object in development environments.
 */
export function configureAppCheckDebugToken(
  isDev: boolean,
  debugToken: string | undefined,
  win: Window = window
): void {
  if (isDev) {
    win.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken || true;
  }
}
