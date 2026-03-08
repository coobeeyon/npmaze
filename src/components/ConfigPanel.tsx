import type { MazeConfig, SurfaceType, AlgorithmType } from "../types";

interface ConfigPanelProps {
  config: MazeConfig;
  editMode: boolean;
  showSolution: boolean;
  animating: boolean;
  onConfigChange: (config: MazeConfig) => void;
  onGenerate: () => void;
  onAnimate: () => void;
  onStopAnimation: () => void;
  onToggleEdit: () => void;
  onToggleSolution: () => void;
}

const SURFACES: { value: SurfaceType; label: string; desc: string }[] = [
  { value: "rectangle", label: "Rectangle", desc: "Flat, bounded maze" },
  { value: "cylinder", label: "Cylinder", desc: "Left-right edges connect" },
  { value: "torus", label: "Torus", desc: "All edges wrap around" },
  { value: "mobius", label: "Möbius Strip", desc: "Left-right edges connect with flip" },
  { value: "klein", label: "Klein Bottle", desc: "Left-right flip + top-bottom wrap" },
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
}: ConfigPanelProps) {
  return (
    <div className="config-panel" role="form" aria-label="Maze configuration">
      <div className="config-section">
        <label className="config-label" htmlFor="surface-select">Surface</label>
        <select
          id="surface-select"
          className="config-select"
          value={config.surface}
          onChange={(e) =>
            onConfigChange({ ...config, surface: e.target.value as SurfaceType })
          }
        >
          {SURFACES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="config-desc">
          {SURFACES.find((s) => s.value === config.surface)?.desc}
        </span>
      </div>

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
            ? "Paths can cross over/under each other (DFS only)"
            : "Standard planar maze"}
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
      </div>
    </div>
  );
}
