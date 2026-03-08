import type { CellCoord, Direction, SurfaceType } from "../types";

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

function rectangleTopology(rows: number, cols: number): Topology {
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

function cylinderTopology(rows: number, cols: number): Topology {
  return {
    name: "Cylinder",
    rows,
    cols,
    neighbor(cell, dir) {
      const n = basicNeighbor(cell, dir);
      // Vertical: bounded
      if (n.row < 0 || n.row >= rows) return null;
      // Horizontal: wraps
      n.col = ((n.col % cols) + cols) % cols;
      return n;
    },
  };
}

function torusTopology(rows: number, cols: number): Topology {
  return {
    name: "Torus",
    rows,
    cols,
    neighbor(cell, dir) {
      const n = basicNeighbor(cell, dir);
      n.row = ((n.row % rows) + rows) % rows;
      n.col = ((n.col % cols) + cols) % cols;
      return n;
    },
  };
}

function mobiusTopology(rows: number, cols: number): Topology {
  return {
    name: "Möbius Strip",
    rows,
    cols,
    neighbor(cell, dir) {
      const n = basicNeighbor(cell, dir);
      // Vertical: bounded
      if (n.row < 0 || n.row >= rows) return null;
      // Horizontal: wraps with row-flip
      if (n.col < 0) {
        return { row: rows - 1 - n.row, col: cols - 1 };
      }
      if (n.col >= cols) {
        return { row: rows - 1 - n.row, col: 0 };
      }
      return n;
    },
  };
}

function kleinTopology(rows: number, cols: number): Topology {
  return {
    name: "Klein Bottle",
    rows,
    cols,
    neighbor(cell, dir) {
      const n = basicNeighbor(cell, dir);
      // Vertical: wraps normally (like torus)
      if (n.row < 0 || n.row >= rows) {
        n.row = ((n.row % rows) + rows) % rows;
      }
      // Horizontal: wraps with row-flip (like Möbius)
      if (n.col < 0) {
        return { row: rows - 1 - n.row, col: cols - 1 };
      }
      if (n.col >= cols) {
        return { row: rows - 1 - n.row, col: 0 };
      }
      return n;
    },
  };
}

export function createTopology(
  surface: SurfaceType,
  rows: number,
  cols: number,
): Topology {
  switch (surface) {
    case "rectangle":
      return rectangleTopology(rows, cols);
    case "cylinder":
      return cylinderTopology(rows, cols);
    case "torus":
      return torusTopology(rows, cols);
    case "mobius":
      return mobiusTopology(rows, cols);
    case "klein":
      return kleinTopology(rows, cols);
  }
}
