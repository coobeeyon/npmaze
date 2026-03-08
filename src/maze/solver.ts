import type { CellCoord, CrossingOver, Direction } from "../types";
import { ALL_DIRECTIONS, type Topology, oppositeDir } from "./topology";
import { wallKey } from "./walls";

/**
 * BFS solver: returns the path from start to end, or null if no path exists.
 * Handles crossing cells where you can only pass straight through.
 */
/** Step yielded during animated solving */
export interface SolverStep {
  /** Cell being explored */
  cell: CellCoord;
  /** True when the final path has been found */
  done: boolean;
  /** The solution path (only present when done=true) */
  path?: CellCoord[];
}

/**
 * Step-by-step BFS solver for animation.
 * Yields each explored cell, then a final step with the path.
 */
export function* solveMazeSteps(
  topology: Topology,
  walls: Set<string>,
  start: CellCoord,
  end: CellCoord,
  crossings: Map<string, CrossingOver> = new Map(),
): Generator<SolverStep> {
  const cellKey = (c: CellCoord) => `${c.row},${c.col}`;

  interface BfsState {
    cell: CellCoord;
    stateKey: string;
  }

  const visited = new Set<string>();
  const parent = new Map<string, BfsState | null>();

  function getStateKey(cell: CellCoord, entryDir: Direction | null): string {
    const ck = cellKey(cell);
    const crossing = crossings.get(ck);
    if (!crossing || entryDir === null) return ck;
    const isHorizontal = entryDir === "east" || entryDir === "west";
    return `${ck}:${isHorizontal ? "h" : "v"}`;
  }

  function getAllowedExitDirs(cell: CellCoord, entryDir: Direction | null): Direction[] {
    const ck = cellKey(cell);
    const crossing = crossings.get(ck);
    if (!crossing || entryDir === null) return [...ALL_DIRECTIONS];
    return [oppositeDir(entryDir)];
  }

  const startState: BfsState = { cell: start, stateKey: cellKey(start) };
  visited.add(startState.stateKey);
  parent.set(startState.stateKey, null);

  const queue: { state: BfsState; entryDir: Direction | null }[] = [
    { state: startState, entryDir: null },
  ];

  yield { cell: start, done: false };

  while (queue.length > 0) {
    const { state: current, entryDir } = queue.shift()!;

    if (current.cell.row === end.row && current.cell.col === end.col) {
      const path: CellCoord[] = [];
      let node: BfsState | null = current;
      while (node) {
        path.unshift(node.cell);
        node = parent.get(node.stateKey) ?? null;
      }
      yield { cell: current.cell, done: true, path };
      return;
    }

    const exitDirs = getAllowedExitDirs(current.cell, entryDir);

    for (const dir of exitDirs) {
      const neighbor = topology.neighbor(current.cell, dir);
      if (!neighbor) continue;

      const wk = wallKey(current.cell, neighbor);
      if (walls.has(wk)) continue;

      const neighborStateKey = getStateKey(neighbor, dir);
      if (visited.has(neighborStateKey)) continue;

      const neighborState: BfsState = { cell: neighbor, stateKey: neighborStateKey };
      visited.add(neighborStateKey);
      parent.set(neighborStateKey, current);
      queue.push({ state: neighborState, entryDir: dir });

      yield { cell: neighbor, done: false };
    }
  }

  // No solution found
  yield { cell: end, done: true };
}

export function solveMaze(
  topology: Topology,
  walls: Set<string>,
  start: CellCoord,
  end: CellCoord,
  crossings: Map<string, CrossingOver> = new Map(),
): CellCoord[] | null {
  const cellKey = (c: CellCoord) => `${c.row},${c.col}`;

  // For crossings, we track visited state per passage direction
  // State key: "row,col" for normal cells, "row,col:h" or "row,col:v" for crossings
  interface BfsState {
    cell: CellCoord;
    stateKey: string;
  }

  const visited = new Set<string>();
  const parent = new Map<string, BfsState | null>();

  function getStateKey(cell: CellCoord, entryDir: Direction | null): string {
    const ck = cellKey(cell);
    const crossing = crossings.get(ck);
    if (!crossing || entryDir === null) return ck;
    // At a crossing, key depends on which passage we're using
    const isHorizontal = entryDir === "east" || entryDir === "west";
    return `${ck}:${isHorizontal ? "h" : "v"}`;
  }

  function getAllowedExitDirs(cell: CellCoord, entryDir: Direction | null): Direction[] {
    const ck = cellKey(cell);
    const crossing = crossings.get(ck);
    if (!crossing || entryDir === null) return [...ALL_DIRECTIONS];
    // At a crossing, can only exit in the opposite direction of entry
    return [oppositeDir(entryDir)];
  }

  const startState: BfsState = { cell: start, stateKey: cellKey(start) };
  visited.add(startState.stateKey);
  parent.set(startState.stateKey, null);

  const queue: { state: BfsState; entryDir: Direction | null }[] = [
    { state: startState, entryDir: null },
  ];

  while (queue.length > 0) {
    const { state: current, entryDir } = queue.shift()!;

    if (current.cell.row === end.row && current.cell.col === end.col) {
      // Reconstruct path
      const path: CellCoord[] = [];
      let node: BfsState | null = current;
      while (node) {
        path.unshift(node.cell);
        node = parent.get(node.stateKey) ?? null;
      }
      return path;
    }

    const exitDirs = getAllowedExitDirs(current.cell, entryDir);

    for (const dir of exitDirs) {
      const neighbor = topology.neighbor(current.cell, dir);
      if (!neighbor) continue;

      // Check wall
      const wk = wallKey(current.cell, neighbor);
      if (walls.has(wk)) continue;

      const neighborStateKey = getStateKey(neighbor, dir);
      if (visited.has(neighborStateKey)) continue;

      const neighborState: BfsState = { cell: neighbor, stateKey: neighborStateKey };
      visited.add(neighborStateKey);
      parent.set(neighborStateKey, current);
      queue.push({ state: neighborState, entryDir: dir });
    }
  }

  return null;
}
