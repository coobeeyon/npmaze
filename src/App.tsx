import { useState, useCallback } from "react";
import type { MazeConfig, MazeState } from "./types";
import { createTopology } from "./maze/topology";
import { generateMaze } from "./maze/algorithms";
import { MazeCanvas } from "./components/MazeCanvas";
import { ConfigPanel } from "./components/ConfigPanel";
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

  const handleGenerate = useCallback(() => {
    setMaze(createMaze(config));
    setEditMode(false);
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
            onConfigChange={setConfig}
            onGenerate={handleGenerate}
            onToggleEdit={() => setEditMode((e) => !e)}
          />
        </aside>

        <main className="maze-container">
          <MazeCanvas
            maze={maze}
            editMode={editMode}
            onToggleWall={handleToggleWall}
          />
        </main>
      </div>
    </div>
  );
}
