import type { CellCoord, AlgorithmType, CrossingOver, Direction } from "../types";
import { ALL_DIRECTIONS, type Topology, oppositeDir } from "./topology";
import { createAllWalls, wallKey } from "./walls";
import { UnionFind } from "./union-find";

/** Result of maze generation including crossings */
export interface GenerationResult {
  walls: Set<string>;
  crossings: Map<string, CrossingOver>;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cellIndex(cell: CellCoord, cols: number): number {
  return cell.row * cols + cell.col;
}

const cellKey = (c: CellCoord) => `${c.row},${c.col}`;

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
  const mid = topology.neighbor(cell, dir);
  if (!mid || !visited.has(cellKey(mid)) || crossings.has(cellKey(mid))) return null;

  const far = topology.neighbor(mid, dir);
  if (!far || visited.has(cellKey(far))) return null;

  // Check mid has perpendicular passage (walls in tunnel direction, open perpendicular)
  const opp = oppositeDir(dir);
  const isHorizontal = dir === "east" || dir === "west";
  const perpDirs: Direction[] = isHorizontal ? ["north", "south"] : ["east", "west"];
  const tunnelDirs: Direction[] = [dir, opp];

  // Mid must have walls in the tunnel direction (not yet carved through)
  for (const d of tunnelDirs) {
    const n = topology.neighbor(mid, d);
    if (!n) return null;
    const wk = wallKey(mid, n);
    if (!walls.has(wk)) return null;
  }

  // Mid must have open passages in perpendicular direction
  for (const d of perpDirs) {
    const n = topology.neighbor(mid, d);
    if (!n) return null;
    const wk = wallKey(mid, n);
    if (walls.has(wk)) return null;
  }

  return { far, mid };
}

/**
 * Execute a tunnel: carve through mid, register crossing, mark far visited.
 * Returns the crossing orientation.
 */
function executeTunnel(
  cell: CellCoord,
  mid: CellCoord,
  far: CellCoord,
  dir: Direction,
  walls: Set<string>,
  crossings: Map<string, CrossingOver>,
): CrossingOver {
  walls.delete(wallKey(cell, mid));
  walls.delete(wallKey(mid, far));
  const isHorizontal = dir === "east" || dir === "west";
  const over: CrossingOver = isHorizontal ? "v" : "h";
  crossings.set(cellKey(mid), over);
  return over;
}

/** Recursive backtracker (DFS) maze generation */
function generateDFS(topology: Topology, weave: boolean = false, rng: () => number = Math.random, density: number = 0.5): GenerationResult {
  const walls = createAllWalls(topology);
  const visited = new Set<string>();
  const crossings = new Map<string, CrossingOver>();
  const stack: CellCoord[] = [];

  const start: CellCoord = {
    row: Math.floor(rng() * topology.rows),
    col: Math.floor(rng() * topology.cols),
  };
  visited.add(cellKey(start));
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const dirs = shuffle([...ALL_DIRECTIONS], rng);

    // If weave enabled, try tunneling opportunistically before normal neighbors
    if (weave) {
      let tunneled = false;
      for (const dir of dirs) {
        if (rng() >= density) continue;
        const result = canTunnel(current, dir, topology, walls, visited, crossings);
        if (result) {
          const { far, mid } = result;
          executeTunnel(current, mid, far, dir, walls, crossings);
          visited.add(cellKey(far));
          stack.push(far);
          tunneled = true;
          break;
        }
      }
      if (tunneled) continue;
    }

    // Normal neighbor exploration
    const neighbors: { cell: CellCoord; wk: string }[] = [];
    for (const dir of dirs) {
      const neighbor = topology.neighbor(current, dir);
      if (neighbor && !visited.has(cellKey(neighbor))) {
        neighbors.push({ cell: neighbor, wk: wallKey(current, neighbor) });
      }
    }

    if (neighbors.length === 0) {
      // Dead end: try tunneling as fallback (always attempt at dead ends when weave on)
      if (weave) {
        let tunneled = false;
        for (const dir of shuffle([...ALL_DIRECTIONS], rng)) {
          const result = canTunnel(current, dir, topology, walls, visited, crossings);
          if (result) {
            const { far, mid } = result;
            executeTunnel(current, mid, far, dir, walls, crossings);
            visited.add(cellKey(far));
            stack.push(far);
            tunneled = true;
            break;
          }
        }
        if (!tunneled) stack.pop();
      } else {
        stack.pop();
      }
    } else {
      const chosen = neighbors[0];
      walls.delete(chosen.wk);
      visited.add(cellKey(chosen.cell));
      stack.push(chosen.cell);
    }
  }

  return { walls, crossings };
}

