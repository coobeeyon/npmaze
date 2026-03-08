import type { CellCoord } from "../types";
import { ALL_DIRECTIONS, type Topology } from "./topology";
import { wallKey } from "./walls";

export interface DifficultyScore {
  /** 0-100 overall difficulty rating */
  rating: number;
  /** Solution path length */
  pathLength: number;
  /** Number of dead ends in the maze */
  deadEnds: number;
  /** Number of junctions (cells with 3+ exits) */
  junctions: number;
  /** Total number of cells */
  totalCells: number;
  /** Total number of open passages */
  totalPassages: number;
  /** Average exits per cell */
  avgExits: number;
  /** Descriptive label */
  label: string;
}

/** Count the number of open passages from a cell (ignoring crossings for simplicity) */
function countExits(
  cell: CellCoord,
  topology: Topology,
  walls: Set<string>,
): number {
  let exits = 0;
  for (const dir of ALL_DIRECTIONS) {
    const neighbor = topology.neighbor(cell, dir);
    if (neighbor && !walls.has(wallKey(cell, neighbor))) {
      exits++;
    }
  }
  return exits;
}

export function scoreDifficulty(
  topology: Topology,
  walls: Set<string>,
  solutionPath: CellCoord[] | null,
): DifficultyScore {
  const totalCells = topology.rows * topology.cols;
  let deadEnds = 0;
  let junctions = 0;
  let totalExits = 0;

  for (let row = 0; row < topology.rows; row++) {
    for (let col = 0; col < topology.cols; col++) {
      const exits = countExits({ row, col }, topology, walls);
      totalExits += exits;
      if (exits === 1) deadEnds++;
      if (exits >= 3) junctions++;
    }
  }

  // Each passage is counted from both sides
  const totalPassages = totalExits / 2;
  const avgExits = totalCells > 0 ? totalExits / totalCells : 0;

  const pathLength = solutionPath?.length ?? 0;

  // Scoring components (each 0-1, combined into 0-100):
  // 1. Path length ratio: longer paths relative to maze size = harder
  const pathRatio = pathLength > 0 ? pathLength / totalCells : 0;
  const pathScore = Math.min(pathRatio * 1.5, 1); // max out at 67% coverage

  // 2. Dead end ratio: more dead ends = more wrong turns possible
  const deadEndRatio = deadEnds / totalCells;
  const deadEndScore = Math.min(deadEndRatio * 3, 1); // typical is ~25-35%

  // 3. Junction ratio: more junctions = more decisions
  const junctionRatio = junctions / totalCells;
  const junctionScore = Math.min(junctionRatio * 5, 1); // typical is ~10-20%

  // Weighted combination
  const raw = pathScore * 0.5 + deadEndScore * 0.25 + junctionScore * 0.25;
  const rating = Math.round(raw * 100);

  let label: string;
  if (rating < 20) label = "Trivial";
  else if (rating < 40) label = "Easy";
  else if (rating < 60) label = "Medium";
  else if (rating < 80) label = "Hard";
  else label = "Expert";

  return { rating, pathLength, deadEnds, junctions, totalCells, totalPassages, avgExits: Math.round(avgExits * 100) / 100, label };
}
