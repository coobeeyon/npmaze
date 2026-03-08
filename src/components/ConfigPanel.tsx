import type { MazeConfig, SurfaceType, AlgorithmType } from "../types";

interface ConfigPanelProps {
  config: MazeConfig;
  editMode: boolean;
  onConfigChange: (config: MazeConfig) => void;
  onGenerate: () => void;
  onToggleEdit: () => void;
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
  onConfigChange,
  onGenerate,
  onToggleEdit,
}: ConfigPanelProps) {
  return (
    <div className="config-panel">
      <div className="config-section">
        <label className="config-label">Surface</label>
        <select
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

      <div className="config-buttons">
        <button className="btn btn-primary" onClick={onGenerate}>
          Generate Maze
        </button>
        <button
          className={`btn ${editMode ? "btn-active" : "btn-secondary"}`}
          onClick={onToggleEdit}
        >
          {editMode ? "Exit Edit" : "Edit Walls"}
        </button>
      </div>
    </div>
  );
}