/**
 * Check if a cell can serve as a crossing for edge-based algorithms.
 * Similar to canTunnel but checks wall state for perpendicular passage
 * without requiring visited tracking (uses wall state instead).
 */
function canCreateCrossing(
  mid: CellCoord,
  dir: Direction,
  topology: Topology,
  walls: Set<string>,
  crossings: Map<string, CrossingOver>,
): boolean {
  if (crossings.has(cellKey(mid))) return false;

  const opp = oppositeDir(dir);
  const isHorizontal = dir === "east" || dir === "west";
  const perpDirs: Direction[] = isHorizontal ? ["north", "south"] : ["east", "west"];
  const tunnelDirs: Direction[] = [dir, opp];

  // Mid must have walls in the tunnel direction (not yet carved through)
  for (const d of tunnelDirs) {
    const n = topology.neighbor(mid, d);
    if (!n) return false;
    const wk = wallKey(mid, n);
    if (!walls.has(wk)) return false;
  }

  // Mid must have open passages in perpendicular direction
  for (const d of perpDirs) {
    const n = topology.neighbor(mid, d);
    if (!n) return false;
    const wk = wallKey(mid, n);
    if (walls.has(wk)) return false;
  }

  return true;
}

/** Kruskal's algorithm maze generation */
function generateKruskal(topology: Topology, weave: boolean = false, rng: () => number = Math.random, density: number = 0.5): GenerationResult {
  const walls = createAllWalls(topology);
  const crossings = new Map<string, CrossingOver>();
  const uf = new UnionFind(topology.rows * topology.cols);

  // Edge types: normal (adjacent) and tunnel (through a mid cell)
  type NormalEdge = { type: "normal"; a: CellCoord; b: CellCoord; wk: string };
  type TunnelEdge = { type: "tunnel"; a: CellCoord; mid: CellCoord; b: CellCoord; dir: Direction };
  type Edge = NormalEdge | TunnelEdge;

  // Collect all walls as edges
  const edges: Edge[] = [];
  const seenWalls = new Set<string>();
  for (let row = 0; row < topology.rows; row++) {
    for (let col = 0; col < topology.cols; col++) {
      const cell: CellCoord = { row, col };
      for (const dir of ALL_DIRECTIONS) {
        const neighbor = topology.neighbor(cell, dir);
        if (neighbor) {
          const wk = wallKey(cell, neighbor);
          if (!seenWalls.has(wk)) {
            seenWalls.add(wk);
            edges.push({ type: "normal", a: cell, b: neighbor, wk });
          }

          // Add tunnel edges with probability proportional to density
          if (weave && rng() < density) {
            const far = topology.neighbor(neighbor, dir);
            if (far) {
              edges.push({ type: "tunnel", a: cell, mid: neighbor, b: far, dir });
            }
          }
        }
      }
    }
  }

  shuffle(edges, rng);

  for (const edge of edges) {
    if (edge.type === "normal") {
      const ia = cellIndex(edge.a, topology.cols);
      const ib = cellIndex(edge.b, topology.cols);
      if (uf.union(ia, ib)) {
        walls.delete(edge.wk);
      }
    } else {
      // Tunnel edge: check if a and b are in different sets and mid can be a crossing
      const ia = cellIndex(edge.a, topology.cols);
      const ib = cellIndex(edge.b, topology.cols);
      if (uf.find(ia) !== uf.find(ib) && canCreateCrossing(edge.mid, edge.dir, topology, walls, crossings)) {
        uf.union(ia, ib);
        walls.delete(wallKey(edge.a, edge.mid));
        walls.delete(wallKey(edge.mid, edge.b));
        const isHorizontal = edge.dir === "east" || edge.dir === "west";
        crossings.set(cellKey(edge.mid), isHorizontal ? "v" : "h");
      }
    }
  }

  return { walls, crossings };
}

