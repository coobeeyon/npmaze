import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { CellCoord, MazeConfig, MazeState } from "./types";
import { createTopology } from "./maze/topology";
import { generateMaze, generateMazeSteps } from "./maze/algorithms";
import { createAllWalls } from "./maze/walls";
import { solveMaze, solveMazeSteps } from "./maze/solver";
import { MazeCanvas, type PlacementMode } from "./components/MazeCanvas";
import { ConfigPanel } from "./components/ConfigPanel";
import { TopologyInfo } from "./components/TopologyInfo";
import { DifficultyPanel } from "./components/DifficultyPanel";
import { ShortcutHelp } from "./components/ShortcutHelp";
import { exportMazePNG, exportMazeSVG } from "./rendering/drawMaze";
import { scoreDifficulty } from "./maze/difficulty";
import { mulberry32, randomSeed } from "./maze/rng";
import { useTheme } from "./theme/useTheme";
import "./App.css";

const DEFAULT_CONFIG: MazeConfig = {
  rows: 12,
  cols: 16,
  surface: "rectangle",
  algorithm: "dfs",
  weave: false,
  seed: randomSeed(),
};

/** Parse maze config from URL search params, falling back to defaults */
function parseConfigFromURL(): MazeConfig {
  const params = new URLSearchParams(window.location.search);
  const config = { ...DEFAULT_CONFIG };

  const seed = params.get("seed");
  if (seed) {
    const val = parseInt(seed, 16);
    if (!isNaN(val)) config.seed = val >>> 0;
  }

  const rows = params.get("rows");
  if (rows) {
    const val = parseInt(rows, 10);
    if (val >= 3 && val <= 40) config.rows = val;
  }

  const cols = params.get("cols");
  if (cols) {
    const val = parseInt(cols, 10);
    if (val >= 3 && val <= 40) config.cols = val;
  }

  const surface = params.get("surface");
  if (surface && ["rectangle", "cylinder", "torus", "mobius", "klein"].includes(surface)) {
    config.surface = surface as MazeConfig["surface"];
  }

  const algorithm = params.get("algo");
  if (algorithm && ["dfs", "kruskal", "prim"].includes(algorithm)) {
    config.algorithm = algorithm as MazeConfig["algorithm"];
  }

  const weave = params.get("weave");
  if (weave === "1") config.weave = true;
  if (weave === "0") config.weave = false;

  return config;
}

