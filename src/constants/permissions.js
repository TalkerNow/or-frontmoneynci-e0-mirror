/**
 * Permissions and access control constants
 */

// IDs of users authorized to see the "Simulateur" tab
export const AUTHORIZED_SIMULATOR_IDS = [
  262, 4, 135, 1201, 1250, 1322, 1271, 1494,
];

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