/** Prim's algorithm maze generation */
function generatePrim(topology: Topology, weave: boolean = false, rng: () => number = Math.random, density: number = 0.5): GenerationResult {
  const walls = createAllWalls(topology);
  const crossings = new Map<string, CrossingOver>();
  const inMaze = new Set<string>();

  type NormalFrontier = { type: "normal"; cell: CellCoord; from: CellCoord; wk: string };
  type TunnelFrontier = { type: "tunnel"; cell: CellCoord; mid: CellCoord; from: CellCoord; dir: Direction };
  type FrontierEntry = NormalFrontier | TunnelFrontier;

  const frontier: FrontierEntry[] = [];

  function addFrontierNeighbors(cell: CellCoord) {
    for (const dir of ALL_DIRECTIONS) {
      const neighbor = topology.neighbor(cell, dir);
      if (neighbor && !inMaze.has(cellKey(neighbor))) {
        frontier.push({
          type: "normal",
          cell: neighbor,
          from: cell,
          wk: wallKey(cell, neighbor),
        });
      }
      // Add tunnel frontier entries with probability proportional to density
      if (weave && neighbor && inMaze.has(cellKey(neighbor)) && rng() < density) {
        const far = topology.neighbor(neighbor, dir);
        if (far && !inMaze.has(cellKey(far))) {
          frontier.push({
            type: "tunnel",
            cell: far,
            mid: neighbor,
            from: cell,
            dir,
          });
        }
      }
    }
  }

  // Start from random cell
  const start: CellCoord = {
    row: Math.floor(rng() * topology.rows),
    col: Math.floor(rng() * topology.cols),
  };
  inMaze.add(cellKey(start));
  addFrontierNeighbors(start);

  while (frontier.length > 0) {
    const idx = Math.floor(rng() * frontier.length);
    const edge = frontier[idx];
    frontier.splice(idx, 1);

    if (inMaze.has(cellKey(edge.cell))) continue;

    if (edge.type === "normal") {
      inMaze.add(cellKey(edge.cell));
      walls.delete(edge.wk);
    } else {
      // Tunnel: check if mid cell can still be a crossing
      if (!canCreateCrossing(edge.mid, edge.dir, topology, walls, crossings)) continue;
      inMaze.add(cellKey(edge.cell));
      walls.delete(wallKey(edge.from, edge.mid));
      walls.delete(wallKey(edge.mid, edge.cell));
      const isHorizontal = edge.dir === "east" || edge.dir === "west";
      crossings.set(cellKey(edge.mid), isHorizontal ? "v" : "h");
    }

    addFrontierNeighbors(edge.cell);
  }

  return { walls, crossings };
}

export function generateMaze(
  topology: Topology,
  algorithm: AlgorithmType,
  weave: boolean = false,
  rng: () => number = Math.random,
  crossingDensity: number = 0.5,
): GenerationResult {
  switch (algorithm) {
    case "dfs":
      return generateDFS(topology, weave, rng, crossingDensity);
    case "kruskal":
      return generateKruskal(topology, weave, rng, crossingDensity);
    case "prim":
      return generatePrim(topology, weave, rng, crossingDensity);
  }
}

/** A step yielded during animation: wall key removed, plus optional crossing info */
export interface AnimationStep {
  wallKey: string;
  crossing?: { cellKey: string; over: CrossingOver };
}

