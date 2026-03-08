import { useRef, useEffect, useCallback, useState } from "react";
import type { CellCoord, MazeState } from "../types";
import { drawMaze, hitTestWall, hitTestCell } from "../rendering/drawMaze";

export type PlacementMode = "start" | "end" | null;

interface MazeCanvasProps {
  maze: MazeState;
  editMode: boolean;
  solutionPath: CellCoord[] | null;
  start: CellCoord;
  end: CellCoord;
  placementMode: PlacementMode;
  onToggleWall: (wallKey: string) => void;
  onPlaceCell: (cell: CellCoord) => void;
}

export function MazeCanvas({ maze, editMode, solutionPath, start, end, placementMode, onToggleWall, onPlaceCell }: MazeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredWall, setHoveredWall] = useState<string | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle DPI scaling
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Reset canvas logical size for drawing
    const logicalCanvas = {
      ...canvas,
      width: rect.width,
      height: rect.height,
    };
    Object.defineProperty(ctx, "canvas", {
      get: () => logicalCanvas,
      configurable: true,
    });

    drawMaze(ctx, maze, editMode, hoveredWall, solutionPath, start, end);
  }, [maze, editMode, hoveredWall, solutionPath, start, end]);

  useEffect(() => {
    redraw();
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, [redraw]);

  const getMousePos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        w: rect.width,
        h: rect.height,
      };
    },
    [],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getMousePos(e);
      if (!pos) return;

      if (placementMode) {
        const cell = hitTestCell(pos.x, pos.y, maze, pos.w, pos.h);
        if (cell) onPlaceCell(cell);
        return;
      }

      if (!editMode) return;
      const wk = hitTestWall(pos.x, pos.y, maze, pos.w, pos.h);
      if (wk) onToggleWall(wk);
    },
    [editMode, placementMode, maze, getMousePos, onToggleWall, onPlaceCell],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!editMode) {
        if (hoveredWall) setHoveredWall(null);
        return;
      }
      const pos = getMousePos(e);
      if (!pos) return;
      const wk = hitTestWall(pos.x, pos.y, maze, pos.w, pos.h);
      setHoveredWall(wk);
    },
    [editMode, maze, getMousePos, hoveredWall],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredWall(null);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="maze-canvas"
      role="img"
      aria-label={`${maze.config.rows} by ${maze.config.cols} maze on a ${maze.config.surface} surface${editMode ? ", edit mode active — click walls to toggle" : ""}`}
      tabIndex={0}
      style={{
        width: "100%",
        height: "100%",
        cursor: editMode || placementMode ? "crosshair" : "default",
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  );
}
