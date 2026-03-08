import type { CellCoord, AlgorithmType } from "../types";
import { ALL_DIRECTIONS, type Topology } from "./topology";
import { createAllWalls, wallKey } from "./walls";
import { UnionFind } from "./union-find";

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

/** Recursive backtracker (DFS) maze generation */
function generateDFS(topology: Topology): Set<string> {
  const walls = createAllWalls(topology);
  const visited = new Set<string>();
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
      stack.pop();
    } else {
      const chosen = neighbors[0];
      walls.delete(chosen.wk);
      visited.add(key(chosen.cell));
      stack.push(chosen.cell);
    }
  }

  return walls;
}

/** Kruskal's algorithm maze generation */
function generateKruskal(topology: Topology): Set<string> {
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

  return walls;
}

/** Prim's algorithm maze generation */
function generatePrim(topology: Topology): Set<string> {
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

  return walls;
}

export function generateMaze(
  topology: Topology,
  algorithm: AlgorithmType,
): Set<string> {
  switch (algorithm) {
    case "dfs":
      return generateDFS(topology);
    case "kruskal":
      return generateKruskal(topology);
    case "prim":
      return generatePrim(topology);
  }
}