/** Step-by-step DFS generation for animation */
function* generateDFSSteps(topology: Topology, weave: boolean = false, rng: () => number = Math.random, density: number = 0.5): Generator<AnimationStep, GenerationResult> {
  const walls = createAllWalls(topology);
  const visited = new Set<string>();
  const crossings = new Map<string, CrossingOver>();
  const stack: CellCoord[] = [];

  const start: CellCoord = {
    row: Math.floor(rng() * topology.rows),
    col: Math.floor(rng() * topology.cols),
  };
  visited.add(cellKey(start));
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const dirs = shuffle([...ALL_DIRECTIONS], rng);

    // If weave enabled, try tunneling opportunistically
    if (weave) {
      let tunneled = false;
      for (const dir of dirs) {
        if (rng() >= density) continue;
        const result = canTunnel(current, dir, topology, walls, visited, crossings);
        if (result) {
          const { far, mid } = result;
          const over = executeTunnel(current, mid, far, dir, walls, crossings);
          visited.add(cellKey(far));
          stack.push(far);
          yield { wallKey: wallKey(current, mid), crossing: { cellKey: cellKey(mid), over } };
          yield { wallKey: wallKey(mid, far) };
          tunneled = true;
          break;
        }
      }
      if (tunneled) continue;
    }

    const neighbors: { cell: CellCoord; wk: string }[] = [];
    for (const dir of dirs) {
      const neighbor = topology.neighbor(current, dir);
      if (neighbor && !visited.has(cellKey(neighbor))) {
        neighbors.push({ cell: neighbor, wk: wallKey(current, neighbor) });
      }
    }

    if (neighbors.length === 0) {
      if (weave) {
        let tunneled = false;
        for (const dir of shuffle([...ALL_DIRECTIONS], rng)) {
          const result = canTunnel(current, dir, topology, walls, visited, crossings);
          if (result) {
            const { far, mid } = result;
            const over = executeTunnel(current, mid, far, dir, walls, crossings);
            visited.add(cellKey(far));
            stack.push(far);
            yield { wallKey: wallKey(current, mid), crossing: { cellKey: cellKey(mid), over } };
            yield { wallKey: wallKey(mid, far) };
            tunneled = true;
            break;
          }
        }
        if (!tunneled) stack.pop();
      } else {
        stack.pop();
      }
    } else {
      const chosen = neighbors[0];
      walls.delete(chosen.wk);
      visited.add(cellKey(chosen.cell));
      stack.push(chosen.cell);
      yield { wallKey: chosen.wk };
    }
  }
  return { walls, crossings };
}

/** Step-by-step Kruskal's generation for animation */
function* generateKruskalSteps(topology: Topology, weave: boolean = false, rng: () => number = Math.random, density: number = 0.5): Generator<AnimationStep, GenerationResult> {
  const walls = createAllWalls(topology);
  const crossings = new Map<string, CrossingOver>();
  const uf = new UnionFind(topology.rows * topology.cols);

  type NormalEdge = { type: "normal"; a: CellCoord; b: CellCoord; wk: string };
  type TunnelEdge = { type: "tunnel"; a: CellCoord; mid: CellCoord; b: CellCoord; dir: Direction };
  type Edge = NormalEdge | TunnelEdge;

  const edges: Edge[] = [];
  const seenWalls = new Set<string>();
  for (let row = 0; row < topology.rows; row++) {
    for (let col = 0; col < topology.cols; col++) {
      const cell: CellCoord = { row, col };
      for (const dir of ALL_DIRECTIONS) {
        const neighbor = topology.neighbor(cell, dir);
        if (neighbor) {
          const wk = wallKey(cell, neighbor);
          if (!seenWalls.has(wk)) {
            seenWalls.add(wk);
            edges.push({ type: "normal", a: cell, b: neighbor, wk });
          }
          if (weave && rng() < density) {
            const far = topology.neighbor(neighbor, dir);
            if (far) {
              edges.push({ type: "tunnel", a: cell, mid: neighbor, b: far, dir });
            }
          }
        }
      }
    }
  }
  shuffle(edges, rng);

  for (const edge of edges) {
    if (edge.type === "normal") {
      const ia = cellIndex(edge.a, topology.cols);
      const ib = cellIndex(edge.b, topology.cols);
      if (uf.union(ia, ib)) {
        walls.delete(edge.wk);
        yield { wallKey: edge.wk };
      }
    } else {
      const ia = cellIndex(edge.a, topology.cols);
      const ib = cellIndex(edge.b, topology.cols);
      if (uf.find(ia) !== uf.find(ib) && canCreateCrossing(edge.mid, edge.dir, topology, walls, crossings)) {
        uf.union(ia, ib);
        const wk1 = wallKey(edge.a, edge.mid);
        const wk2 = wallKey(edge.mid, edge.b);
        walls.delete(wk1);
        walls.delete(wk2);
        const isHorizontal = edge.dir === "east" || edge.dir === "west";
        const over: CrossingOver = isHorizontal ? "v" : "h";
        crossings.set(cellKey(edge.mid), over);
        yield { wallKey: wk1, crossing: { cellKey: cellKey(edge.mid), over } };
        yield { wallKey: wk2 };
      }
    }
  }
  return { walls, crossings };
}

