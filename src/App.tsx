import { useState, useCallback, useMemo } from "react";
import type { CellCoord, MazeConfig, MazeState } from "./types";
import { createTopology } from "./maze/topology";
import { generateMaze } from "./maze/algorithms";
import { solveMaze } from "./maze/solver";
import { MazeCanvas } from "./components/MazeCanvas";
import { ConfigPanel } from "./components/ConfigPanel";
import { TopologyInfo } from "./components/TopologyInfo";
import "./App.css";

const DEFAULT_CONFIG: MazeConfig = {
  rows: 12,
  cols: 16,
  surface: "rectangle",
  algorithm: "dfs",
};

function createMaze(config: MazeConfig): MazeState {
  const topology = createTopology(config.surface, config.rows, config.cols);
  const walls = generateMaze(topology, config.algorithm);
  return { config, walls };
}

export default function App() {
  const [config, setConfig] = useState<MazeConfig>(DEFAULT_CONFIG);
  const [maze, setMaze] = useState<MazeState>(() => createMaze(DEFAULT_CONFIG));
  const [editMode, setEditMode] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const solutionPath = useMemo<CellCoord[] | null>(() => {
    if (!showSolution) return null;
    const topology = createTopology(maze.config.surface, maze.config.rows, maze.config.cols);
    const start: CellCoord = { row: 0, col: 0 };
    const end: CellCoord = { row: maze.config.rows - 1, col: maze.config.cols - 1 };
    return solveMaze(topology, maze.walls, start, end);
  }, [showSolution, maze]);

  const handleGenerate = useCallback(() => {
    setMaze(createMaze(config));
    setEditMode(false);
    setShowSolution(false);
  }, [config]);

  const handleToggleWall = useCallback((wallKey: string) => {
    setMaze((prev) => {
      const newWalls = new Set(prev.walls);
      if (newWalls.has(wallKey)) {
        newWalls.delete(wallKey);
      } else {
        newWalls.add(wallKey);
      }
      return { ...prev, walls: newWalls };
    });
    setShowSolution(false);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-pig">&#x1f439;</div>
        <div>
          <h1 className="header-title">Skinny Pig Maze</h1>
          <p className="header-subtitle">Non-planar maze generator</p>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <ConfigPanel
            config={config}
            editMode={editMode}
            showSolution={showSolution}
            onConfigChange={setConfig}
            onGenerate={handleGenerate}
            onToggleEdit={() => setEditMode((e) => !e)}
            onToggleSolution={() => setShowSolution((s) => !s)}
          />
          <TopologyInfo surface={config.surface} />
        </aside>

        <main className="maze-container">
          <MazeCanvas
            maze={maze}
            editMode={editMode}
            solutionPath={solutionPath}
            onToggleWall={handleToggleWall}
          />
        </main>
      </div>
    </div>
  );
}
