import type { CellCoord, Direction } from "../types";

export interface Topology {
  name: string;
  rows: number;
  cols: number;
  neighbor(cell: CellCoord, dir: Direction): CellCoord | null;
}

const OPPOSITES: Record<Direction, Direction> = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};

export function oppositeDir(dir: Direction): Direction {
  return OPPOSITES[dir];
}

export const ALL_DIRECTIONS: Direction[] = ["north", "south", "east", "west"];

function basicNeighbor(
  cell: CellCoord,
  dir: Direction,
): { row: number; col: number } {
  switch (dir) {
    case "north":
      return { row: cell.row - 1, col: cell.col };
    case "south":
      return { row: cell.row + 1, col: cell.col };
    case "west":
      return { row: cell.row, col: cell.col - 1 };
    case "east":
      return { row: cell.row, col: cell.col + 1 };
  }
}

export function rectangleTopology(rows: number, cols: number): Topology {
  return {
    name: "Rectangle",
    rows,
    cols,
    neighbor(cell, dir) {
      const n = basicNeighbor(cell, dir);
      if (n.row < 0 || n.row >= rows || n.col < 0 || n.col >= cols)
        return null;
      return n;
    },
  };
}