/** Step-by-step Prim's generation for animation */
function* generatePrimSteps(topology: Topology, weave: boolean = false, rng: () => number = Math.random, density: number = 0.5): Generator<AnimationStep, GenerationResult> {
  const walls = createAllWalls(topology);
  const crossings = new Map<string, CrossingOver>();
  const inMaze = new Set<string>();

  type NormalFrontier = { type: "normal"; cell: CellCoord; from: CellCoord; wk: string };
  type TunnelFrontier = { type: "tunnel"; cell: CellCoord; mid: CellCoord; from: CellCoord; dir: Direction };
  type FrontierEntry = NormalFrontier | TunnelFrontier;

  const frontier: FrontierEntry[] = [];

  function addFrontierNeighbors(cell: CellCoord) {
    for (const dir of ALL_DIRECTIONS) {
      const neighbor = topology.neighbor(cell, dir);
      if (neighbor && !inMaze.has(cellKey(neighbor))) {
        frontier.push({
          type: "normal",
          cell: neighbor,
          from: cell,
          wk: wallKey(cell, neighbor),
        });
      }
      if (weave && neighbor && inMaze.has(cellKey(neighbor)) && rng() < density) {
        const far = topology.neighbor(neighbor, dir);
        if (far && !inMaze.has(cellKey(far))) {
          frontier.push({
            type: "tunnel",
            cell: far,
            mid: neighbor,
            from: cell,
            dir,
          });
        }
      }
    }
  }

  const start: CellCoord = {
    row: Math.floor(rng() * topology.rows),
    col: Math.floor(rng() * topology.cols),
  };
  inMaze.add(cellKey(start));
  addFrontierNeighbors(start);

  while (frontier.length > 0) {
    const idx = Math.floor(rng() * frontier.length);
    const edge = frontier[idx];
    frontier.splice(idx, 1);

    if (inMaze.has(cellKey(edge.cell))) continue;

    if (edge.type === "normal") {
      inMaze.add(cellKey(edge.cell));
      walls.delete(edge.wk);
      yield { wallKey: edge.wk };
    } else {
      if (!canCreateCrossing(edge.mid, edge.dir, topology, walls, crossings)) continue;
      inMaze.add(cellKey(edge.cell));
      const wk1 = wallKey(edge.from, edge.mid);
      const wk2 = wallKey(edge.mid, edge.cell);
      walls.delete(wk1);
      walls.delete(wk2);
      const isHorizontal = edge.dir === "east" || edge.dir === "west";
      const over: CrossingOver = isHorizontal ? "v" : "h";
      crossings.set(cellKey(edge.mid), over);
      yield { wallKey: wk1, crossing: { cellKey: cellKey(edge.mid), over } };
      yield { wallKey: wk2 };
    }

    addFrontierNeighbors(edge.cell);
  }
  return { walls, crossings };
}

/** Create a step-by-step generator for animated maze generation */
export function generateMazeSteps(
  topology: Topology,
  algorithm: AlgorithmType,
  weave: boolean = false,
  rng: () => number = Math.random,
  crossingDensity: number = 0.5,
): Generator<AnimationStep, GenerationResult> {
  switch (algorithm) {
    case "dfs":
      return generateDFSSteps(topology, weave, rng, crossingDensity);
    case "kruskal":
      return generateKruskalSteps(topology, weave, rng, crossingDensity);
    case "prim":
      return generatePrimSteps(topology, weave, rng, crossingDensity);
  }
}