/** Build a shareable URL for a maze config */
function buildShareURL(config: MazeConfig): string {
  const params = new URLSearchParams();
  params.set("seed", config.seed.toString(16).toUpperCase());
  params.set("rows", config.rows.toString());
  params.set("cols", config.cols.toString());
  if (config.surface !== "rectangle") params.set("surface", config.surface);
  if (config.algorithm !== "dfs") params.set("algo", config.algorithm);
  if (config.weave) params.set("weave", "1");
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

function createMaze(config: MazeConfig): MazeState {
  const topology = createTopology(config.surface, config.rows, config.cols);
  const rng = mulberry32(config.seed);
  const result = generateMaze(topology, config.algorithm, config.weave, rng);
  return { config, walls: result.walls, crossings: result.crossings };
}

export default function App() {
  const [config, setConfig] = useState<MazeConfig>(() => parseConfigFromURL());
  const [maze, setMaze] = useState<MazeState>(() => createMaze(parseConfigFromURL()));
  const [linkCopied, setLinkCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [start, setStart] = useState<CellCoord>({ row: 0, col: 0 });
  const [end, setEnd] = useState<CellCoord>(() => ({ row: config.rows - 1, col: config.cols - 1 }));
  const [placementMode, setPlacementMode] = useState<PlacementMode>(null);
  const [solvingAnimating, setSolvingAnimating] = useState(false);
  const [exploredCells, setExploredCells] = useState<Set<string> | null>(null);
  const animationRef = useRef<number | null>(null);
  const solverAnimationRef = useRef<number | null>(null);
  const editHistoryRef = useRef<string[]>([]);
  const editRedoRef = useRef<string[]>([]);
  const { theme, toggleTheme } = useTheme();

  const solutionPath = useMemo<CellCoord[] | null>(() => {
    if (!showSolution) return null;
    const topology = createTopology(maze.config.surface, maze.config.rows, maze.config.cols);
    return solveMaze(topology, maze.walls, start, end, maze.crossings);
  }, [showSolution, maze, start, end]);

  const difficulty = useMemo(() => {
    const topology = createTopology(maze.config.surface, maze.config.rows, maze.config.cols);
    const path = solveMaze(topology, maze.walls, start, end, maze.crossings);
    return scoreDifficulty(topology, maze.walls, path);
  }, [maze, start, end]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setAnimating(false);
  }, []);

  const stopSolverAnimation = useCallback(() => {
    if (solverAnimationRef.current !== null) {
      cancelAnimationFrame(solverAnimationRef.current);
      solverAnimationRef.current = null;
    }
    setSolvingAnimating(false);
  }, []);

  const handleGenerate = useCallback(() => {
    stopAnimation();
    stopSolverAnimation();
    const newSeed = randomSeed();
    const newConfig = { ...config, seed: newSeed };
    setConfig(newConfig);
    setMaze(createMaze(newConfig));
    setEditMode(false);
    setShowSolution(false);
    setExploredCells(null);
    editHistoryRef.current = [];
    editRedoRef.current = [];
    setStart({ row: 0, col: 0 });
    setEnd({ row: config.rows - 1, col: config.cols - 1 });
    setPlacementMode(null);
    window.history.replaceState(null, "", buildShareURL(newConfig));
  }, [config, stopAnimation, stopSolverAnimation]);

  const handleAnimate = useCallback(() => {
    stopAnimation();
    stopSolverAnimation();
    setEditMode(false);
    setShowSolution(false);
    setExploredCells(null);
    setStart({ row: 0, col: 0 });
    setEnd({ row: config.rows - 1, col: config.cols - 1 });
    setPlacementMode(null);

    const newSeed = randomSeed();
    const newConfig = { ...config, seed: newSeed };
    setConfig(newConfig);
    window.history.replaceState(null, "", buildShareURL(newConfig));
    const topology = createTopology(newConfig.surface, newConfig.rows, newConfig.cols);
    const allWalls = createAllWalls(topology);
    const rng = mulberry32(newSeed);
    const gen = generateMazeSteps(topology, newConfig.algorithm, newConfig.weave, rng);

    setMaze({ config: newConfig, walls: allWalls, crossings: new Map() });
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
  }, [config, stopAnimation, stopSolverAnimation]);

  const handleAnimateSolve = useCallback(() => {
    stopSolverAnimation();
    setShowSolution(false);
    setExploredCells(new Set());

    const topology = createTopology(maze.config.surface, maze.config.rows, maze.config.cols);
    const gen = solveMazeSteps(topology, maze.walls, start, end, maze.crossings);

    setSolvingAnimating(true);

    const stepsPerFrame = Math.max(1, Math.floor((maze.config.rows * maze.config.cols) / 200));
    let lastTime = 0;
    const frameDelay = 16;

    function step(timestamp: number) {
      if (timestamp - lastTime < frameDelay) {
        solverAnimationRef.current = requestAnimationFrame(step);
        return;
      }
      lastTime = timestamp;

      const newCells: CellCoord[] = [];
      for (let i = 0; i < stepsPerFrame; i++) {
        const result = gen.next();
        if (result.done) {
          setSolvingAnimating(false);
          solverAnimationRef.current = null;
          return;
        }
        newCells.push(result.value.cell);
        if (result.value.done) {
          // Final step — show the path
          setExploredCells((prev) => {
            const next = new Set(prev);
            for (const c of newCells) next.add(`${c.row},${c.col}`);
            return next;
          });
          if (result.value.path) {
            setShowSolution(true);
          }
          setSolvingAnimating(false);
          solverAnimationRef.current = null;
          return;
        }
      }

      setExploredCells((prev) => {
        const next = new Set(prev);
        for (const c of newCells) next.add(`${c.row},${c.col}`);
        return next;
      });

      solverAnimationRef.current = requestAnimationFrame(step);
    }

    solverAnimationRef.current = requestAnimationFrame(step);
  }, [maze, start, end, stopSolverAnimation]);

  const handleCopyLink = useCallback(() => {
    const url = buildShareURL(maze.config);
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
    // Update the URL bar without reloading
    window.history.replaceState(null, "", buildShareURL(maze.config));
  }, [maze.config]);

  const handleExport = useCallback(() => {
    exportMazePNG(maze, solutionPath, start, end);
  }, [maze, solutionPath, start, end]);

  const handleExportSVG = useCallback(() => {
    exportMazeSVG(maze, solutionPath, start, end);
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

  const toggleWall = useCallback((wk: string) => {
    setMaze((prev) => {
      const newWalls = new Set(prev.walls);
      if (newWalls.has(wk)) {
        newWalls.delete(wk);
      } else {
        newWalls.add(wk);
      }
      return { ...prev, walls: newWalls };
    });
    setShowSolution(false);
  }, []);

  const handleToggleWall = useCallback((wk: string) => {
    editHistoryRef.current.push(wk);
    editRedoRef.current = [];
    toggleWall(wk);
  }, [toggleWall]);

  const handleUndo = useCallback(() => {
    const wk = editHistoryRef.current.pop();
    if (!wk) return;
    editRedoRef.current.push(wk);
    toggleWall(wk);
  }, [toggleWall]);

  const handleRedo = useCallback(() => {
    const wk = editRedoRef.current.pop();
    if (!wk) return;
    editHistoryRef.current.push(wk);
    toggleWall(wk);
  }, [toggleWall]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!editMode) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (mod && (e.key === "Z" || (e.key === "z" && e.shiftKey) || e.key === "y")) {
        e.preventDefault();
        handleRedo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editMode, handleUndo, handleRedo]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-pig" aria-label="Skinny pig" role="img">&#x1f439;</div>
        <div>
          <h1 className="header-title">Skinny Pig Maze</h1>
          <p className="header-subtitle">Non-planar maze generator</p>
        </div>
        <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
          {theme === "light" ? "Dark" : "Light"}
        </button>
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
            onExportSVG={handleExportSVG}
            placementMode={placementMode}
            onSetPlacement={setPlacementMode}
            solvingAnimating={solvingAnimating}
            onAnimateSolve={handleAnimateSolve}
            onStopSolverAnimation={stopSolverAnimation}
            onCopyLink={handleCopyLink}
            linkCopied={linkCopied}
          />
          <TopologyInfo surface={config.surface} />
          <DifficultyPanel score={difficulty} />
          <ShortcutHelp />
        </aside>

        <main className="maze-container">
          <MazeCanvas
            theme={theme}
            maze={maze}
            editMode={editMode}
            solutionPath={solutionPath}
            start={start}
            end={end}
            placementMode={placementMode}
            onToggleWall={handleToggleWall}
            onPlaceCell={handlePlaceCell}
            exploredCells={exploredCells}
          />
        </main>
      </div>
    </div>
  );
}
