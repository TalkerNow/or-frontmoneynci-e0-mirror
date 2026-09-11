/**
 * Sidebar active-state helpers (JF TEST nav 2026-09-11).
 * Highlight only when a leaf navLink === current route (exact; param routes ok).
 * Collapse+navLink (Clients mother) is NEVER the active leaf — avoids false
 * sticky to /kpi/suivi. Exact match only (no prefix).
 *
 * /app/user/clientslist: shallowest leaf is Inscrits (Contacts) — OK.
 *   Clients collapse navLink also matches → keep Clients group open.
 * /app/user/prospectslist: Prospects leaf active, Clients group open.
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

/** Collapse mothers with navLink: open that group when pathname === navLink.
 *  Not used as the winning leaf (type !== item) so Clients never steals
 *  Suivi/Opportunités highlight and never prefix-matches /kpi/*. */
function collectCollapseNavIds(items, pathname) {
  const ids = [];
  if (!Array.isArray(items)) return ids;
  for (const item of items) {
    if (!item) continue;
    if (
      item.type === "collapse" &&
      item.navLink &&
      item.matchActive !== false &&
      pathMatchesNavLink(pathname, item.navLink, item.filterBase)
    ) {
      ids.push(item.id);
    }
    if (item.children && item.children.length) {
      ids.push(...collectCollapseNavIds(item.children, pathname));
    }
  }
  return ids;
}

/** Shallowest matching leaf wins (top-level over nested duplicate paths). */
export function resolveActiveTrail(navigationConfig, pathname) {
  const trails = collectTrails(navigationConfig, pathname);
  const collapseOpenIds = collectCollapseNavIds(navigationConfig, pathname);
  if (!trails.length) {
    return { groupIds: collapseOpenIds, leafId: null };
  }
  trails.sort((a, b) => a.depth - b.depth);
  const winner = trails[0];
  const groupIds = [];
  const seen = {};
  winner.groupIds.concat(collapseOpenIds).forEach((id) => {
    if (id != null && !seen[id]) {
      seen[id] = true;
      groupIds.push(id);
    }
  });
  return { groupIds, leafId: winner.leafId };
}

export function isLeafRouteActive(item, pathname, activeLeafId) {
  if (!item || item.type !== "item" || !item.navLink || item.matchActive === false) {
    return false;
  }
  if (activeLeafId != null) return item.id === activeLeafId;
  return pathMatchesNavLink(pathname, item.navLink, item.filterBase);
}
