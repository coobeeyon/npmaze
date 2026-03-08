import { useState, useCallback, useMemo, useRef } from "react";
import type { CellCoord, MazeConfig, MazeState } from "./types";
import { createTopology } from "./maze/topology";
import { generateMaze, generateMazeSteps } from "./maze/algorithms";
import { createAllWalls } from "./maze/walls";
import { solveMaze } from "./maze/solver";
import { MazeCanvas, type PlacementMode } from "./components/MazeCanvas";
import { ConfigPanel } from "./components/ConfigPanel";
import { TopologyInfo } from "./components/TopologyInfo";
import { DifficultyPanel } from "./components/DifficultyPanel";
import { exportMazePNG } from "./rendering/drawMaze";
import { scoreDifficulty } from "./maze/difficulty";
import "./App.css";

const DEFAULT_CONFIG: MazeConfig = {
  rows: 12,
  cols: 16,
  surface: "rectangle",
  algorithm: "dfs",
  weave: false,
};

function createMaze(config: MazeConfig): MazeState {
  const topology = createTopology(config.surface, config.rows, config.cols);
  const result = generateMaze(topology, config.algorithm, config.weave);
  return { config, walls: result.walls, crossings: result.crossings };
}

export default function App() {
  const [config, setConfig] = useState<MazeConfig>(DEFAULT_CONFIG);
  const [maze, setMaze] = useState<MazeState>(() => createMaze(DEFAULT_CONFIG));
  const [editMode, setEditMode] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [start, setStart] = useState<CellCoord>({ row: 0, col: 0 });
  const [end, setEnd] = useState<CellCoord>({ row: DEFAULT_CONFIG.rows - 1, col: DEFAULT_CONFIG.cols - 1 });
  const [placementMode, setPlacementMode] = useState<PlacementMode>(null);
  const animationRef = useRef<number | null>(null);

  const solutionPath = useMemo<CellCoord[] | null>(() => {
    if (!showSolution) return null;
    const topology = createTopology(maze.config.surface, maze.config.rows, maze.config.cols);
    return solveMaze(topology, maze.walls, start, end, maze.crossings);
  }, [showSolution, maze, start, end]);

  const difficulty = useMemo(() => {
    const topology = createTopology(maze.config.surface, maze.config.rows, maze.config.cols);
    const path = solveMaze(topology, maze.walls, start, end, maze.crossings);
    return scoreDifficulty(topology, maze.walls, path, maze.crossings);
  }, [maze, start, end]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setAnimating(false);
  }, []);

  const handleGenerate = useCallback(() => {
    stopAnimation();
    setMaze(createMaze(config));
    setEditMode(false);
    setShowSolution(false);
    setStart({ row: 0, col: 0 });
    setEnd({ row: config.rows - 1, col: config.cols - 1 });
    setPlacementMode(null);
  }, [config, stopAnimation]);

  const handleAnimate = useCallback(() => {
    stopAnimation();
    setEditMode(false);
    setShowSolution(false);
    setStart({ row: 0, col: 0 });
    setEnd({ row: config.rows - 1, col: config.cols - 1 });
    setPlacementMode(null);

    const topology = createTopology(config.surface, config.rows, config.cols);
    const allWalls = createAllWalls(topology);
    const gen = generateMazeSteps(topology, config.algorithm, config.weave);

    setMaze({ config, walls: allWalls, crossings: new Map() });
    setAnimating(true);

    // Process multiple steps per frame for larger mazes
    const stepsPerFrame = Math.max(1, Math.floor((config.rows * config.cols) / 120));
    let lastTime = 0;
    const frameDelay = 16; // ~60fps

    function step(timestamp: number) {
      if (timestamp - lastTime < frameDelay) {
        animationRef.current = requestAnimationFrame(step);
        return;
      }
      lastTime = timestamp;

      const removedWalls: string[] = [];
      const newCrossings: { cellKey: string; over: import("./types").CrossingOver }[] = [];
      for (let i = 0; i < stepsPerFrame; i++) {
        const result = gen.next();
        if (result.done) {
          setAnimating(false);
          animationRef.current = null;
          return;
        }
        removedWalls.push(result.value.wallKey);
        if (result.value.crossing) {
          newCrossings.push(result.value.crossing);
        }
      }

      setMaze((prev) => {
        const newWalls = new Set(prev.walls);
        for (const wk of removedWalls) {
          newWalls.delete(wk);
        }
        const crossingsMap = newCrossings.length > 0
          ? new Map(prev.crossings)
          : prev.crossings;
        for (const c of newCrossings) {
          crossingsMap.set(c.cellKey, c.over);
        }
        return { ...prev, walls: newWalls, crossings: crossingsMap };
      });

      animationRef.current = requestAnimationFrame(step);
    }

    animationRef.current = requestAnimationFrame(step);
  }, [config, stopAnimation]);

  const handleExport = useCallback(() => {
    exportMazePNG(maze, solutionPath, start, end);
  }, [maze, solutionPath, start, end]);

  const handlePlaceCell = useCallback((cell: CellCoord) => {
    if (placementMode === "start") {
      setStart(cell);
    } else if (placementMode === "end") {
      setEnd(cell);
    }
    setPlacementMode(null);
    setShowSolution(false);
  }, [placementMode]);

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
            animating={animating}
            onConfigChange={setConfig}
            onGenerate={handleGenerate}
            onAnimate={handleAnimate}
            onStopAnimation={stopAnimation}
            onToggleEdit={() => setEditMode((e) => !e)}
            onToggleSolution={() => setShowSolution((s) => !s)}
            onExport={handleExport}
            placementMode={placementMode}
            onSetPlacement={setPlacementMode}
          />
          <TopologyInfo surface={config.surface} />
          <DifficultyPanel score={difficulty} />
        </aside>

        <main className="maze-container">
          <MazeCanvas
            maze={maze}
            editMode={editMode}
            solutionPath={solutionPath}
            start={start}
            end={end}
            placementMode={placementMode}
            onToggleWall={handleToggleWall}
            onPlaceCell={handlePlaceCell}
          />
        </main>
      </div>
    </div>
  );
}
