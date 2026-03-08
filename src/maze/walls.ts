import type { CellCoord, Direction } from "../types";
import { ALL_DIRECTIONS, type Topology } from "./topology";

/** Create a canonical key for a wall between two cells */
export function wallKey(a: CellCoord, b: CellCoord): string {
  if (a.row < b.row || (a.row === b.row && a.col < b.col)) {
    return `${a.row},${a.col}|${b.row},${b.col}`;
  }
  return `${b.row},${b.col}|${a.row},${a.col}`;
}

/** Create a wall key from a cell and direction */
export function wallKeyFromDir(
  cell: CellCoord,
  dir: Direction,
  topology: Topology,
): string | null {
  const neighbor = topology.neighbor(cell, dir);
  if (!neighbor) return null;
  return wallKey(cell, neighbor);
}

/** Create the initial set of all walls */
export function createAllWalls(topology: Topology): Set<string> {
  const walls = new Set<string>();
  for (let row = 0; row < topology.rows; row++) {
    for (let col = 0; col < topology.cols; col++) {
      const cell: CellCoord = { row, col };
      for (const dir of ALL_DIRECTIONS) {
        const key = wallKeyFromDir(cell, dir, topology);
        if (key) walls.add(key);
      }
    }
  }
  return walls;
}

/** Check if a wall exists between two cells */
export function hasWall(walls: Set<string>, a: CellCoord, b: CellCoord): boolean {
  return walls.has(wallKey(a, b));
}
