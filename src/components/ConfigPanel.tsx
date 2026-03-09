import type { MazeConfig, AlgorithmType } from "../types";
import type { PlacementMode } from "./MazeCanvas";

interface ConfigPanelProps {
  config: MazeConfig;
  editMode: boolean;
  showSolution: boolean;
  animating: boolean;
  placementMode: PlacementMode;
  onConfigChange: (config: MazeConfig) => void;
  onGenerate: () => void;
  onAnimate: () => void;
  onStopAnimation: () => void;
  onToggleEdit: () => void;
  onToggleSolution: () => void;
  onExport: () => void;
  onExportSVG: () => void;
  onSetPlacement: (mode: PlacementMode) => void;
  solvingAnimating: boolean;
  onAnimateSolve: () => void;
  onStopSolverAnimation: () => void;
  onCopyLink: () => void;
  linkCopied: boolean;
}

const SIZE_PRESETS: { label: string; rows: number; cols: number }[] = [
  { label: "Small", rows: 8, cols: 10 },
  { label: "Medium", rows: 16, cols: 20 },
  { label: "Large", rows: 30, cols: 40 },
];

const ALGORITHMS: { value: AlgorithmType; label: string }[] = [
  { value: "dfs", label: "Recursive Backtracker" },
  { value: "kruskal", label: "Kruskal's" },
  { value: "prim", label: "Prim's" },
];

export function ConfigPanel({
  config,
  editMode,
  showSolution,
  animating,
  onConfigChange,
  onGenerate,
  onAnimate,
  onStopAnimation,
  onToggleEdit,
  onToggleSolution,
  onExport,
  onExportSVG,
  placementMode,
  onSetPlacement,
  solvingAnimating,
  onAnimateSolve,
  onStopSolverAnimation,
  onCopyLink,
  linkCopied,
}: ConfigPanelProps) {
  return (
    <div className="config-panel" role="form" aria-label="Maze configuration">
      <div className="config-section">
        <label className="config-label">
          Rows: {config.rows}
        </label>
        <input
          type="range"
          className="config-slider"
          min={3}
          max={40}
          value={config.rows}
          onChange={(e) =>
            onConfigChange({ ...config, rows: Number(e.target.value) })
          }
        />
      </div>

      <div className="config-section">
        <label className="config-label">
          Columns: {config.cols}
        </label>
        <input
          type="range"
          className="config-slider"
          min={3}
          max={40}
          value={config.cols}
          onChange={(e) =>
            onConfigChange({ ...config, cols: Number(e.target.value) })
          }
        />
      </div>

      <div className="config-section">
        <label className="config-label">Size Presets</label>
        <div className="preset-buttons">
          {SIZE_PRESETS.map((p) => (
            <button
              key={p.label}
              className="btn-preset"
              onClick={() => onConfigChange({ ...config, rows: p.rows, cols: p.cols })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="config-section">
        <label className="config-label">Algorithm</label>
        <select
          className="config-select"
          value={config.algorithm}
          onChange={(e) =>
            onConfigChange({
              ...config,
              algorithm: e.target.value as AlgorithmType,
            })
          }
        >
          {ALGORITHMS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div className="config-section">
        <label className="config-label config-checkbox-label">
          <input
            type="checkbox"
            checked={config.weave}
            onChange={(e) =>
              onConfigChange({ ...config, weave: e.target.checked })
            }
          />
          Weave (crossings)
        </label>
        <span className="config-desc">
          {config.weave
            ? "Paths can cross over/under each other"
            : "Standard planar maze"}
        </span>
      </div>

      <div className="config-section">
        <label className="config-label" htmlFor="seed-input">Seed</label>
        <div style={{ display: "flex", gap: "4px" }}>
          <input
            id="seed-input"
            className="config-select"
            style={{ flex: 1, fontFamily: "monospace", fontSize: "0.8rem" }}
            value={config.seed.toString(16).toUpperCase()}
            aria-describedby="seed-desc"
            onChange={(e) => {
              const val = parseInt(e.target.value, 16);
              if (!isNaN(val)) {
                onConfigChange({ ...config, seed: val >>> 0 });
              }
            }}
          />
        </div>
        <span id="seed-desc" className="config-desc">
          Enter a hex seed to reproduce a maze
        </span>
      </div>

      <div className="config-buttons">
        <button className="btn btn-primary" onClick={onGenerate} disabled={animating}>
          Generate Maze
        </button>
        <button
          className={`btn ${animating ? "btn-active" : "btn-secondary"}`}
          onClick={animating ? onStopAnimation : onAnimate}
        >
          {animating ? "Stop Animation" : "Animate"}
        </button>
        <button
          className={`btn ${editMode ? "btn-active" : "btn-secondary"}`}
          onClick={onToggleEdit}
        >
          {editMode ? "Exit Edit" : "Edit Walls"}
        </button>
        <button
          className={`btn ${showSolution ? "btn-active" : "btn-secondary"}`}
          onClick={onToggleSolution}
        >
          {showSolution ? "Hide Solution" : "Show Solution"}
        </button>
        <button
          className={`btn ${solvingAnimating ? "btn-active" : "btn-secondary"}`}
          onClick={solvingAnimating ? onStopSolverAnimation : onAnimateSolve}
        >
          {solvingAnimating ? "Stop Solving" : "Animate Solve"}
        </button>
        <button
          className={`btn ${placementMode === "start" ? "btn-active" : "btn-secondary"}`}
          onClick={() => onSetPlacement(placementMode === "start" ? null : "start")}
        >
          {placementMode === "start" ? "Click a cell..." : "Set Start"}
        </button>
        <button
          className={`btn ${placementMode === "end" ? "btn-active" : "btn-secondary"}`}
          onClick={() => onSetPlacement(placementMode === "end" ? null : "end")}
        >
          {placementMode === "end" ? "Click a cell..." : "Set End"}
        </button>
        <button className="btn btn-secondary" onClick={onExport}>
          Export PNG
        </button>
        <button className="btn btn-secondary" onClick={onExportSVG}>
          Export SVG
        </button>
        <button className="btn btn-secondary" onClick={onCopyLink}>
          {linkCopied ? "Link Copied!" : "Copy Link"}
        </button>
        <button className="btn btn-secondary" onClick={() => window.print()}>
          Print
        </button>
      </div>
    </div>
  );
}
