import { useRef, useEffect, useCallback, useState } from "react";
import type { CellCoord, MazeState } from "../types";
import type { ThemeMode } from "../theme/colors";
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
  theme?: ThemeMode;
}

export function MazeCanvas({ maze, editMode, solutionPath, start, end, placementMode, onToggleWall, onPlaceCell, exploredCells = null, theme }: MazeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredWall, setHoveredWall] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isPanning = useRef(false);
  const [cursorStyle, setCursorStyle] = useState<string>("grab");
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const didDrag = useRef(false);
  const touchRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number; pinchDist: number; pinchZoom: number; pinchCenterX: number; pinchCenterY: number } | null>(null);

  // Update cursor when mode changes
  useEffect(() => {
    if (!isPanning.current) {
      setCursorStyle(editMode || placementMode ? "crosshair" : "grab");
    }
  }, [editMode, placementMode]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- theme changes COLORS module state, must trigger redraw
  }, [maze, editMode, hoveredWall, solutionPath, start, end, exploredCells, zoom, panX, panY, theme]);

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
      setCursorStyle("grabbing");
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
    setCursorStyle(editMode || placementMode ? "crosshair" : "grab");
  }, [editMode, placementMode]);

  const handleMouseLeave = useCallback(() => {
    setHoveredWall(null);
    isPanning.current = false;
    setCursorStyle(editMode || placementMode ? "crosshair" : "grab");
  }, [editMode, placementMode]);

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

  // Touch support: single-touch pan/tap, two-finger pinch-to-zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getTouchDist(t1: Touch, t2: Touch) {
      return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    }

    function handleTouchStart(e: TouchEvent) {
      e.preventDefault();
      const rect = canvas!.getBoundingClientRect();

      if (e.touches.length === 2) {
        // Pinch start
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        touchRef.current = {
          startX: cx, startY: cy,
          startPanX: panX, startPanY: panY,
          pinchDist: dist, pinchZoom: zoom,
          pinchCenterX: cx, pinchCenterY: cy,
        };
        didDrag.current = true; // suppress tap
      } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchRef.current = {
          startX: touch.clientX, startY: touch.clientY,
          startPanX: panX, startPanY: panY,
          pinchDist: 0, pinchZoom: zoom,
          pinchCenterX: 0, pinchCenterY: 0,
        };
        didDrag.current = false;
      }
    }

    function handleTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (!touchRef.current) return;

      if (e.touches.length === 2) {
        // Pinch zoom
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        const rect = canvas!.getBoundingClientRect();
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        const scale = dist / touchRef.current.pinchDist;
        const newZoom = Math.min(Math.max(touchRef.current.pinchZoom * scale, 0.25), 10);
        const zoomRatio = newZoom / touchRef.current.pinchZoom;

        // Zoom centered on pinch midpoint, plus pan delta
        const origCX = touchRef.current.pinchCenterX;
        const origCY = touchRef.current.pinchCenterY;
        const newPanX = cx - zoomRatio * (origCX - touchRef.current.startPanX);
        const newPanY = cy - zoomRatio * (origCY - touchRef.current.startPanY);

        setZoom(newZoom);
        setPanX(newPanX);
        setPanY(newPanY);
        didDrag.current = true;
      } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - touchRef.current.startX;
        const dy = touch.clientY - touchRef.current.startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          didDrag.current = true;
        }
        setPanX(touchRef.current.startPanX + dx);
        setPanY(touchRef.current.startPanY + dy);
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 0 && !didDrag.current && touchRef.current) {
        // Tap — simulate click at touch position
        const rect = canvas!.getBoundingClientRect();
        const screenX = touchRef.current.startX - rect.left;
        const screenY = touchRef.current.startY - rect.top;
        const virtualW = rect.width / zoom;
        const virtualH = rect.height / zoom;
        const x = (screenX - panX) / zoom;
        const y = (screenY - panY) / zoom;

        if (placementMode) {
          const cell = hitTestCell(x, y, maze, virtualW, virtualH);
          if (cell) onPlaceCell(cell);
        } else if (editMode) {
          const wk = hitTestWall(x, y, maze, virtualW, virtualH);
          if (wk) onToggleWall(wk);
        }
      }
      if (e.touches.length === 0) {
        touchRef.current = null;
      }
    }

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [zoom, panX, panY, editMode, placementMode, maze, onToggleWall, onPlaceCell]);

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
        aria-label={`${maze.config.rows} by ${maze.config.cols} maze on a ${maze.config.surface} surface${editMode ? ", edit mode active — click walls to toggle" : placementMode ? `, placing ${placementMode} point — click a cell` : ""}`}
        tabIndex={0}
        style={{
          width: "100%",
          height: "100%",
          touchAction: "none",
          cursor: cursorStyle,
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
