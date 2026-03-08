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
}

export interface MazeState {
  config: MazeConfig;
  /** Set of wall keys that are present (walls not removed) */
  walls: Set<string>;
}
