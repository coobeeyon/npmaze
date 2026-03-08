import type { CellCoord, AlgorithmType, CrossingOver, Direction } from "../types";
import { ALL_DIRECTIONS, type Topology, oppositeDir } from "./topology";
import { createAllWalls, wallKey } from "./walls";
import { UnionFind } from "./union-find";

/** Result of maze generation including crossings */
export interface GenerationResult {
  walls: Set<string>;
  crossings: Map<string, CrossingOver>;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cellIndex(cell: CellCoord, cols: number): number {
  return cell.row * cols + cell.col;
}

/**
 * Check if a cell can be tunneled through in a given direction.
 * A cell can be tunneled through if:
 * - It's already visited
 * - It's not already a crossing
 * - It has a straight passage perpendicular to the tunnel direction
 *   (walls exist in the tunnel direction, no walls perpendicular)
 * - The cell beyond it (in the tunnel direction) exists and is unvisited
 */
function canTunnel(
  cell: CellCoord,
  dir: Direction,
  topology: Topology,
  walls: Set<string>,
  visited: Set<string>,
  crossings: Map<string, CrossingOver>,
): { far: CellCoord; mid: CellCoord } | null {
  const key = (c: CellCoord) => `${c.row},${c.col}`;
  const mid = topology.neighbor(cell, dir);
  if (!mid || !visited.has(key(mid)) || crossings.has(key(mid))) return null;

  const far = topology.neighbor(mid, dir);
  if (!far || visited.has(key(far))) return null;

  // Check mid has perpendicular passage (walls in tunnel direction, open perpendicular)
  const opp = oppositeDir(dir);
  const isHorizontal = dir === "east" || dir === "west";
  const perpDirs: Direction[] = isHorizontal ? ["north", "south"] : ["east", "west"];
  const tunnelDirs: Direction[] = [dir, opp];

  // Mid must have walls in the tunnel direction (not yet carved through)
  for (const d of tunnelDirs) {
    const n = topology.neighbor(mid, d);
    if (!n) return null; // Need neighbors on both sides for tunnel
    const wk = wallKey(mid, n);
    if (!walls.has(wk)) return null; // Wall must exist (passage not yet open)
  }

  // Mid must have open passages in perpendicular direction
  for (const d of perpDirs) {
    const n = topology.neighbor(mid, d);
    if (!n) return null; // Need neighbors on both sides
    const wk = wallKey(mid, n);
    if (walls.has(wk)) return null; // Wall must NOT exist (passage must be open)
  }

  return { far, mid };
}

/** Recursive backtracker (DFS) maze generation */
function generateDFS(topology: Topology, weave: boolean = false): GenerationResult {
  const walls = createAllWalls(topology);
  const visited = new Set<string>();
  const crossings = new Map<string, CrossingOver>();
  const stack: CellCoord[] = [];

  const key = (c: CellCoord) => `${c.row},${c.col}`;

  // Start from random cell
  const start: CellCoord = {
    row: Math.floor(Math.random() * topology.rows),
    col: Math.floor(Math.random() * topology.cols),
  };
  visited.add(key(start));
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: { cell: CellCoord; wk: string }[] = [];

    for (const dir of shuffle([...ALL_DIRECTIONS])) {
      const neighbor = topology.neighbor(current, dir);
      if (neighbor && !visited.has(key(neighbor))) {
        neighbors.push({ cell: neighbor, wk: wallKey(current, neighbor) });
      }
    }

    if (neighbors.length === 0) {
      // Try tunneling if weave is enabled
      if (weave) {
        let tunneled = false;
        for (const dir of shuffle([...ALL_DIRECTIONS])) {
          const result = canTunnel(current, dir, topology, walls, visited, crossings);
          if (result) {
            const { far, mid } = result;
            // Remove walls to create tunnel through mid
            walls.delete(wallKey(current, mid));
            walls.delete(wallKey(mid, far));
            // Mark mid as crossing - the original passage direction is "over"
            const isHorizontal = dir === "east" || dir === "west";
            // Original passage is perpendicular to tunnel, so it's the overpass
            crossings.set(key(mid), isHorizontal ? "v" : "h");
            visited.add(key(far));
            stack.push(far);
            tunneled = true;
            break;
          }
        }
        if (!tunneled) {
          stack.pop();
        }
      } else {
        stack.pop();
      }
    } else {
      const chosen = neighbors[0];
      walls.delete(chosen.wk);
      visited.add(key(chosen.cell));
      stack.push(chosen.cell);
    }
  }

