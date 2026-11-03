// One reading from the electromagnetic tracker: where the object is, and which way it points.
// Units don't matter (inches, cm, whatever the tracker is set to), because calibration maps
// everything onto the screen.
export type Vector = [number, number, number];

export type TrackerSample = {
  position: Vector;
  // Azimuth (yaw), elevation (pitch) and roll in degrees. Missing if the tracker only reports
  // position, in which case the cursor follows the object's position instead.
  orientation?: Vector;
  // When the sample arrived, in milliseconds (performance.now()).
  time: number;
};

const toNumber = (value: unknown) => (typeof value === 'number' ? value : Number(value));
const allFinite = (values: number[]) => values.every(Number.isFinite);

// Reads one line from the tracker. Two formats are understood:
//
//   Plain numbers, the ASCII output of Polhemus trackers and the trakSTAR sample programs,
//   separated by spaces or commas:
//     x y z azimuth elevation roll
//     station x y z azimuth elevation roll
//     hub sensor frame buttons x y z azimuth elevation roll   (Polhemus G4, from PiMgr)
//     x y z
//   Position and angles are always the last six values, so any fields in front are skipped.
//
//   JSON, for a custom bridge:
//     {"x": 1.2, "y": 3.4, "z": 5.6, "azimuth": 10, "elevation": -4, "roll": 0}
//   ("yaw" and "pitch" work in place of "azimuth" and "elevation").
//
// Anything else, such as a header line, returns null and is skipped.
export function parseTrackerLine(line: string, time: number): TrackerSample | null {
  const text = line.trim();
  if (!text) return null;

  if (text.startsWith('{')) {
    try {
      const data = JSON.parse(text) as Record<string, unknown>;
      const position = [data.x, data.y, data.z].map(toNumber);
      if (!allFinite(position)) return null;
      const orientation = [data.azimuth ?? data.yaw, data.elevation ?? data.pitch, data.roll ?? 0].map(
        toNumber,
      );
      return {
        position: position as Vector,
        orientation: allFinite(orientation) ? (orientation as Vector) : undefined,
        time,
      };
    } catch {
      return null;
    }
  }

  const fields = text.split(/[\s,]+/);
  if (fields.length >= 6) {
    const values = fields.slice(-6).map(Number);
    if (!allFinite(values)) return null;
    return { position: values.slice(0, 3) as Vector, orientation: values.slice(3, 6) as Vector, time };
  }
  const position = fields.map(Number);
  if (position.length === 3 && allFinite(position)) return { position: position as Vector, time };
  return null;
}
