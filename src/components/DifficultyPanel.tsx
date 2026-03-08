import type { DifficultyScore } from "../maze/difficulty";

interface DifficultyPanelProps {
  score: DifficultyScore;
}

export function DifficultyPanel({ score }: DifficultyPanelProps) {
  return (
    <div className="topology-info">
      <h3 className="topology-name">Difficulty: {score.label}</h3>
      <div className="difficulty-bar">
        <div
          className="difficulty-fill"
          style={{ width: `${score.rating}%` }}
        />
      </div>
      <p className="topology-desc">
        Path: {score.pathLength} cells
        {" \u00B7 "}
        Dead ends: {score.deadEnds}
        {" \u00B7 "}
        Junctions: {score.junctions}
      </p>
      <p className="topology-desc" style={{ marginTop: 4 }}>
        Cells: {score.totalCells}
        {" \u00B7 "}
        Passages: {score.totalPassages}
        {" \u00B7 "}
        Avg exits: {score.avgExits}
      </p>
    </div>
  );
}
