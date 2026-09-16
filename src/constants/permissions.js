/**
 * Permissions and access control constants
 */

// IDs of users authorized to see the "Simulateur" tab
export const AUTHORIZED_SIMULATOR_IDS = [262, 4, 135, 1201, 1250, 1322, 1271,1557,1597, 1638];

/**
 * Check if the current logged-in user can access the Simulator
 * @returns {boolean}
 */
export const canAccessSimulator = () => {
  try {
    const userId = Number(localStorage.getItem("userid"));
    return AUTHORIZED_SIMULATOR_IDS.includes(userId);
  } catch (e) {
    console.warn("Error checking simulator access:", e);
    return false;
  }
};

/**
 * Check if the current logged-in user has a given permission
 * (permissions are granted server-side, in the user_permissions table,
 * and returned by the API at login as `user.permissions`).
 * @param {string} permission e.g. "consultant-access" or "admin-moteur"
 * @returns {boolean}
 */
export const hasPermission = (permission) => {
  try {
    const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
    return Array.isArray(permissions) && permissions.includes(permission);
  } catch (e) {
    console.warn("Error checking permission:", e);
    return false;
  }
};