  return { walls, crossings };
}

/** Kruskal's algorithm maze generation */
function generateKruskal(topology: Topology): GenerationResult {
  const walls = createAllWalls(topology);
  const uf = new UnionFind(topology.rows * topology.cols);

  // Collect all walls as edges
  const edges: { a: CellCoord; b: CellCoord; wk: string }[] = [];
  for (let row = 0; row < topology.rows; row++) {
    for (let col = 0; col < topology.cols; col++) {
      const cell: CellCoord = { row, col };
      for (const dir of ALL_DIRECTIONS) {
        const neighbor = topology.neighbor(cell, dir);
        if (neighbor) {
          const wk = wallKey(cell, neighbor);
          // Avoid duplicates: only add if we haven't seen this wall key
          if (!edges.some((e) => e.wk === wk)) {
            edges.push({ a: cell, b: neighbor, wk });
          }
        }
      }
    }
  }

  shuffle(edges);

  for (const edge of edges) {
    const ia = cellIndex(edge.a, topology.cols);
    const ib = cellIndex(edge.b, topology.cols);
    if (uf.union(ia, ib)) {
      walls.delete(edge.wk);
    }
  }

  return { walls, crossings: new Map() };
}

/** Prim's algorithm maze generation */
function generatePrim(topology: Topology): GenerationResult {
  const walls = createAllWalls(topology);
  const inMaze = new Set<string>();
  const frontier: { cell: CellCoord; from: CellCoord; wk: string }[] = [];

  const key = (c: CellCoord) => `${c.row},${c.col}`;

  // Start from random cell
  const start: CellCoord = {
    row: Math.floor(Math.random() * topology.rows),
    col: Math.floor(Math.random() * topology.cols),
  };
  inMaze.add(key(start));

  // Add start's neighbors to frontier
  for (const dir of ALL_DIRECTIONS) {
    const neighbor = topology.neighbor(start, dir);
    if (neighbor) {
      frontier.push({
        cell: neighbor,
        from: start,
        wk: wallKey(start, neighbor),
      });
    }
  }

  while (frontier.length > 0) {
    const idx = Math.floor(Math.random() * frontier.length);
    const edge = frontier[idx];
    frontier.splice(idx, 1);

    if (inMaze.has(key(edge.cell))) continue;

    // Add cell to maze and remove wall
    inMaze.add(key(edge.cell));
    walls.delete(edge.wk);

    // Add new neighbors to frontier
    for (const dir of ALL_DIRECTIONS) {
      const neighbor = topology.neighbor(edge.cell, dir);
      if (neighbor && !inMaze.has(key(neighbor))) {
        frontier.push({
          cell: neighbor,
          from: edge.cell,
          wk: wallKey(edge.cell, neighbor),
        });
      }
    }
  }

  return { walls, crossings: new Map() };
}

export function generateMaze(
  topology: Topology,
  algorithm: AlgorithmType,
  weave: boolean = false,
): GenerationResult {
  switch (algorithm) {
    case "dfs":
      return generateDFS(topology, weave);
    case "kruskal":
      return generateKruskal(topology);
    case "prim":
      return generatePrim(topology);
  }
}

/** A step yielded during animation: wall key removed, plus optional crossing info */
export interface AnimationStep {
  wallKey: string;
  crossing?: { cellKey: string; over: CrossingOver };
}

