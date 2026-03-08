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
  exploredCells?: Set<string> | null;
}

export function MazeCanvas({ maze, editMode, solutionPath, start, end, placementMode, onToggleWall, onPlaceCell, exploredCells = null }: MazeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredWall, setHoveredWall] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const didDrag = useRef(false);

  // Reset zoom/pan when maze config changes
  const prevConfigRef = useRef(maze.config);
  useEffect(() => {
    const prev = prevConfigRef.current;
    if (prev.rows !== maze.config.rows || prev.cols !== maze.config.cols || prev.surface !== maze.config.surface) {
      setZoom(1);
      setPanX(0);
      setPanY(0);
      prevConfigRef.current = maze.config;
    }
  }, [maze.config]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Virtual canvas dimensions (what drawMaze sees)
    const virtualW = rect.width / zoom;
    const virtualH = rect.height / zoom;

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    const logicalCanvas = {
      ...canvas,
      width: virtualW,
      height: virtualH,
    };
    Object.defineProperty(ctx, "canvas", {
      get: () => logicalCanvas,
      configurable: true,
    });

    drawMaze(ctx, maze, editMode, hoveredWall, solutionPath, start, end, exploredCells);
    ctx.restore();
  }, [maze, editMode, hoveredWall, solutionPath, start, end, exploredCells, zoom, panX, panY]);

  useEffect(() => {
    redraw();
    window.addEventListener("resize", redraw);
    return () => window.removeEventListener("resize", redraw);
  }, [redraw]);

  // Transform screen coordinates to virtual canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: (screenX - panX) / zoom,
        y: (screenY - panY) / zoom,
      };
    },
    [zoom, panX, panY],
  );

  const getMousePos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const { x, y } = screenToCanvas(screenX, screenY);
      return {
        x,
        y,
        w: rect.width / zoom,
        h: rect.height / zoom,
      };
    },
    [screenToCanvas, zoom],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (didDrag.current) return;
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Middle mouse button or Ctrl+click always pans
      // When not in edit/placement mode, any button pans
      const shouldPan = e.button === 1 || e.ctrlKey || (!editMode && !placementMode);
      if (!shouldPan) {
        // Still track drag state for edit/placement clicks
        didDrag.current = false;
        return;
      }

      isPanning.current = true;
      didDrag.current = false;
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: panX,
        panY: panY,
      };
      e.preventDefault();
    },
    [editMode, placementMode, panX, panY],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPanning.current) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          didDrag.current = true;
        }
        setPanX(panStart.current.panX + dx);
        setPanY(panStart.current.panY + dy);
        return;
      }

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

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredWall(null);
    isPanning.current = false;
  }, []);

  // Wheel zoom — zoom toward cursor position
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

      setZoom((prevZoom) => {
        const newZoom = Math.min(Math.max(prevZoom * zoomFactor, 0.25), 10);
        const scale = newZoom / prevZoom;

        // Adjust pan so zoom centers on cursor
        setPanX((prevPanX) => mouseX - scale * (mouseX - prevPanX));
        setPanY((prevPanY) => mouseY - scale * (mouseY - prevPanY));

        return newZoom;
      });
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, []);

  const isZoomed = zoom !== 1 || panX !== 0 || panY !== 0;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        className="maze-canvas"
        role="img"
        aria-label={`${maze.config.rows} by ${maze.config.cols} maze on a ${maze.config.surface} surface${editMode ? ", edit mode active — click walls to toggle" : ""}`}
        tabIndex={0}
        style={{
          width: "100%",
          height: "100%",
          cursor: isPanning.current
            ? "grabbing"
            : editMode || placementMode
              ? "crosshair"
              : "grab",
        }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      {isZoomed && (
        <button
          onClick={handleResetView}
          className="reset-view-btn"
          title="Reset zoom and pan"
        >
          {Math.round(zoom * 100)}% — Reset View
        </button>
      )}
    </div>
  );
}
