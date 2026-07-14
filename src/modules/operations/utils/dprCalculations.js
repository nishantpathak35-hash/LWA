/**
 * Calculates the manpower count for a single floor.
 */
export function calculateFloorManpower(floor) {
  if (!floor || !floor.manpower || !Array.isArray(floor.manpower)) {
    return 0;
  }
  return floor.manpower.reduce((sum, mp) => sum + (parseInt(mp.count) || 0), 0);
}

/**
 * Calculates the overall manpower count across all floors in a DPR.
 */
export function calculateOverallManpower(dprData) {
  if (!dprData || !dprData.floors || !Array.isArray(dprData.floors)) {
    return 0;
  }
  return dprData.floors.reduce((sum, floor) => sum + calculateFloorManpower(floor), 0);
}
