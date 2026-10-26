/**
 * SPA client-side navigation helper that avoids full browser page reloads
 * for internal application routes.
 */
export function navigateTo(targetPath: string, replace = false): void {
  if (typeof window === 'undefined') return;

  // External URLs or protocol links should use normal location assignment
  if (
    targetPath.startsWith('http://') ||
    targetPath.startsWith('https://') ||
    targetPath.startsWith('mailto:') ||
    targetPath.startsWith('tel:')
  ) {
    if (replace) {
      window.location.replace(targetPath);
    } else {
      window.location.href = targetPath;
    }
    return;
  }

  if (replace) {
    window.history.replaceState({}, '', targetPath);
  } else {
    window.history.pushState({}, '', targetPath);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
