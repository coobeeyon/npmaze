import type { CellCoord } from "../types";
import { ALL_DIRECTIONS, type Topology } from "./topology";
import { wallKey } from "./walls";

/** BFS solver: returns the path from start to end, or null if no path exists */
export function solveMaze(
  topology: Topology,
  walls: Set<string>,
  start: CellCoord,
  end: CellCoord,
): CellCoord[] | null {
  const key = (c: CellCoord) => `${c.row},${c.col}`;
  const visited = new Set<string>();
  const parent = new Map<string, CellCoord | null>();

  const queue: CellCoord[] = [start];
  visited.add(key(start));
  parent.set(key(start), null);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.row === end.row && current.col === end.col) {
      // Reconstruct path
      const path: CellCoord[] = [];
      let node: CellCoord | null = current;
      while (node) {
        path.unshift(node);
        node = parent.get(key(node)) ?? null;
      }
      return path;
    }

    for (const dir of ALL_DIRECTIONS) {
      const neighbor = topology.neighbor(current, dir);
      if (!neighbor) continue;
      if (visited.has(key(neighbor))) continue;

      // Check if wall exists between current and neighbor
      const wk = wallKey(current, neighbor);
      if (walls.has(wk)) continue;

      visited.add(key(neighbor));
      parent.set(key(neighbor), current);
      queue.push(neighbor);
    }
  }

  return null;
}
