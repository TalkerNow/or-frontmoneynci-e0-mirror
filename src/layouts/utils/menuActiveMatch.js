/**
 * Sidebar active-state helpers (JF TEST nav 2026-09-11).
 * Highlight only when a leaf navLink === current route (exact; param routes ok).
 * Prefer top-level matches over nested items that share a path
 * (Clients vs Inscrits on /app/user/clientslist).
 */

export function pathMatchesNavLink(pathname, navLink, filterBase) {
  if (!pathname || !navLink) return false;
  if (navLink.includes(":")) {
    const base = navLink.split(":")[0];
    if (filterBase && pathname === filterBase) return true;
    return pathname.startsWith(base);
  }
  return pathname === navLink;
}

function collectTrails(items, pathname, ancestors = []) {
  const trails = [];
  if (!Array.isArray(items)) return trails;
  for (const item of items) {
    if (!item) continue;
    if (item.type === "item" && item.navLink && item.matchActive !== false) {
      if (pathMatchesNavLink(pathname, item.navLink, item.filterBase)) {
        trails.push({
          groupIds: ancestors.slice(),
          leafId: item.id,
          depth: ancestors.length,
        });
      }
    }
    if (item.children && item.children.length) {
      trails.push(
        ...collectTrails(item.children, pathname, ancestors.concat(item.id))
      );
    }
  }
  return trails;
}

/** Shallowest matching leaf wins (top-level over nested duplicate paths). */
export function resolveActiveTrail(navigationConfig, pathname) {
  const trails = collectTrails(navigationConfig, pathname);
  if (!trails.length) return { groupIds: [], leafId: null };
  trails.sort((a, b) => a.depth - b.depth);
  return { groupIds: trails[0].groupIds, leafId: trails[0].leafId };
}

export function isLeafRouteActive(item, pathname, activeLeafId) {
  if (!item || item.type !== "item" || !item.navLink || item.matchActive === false) {
    return false;
  }
  if (activeLeafId != null) return item.id === activeLeafId;
  return pathMatchesNavLink(pathname, item.navLink, item.filterBase);
}