/** Step-by-step DFS generation for animation */
function* generateDFSSteps(topology: Topology, weave: boolean = false): Generator<AnimationStep, GenerationResult> {
  const walls = createAllWalls(topology);
  const visited = new Set<string>();
  const crossings = new Map<string, CrossingOver>();
  const stack: CellCoord[] = [];
  const key = (c: CellCoord) => `${c.row},${c.col}`;

  const start: CellCoord = {
    row: Math.floor(Math.random() * topology.rows),
    col: Math.floor(Math.random() * topology.cols),
  };
  visited.add(key(start));
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: { cell: CellCoord; wk: string }[] = [];
    for (const dir of shuffle([...ALL_DIRECTIONS])) {
      const neighbor = topology.neighbor(current, dir);
      if (neighbor && !visited.has(key(neighbor))) {
        neighbors.push({ cell: neighbor, wk: wallKey(current, neighbor) });
      }
    }
    if (neighbors.length === 0) {
      if (weave) {
        let tunneled = false;
        for (const dir of shuffle([...ALL_DIRECTIONS])) {
          const result = canTunnel(current, dir, topology, walls, visited, crossings);
          if (result) {
            const { far, mid } = result;
            const wk1 = wallKey(current, mid);
            const wk2 = wallKey(mid, far);
            walls.delete(wk1);
            walls.delete(wk2);
            const isHorizontal = dir === "east" || dir === "west";
            const over: CrossingOver = isHorizontal ? "v" : "h";
            crossings.set(key(mid), over);
            visited.add(key(far));
            stack.push(far);
            yield { wallKey: wk1, crossing: { cellKey: key(mid), over } };
            yield { wallKey: wk2 };
            tunneled = true;
            break;
          }
        }
        if (!tunneled) {
          stack.pop();
        }
      } else {
        stack.pop();
      }
    } else {
      const chosen = neighbors[0];
      walls.delete(chosen.wk);
      visited.add(key(chosen.cell));
      stack.push(chosen.cell);
      yield { wallKey: chosen.wk };
    }
  }
  return { walls, crossings };
}

/** Step-by-step Kruskal's generation for animation */
function* generateKruskalSteps(topology: Topology): Generator<AnimationStep, GenerationResult> {
  const walls = createAllWalls(topology);
  const uf = new UnionFind(topology.rows * topology.cols);
  const edges: { a: CellCoord; b: CellCoord; wk: string }[] = [];
  for (let row = 0; row < topology.rows; row++) {
    for (let col = 0; col < topology.cols; col++) {
      const cell: CellCoord = { row, col };
      for (const dir of ALL_DIRECTIONS) {
        const neighbor = topology.neighbor(cell, dir);
        if (neighbor) {
          const wk = wallKey(cell, neighbor);
          if (!edges.some((e) => e.wk === wk)) {
            edges.push({ a: cell, b: neighbor, wk });
          }
        }
      }
    }
  }
  shuffle(edges);
  for (const edge of edges) {
    const ia = cellIndex(edge.a, topology.cols);
    const ib = cellIndex(edge.b, topology.cols);
    if (uf.union(ia, ib)) {
      walls.delete(edge.wk);
      yield { wallKey: edge.wk };
    }
  }
  return { walls, crossings: new Map() };
}

/** Step-by-step Prim's generation for animation */
function* generatePrimSteps(topology: Topology): Generator<AnimationStep, GenerationResult> {
  const walls = createAllWalls(topology);
  const inMaze = new Set<string>();
  const frontier: { cell: CellCoord; from: CellCoord; wk: string }[] = [];
  const key = (c: CellCoord) => `${c.row},${c.col}`;

  const start: CellCoord = {
    row: Math.floor(Math.random() * topology.rows),
    col: Math.floor(Math.random() * topology.cols),
  };
  inMaze.add(key(start));
  for (const dir of ALL_DIRECTIONS) {
    const neighbor = topology.neighbor(start, dir);
    if (neighbor) {
      frontier.push({ cell: neighbor, from: start, wk: wallKey(start, neighbor) });
    }
  }

  while (frontier.length > 0) {
    const idx = Math.floor(Math.random() * frontier.length);
    const edge = frontier[idx];
    frontier.splice(idx, 1);
    if (inMaze.has(key(edge.cell))) continue;
    inMaze.add(key(edge.cell));
    walls.delete(edge.wk);
    yield { wallKey: edge.wk };
    for (const dir of ALL_DIRECTIONS) {
      const neighbor = topology.neighbor(edge.cell, dir);
      if (neighbor && !inMaze.has(key(neighbor))) {
        frontier.push({ cell: neighbor, from: edge.cell, wk: wallKey(edge.cell, neighbor) });
      }
    }
  }
  return { walls, crossings: new Map() };
}

/** Create a step-by-step generator for animated maze generation */
export function generateMazeSteps(
  topology: Topology,
  algorithm: AlgorithmType,
  weave: boolean = false,
): Generator<AnimationStep, GenerationResult> {
  switch (algorithm) {
    case "dfs":
      return generateDFSSteps(topology, weave);
    case "kruskal":
      return generateKruskalSteps(topology);
    case "prim":
      return generatePrimSteps(topology);
  }
}
