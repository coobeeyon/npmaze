export type Direction = "north" | "south" | "east" | "west";

export interface CellCoord {
  row: number;
  col: number;
}

export type SurfaceType =
  | "rectangle"
  | "cylinder"
  | "torus"
  | "mobius"
  | "klein";

export type AlgorithmType = "dfs" | "kruskal" | "prim";

export interface MazeConfig {
  rows: number;
  cols: number;
  surface: SurfaceType;
  algorithm: AlgorithmType;
  weave: boolean;
  seed: number;
}

/** Crossing orientation: which passage goes over */
export type CrossingOver = "h" | "v"; // "h" = E-W over, "v" = N-S over

export interface MazeState {
  config: MazeConfig;
  /** Set of wall keys that are present (walls not removed) */
  walls: Set<string>;
  /** Map of cell key -> crossing orientation (which direction is the overpass) */
  crossings: Map<string, CrossingOver>;
}
