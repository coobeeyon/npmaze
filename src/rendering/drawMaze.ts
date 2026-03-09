import type { CellCoord, CrossingOver, Direction, MazeState } from "../types";
import { type Topology, ALL_DIRECTIONS, rectangleTopology } from "../maze/topology";
import { wallKey } from "../maze/walls";
import { COLORS } from "../theme/colors";

interface DrawOptions {
  cellSize: number;
  offsetX: number;
  offsetY: number;
  editMode: boolean;
  hoveredWall: string | null;
}

function getDrawOptions(
  ctx: CanvasRenderingContext2D,
  rows: number,
  cols: number,
): DrawOptions {
  const canvas = ctx.canvas;
  const maxCellW = (canvas.width - 60) / cols;
  const maxCellH = (canvas.height - 60) / rows;
  const cellSize = Math.floor(Math.min(maxCellW, maxCellH, 40));
  const mazeW = cellSize * cols;
  const mazeH = cellSize * rows;
  const offsetX = Math.floor((canvas.width - mazeW) / 2);
  const offsetY = Math.floor((canvas.height - mazeH) / 2);
  return { cellSize, offsetX, offsetY, editMode: false, hoveredWall: null };
}

/** Draw a skinny pig icon at a cell */
function drawPig(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  const s = size * 0.35;
  ctx.save();
  ctx.fillStyle = COLORS.pigPink;
  ctx.beginPath();
  ctx.ellipse(cx, cy, s, s * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.pigDark;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.6, cy - s * 0.5, s * 0.25, s * 0.3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.6, cy - s * 0.5, s * 0.25, s * 0.3, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.text;
  ctx.beginPath();
  ctx.arc(cx - s * 0.25, cy - s * 0.1, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + s * 0.25, cy - s * 0.1, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.pigDark;
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.15, s * 0.15, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draw a carrot at a cell */
function drawCarrot(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  const s = size * 0.3;
  ctx.save();
  ctx.fillStyle = COLORS.endColor;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s);
  ctx.lineTo(cx - s * 0.4, cy - s * 0.3);
  ctx.lineTo(cx + s * 0.4, cy - s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#66BB6A";
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.15, cy - s * 0.5, s * 0.1, s * 0.25, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.15, cy - s * 0.5, s * 0.1, s * 0.25, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Bezier control point offset for quarter-circle approximation */
const KAPPA = 0.5523;

/**
 * Check if a wall is present in a direction for a cell.
 * Returns true if boundary or wall exists.
 */
function hasWall(
  cell: CellCoord,
  dir: Direction,
  topology: Topology,
  walls: Set<string>,
): boolean {
  const neighbor = topology.neighbor(cell, dir);
  if (!neighbor) return true; // boundary
  return walls.has(wallKey(cell, neighbor));
}

/**
 * Draw a rounded corner where two perpendicular walls meet.
 * Carves a quarter-circle from the wall corner, rounding the corridor.
 */
function drawRoundedCorner(
  ctx: CanvasRenderingContext2D,
  cornerX: number,
  cornerY: number,
  wh: number,
  corner: "NW" | "NE" | "SW" | "SE",
) {
  const k = wh * KAPPA;
  ctx.beginPath();

  switch (corner) {
    case "NW": {
      // Grid corner at (cornerX, cornerY), corridor corner at (cornerX+wh, cornerY+wh)
      const cx = cornerX + wh, cy = cornerY + wh;
      ctx.moveTo(cornerX, cornerY);
      ctx.lineTo(cornerX, cy);
      ctx.bezierCurveTo(cornerX, cy - k, cx - k, cornerY, cx, cornerY);
      ctx.closePath();
      break;
    }
    case "NE": {
      const cx = cornerX - wh, cy = cornerY + wh;
      ctx.moveTo(cornerX, cornerY);
      ctx.lineTo(cx, cornerY);
      ctx.bezierCurveTo(cx + k, cornerY, cornerX, cy - k, cornerX, cy);
      ctx.closePath();
      break;
    }
    case "SW": {
      const cx = cornerX + wh, cy = cornerY - wh;
      ctx.moveTo(cornerX, cornerY);
      ctx.lineTo(cx, cornerY);
      ctx.bezierCurveTo(cx - k, cornerY, cornerX, cy + k, cornerX, cy);
      ctx.closePath();
      break;
    }
    case "SE": {
      const cx = cornerX - wh, cy = cornerY - wh;
      ctx.moveTo(cornerX, cornerY);
      ctx.lineTo(cornerX, cy);
      ctx.bezierCurveTo(cornerX, cy + k, cx + k, cornerY, cx, cornerY);
      ctx.closePath();
      break;
    }
  }
  ctx.fill();
}

/**
 * Carve the corridor for a single cell (fill with given color).
 * Fills inner rect, passage extensions, and rounded corners.
 */
function carveCellCorridor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  wh: number,
  wN: boolean,
  wS: boolean,
  wE: boolean,
  wW: boolean,
) {
  // Inner corridor rect (always present)
  ctx.fillRect(x + wh, y + wh, cellSize - 2 * wh, cellSize - 2 * wh);

  // Passage extensions for open walls
  if (!wN) ctx.fillRect(x + wh, y, cellSize - 2 * wh, wh);
  if (!wS) ctx.fillRect(x + wh, y + cellSize - wh, cellSize - 2 * wh, wh);
  if (!wW) ctx.fillRect(x, y + wh, wh, cellSize - 2 * wh);
  if (!wE) ctx.fillRect(x + cellSize - wh, y + wh, wh, cellSize - 2 * wh);

  // Corner fills where NEITHER wall is present (open corner = fill the corner too)
  if (!wN && !wW) ctx.fillRect(x, y, wh, wh);
  if (!wN && !wE) ctx.fillRect(x + cellSize - wh, y, wh, wh);
  if (!wS && !wW) ctx.fillRect(x, y + cellSize - wh, wh, wh);
  if (!wS && !wE) ctx.fillRect(x + cellSize - wh, y + cellSize - wh, wh, wh);

  // Rounded bezier corners where two perpendicular walls meet
  if (wN && wW) drawRoundedCorner(ctx, x, y, wh, "NW");
  if (wN && wE) drawRoundedCorner(ctx, x + cellSize, y, wh, "NE");
  if (wS && wW) drawRoundedCorner(ctx, x, y + cellSize, wh, "SW");
  if (wS && wE) drawRoundedCorner(ctx, x + cellSize, y + cellSize, wh, "SE");
}

/**
 * Draw a crossing cell with bridge/tunnel effect using thick-wall style.
 */
function drawCrossingCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  wh: number,
  over: CrossingOver,
) {
  const corridorWidth = cellSize - 2 * wh;

  if (over === "h") {
    // E-W is the overpass, N-S is the underpass

    // 1. Draw the underpass (N-S corridor through the cell)
    ctx.fillStyle = COLORS.cellBg;
    // Full N-S corridor extending to cell edges (no walls N or S in a crossing)
    ctx.fillRect(x + wh, y, corridorWidth, cellSize);

    // 2. Draw bridge walls across the underpass
    ctx.fillStyle = COLORS.wallColor;
    const bridgeTop = y + wh;
    const bridgeBottom = y + cellSize - wh;
    // Top bridge wall
    ctx.fillRect(x + wh, bridgeTop, corridorWidth, wh);
    // Bottom bridge wall
    ctx.fillRect(x + wh, bridgeBottom - wh, corridorWidth, wh);

    // 3. Draw the overpass (E-W corridor on top, covering bridge area)
    ctx.fillStyle = COLORS.cellBg;
    ctx.fillRect(x, y + wh, cellSize, corridorWidth);
  } else {
    // N-S is the overpass, E-W is the underpass

    // 1. Draw the underpass (E-W corridor)
    ctx.fillStyle = COLORS.cellBg;
    ctx.fillRect(x, y + wh, cellSize, corridorWidth);

    // 2. Draw bridge walls
    ctx.fillStyle = COLORS.wallColor;
    ctx.fillRect(x + wh, y + wh, wh, corridorWidth);
    ctx.fillRect(x + cellSize - 2 * wh, y + wh, wh, corridorWidth);

    // 3. Draw the overpass (N-S corridor on top)
    ctx.fillStyle = COLORS.cellBg;
    ctx.fillRect(x + wh, y, corridorWidth, cellSize);
  }
}

export function drawMaze(
  ctx: CanvasRenderingContext2D,
  maze: MazeState,
  editMode: boolean,
  hoveredWall: string | null,
  solutionPath: CellCoord[] | null = null,
  start: CellCoord = { row: 0, col: 0 },
  end: CellCoord = { row: maze.config.rows - 1, col: maze.config.cols - 1 },
  exploredCells: Set<string> | null = null,
) {
  const { config, walls } = maze;
  const topology = rectangleTopology(config.rows, config.cols);
  const canvas = ctx.canvas;
  const opts = getDrawOptions(ctx, config.rows, config.cols);
  const { cellSize, offsetX, offsetY } = opts;
  opts.editMode = editMode;
  opts.hoveredWall = hoveredWall;

  const wh = Math.max(cellSize * 0.15, 2); // wall half-thickness
  const crossings = maze.crossings;
  const crossingKey = (c: CellCoord) => `${c.row},${c.col}`;

  // 1. Clear canvas
  ctx.fillStyle = COLORS.bgPrimary;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Fill maze area with wall color
  ctx.fillStyle = COLORS.wallColor;
  ctx.fillRect(offsetX, offsetY, cellSize * config.cols, cellSize * config.rows);

  // 3. Carve corridors for each non-crossing cell
  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const cell: CellCoord = { row, col };
      if (crossings.has(crossingKey(cell))) continue;

      const x = offsetX + col * cellSize;
      const y = offsetY + row * cellSize;
      const wN = hasWall(cell, "north", topology, walls);
      const wS = hasWall(cell, "south", topology, walls);
      const wE = hasWall(cell, "east", topology, walls);
      const wW = hasWall(cell, "west", topology, walls);

      // Check if this cell is explored (solver animation)
      const isExplored = exploredCells?.has(`${row},${col}`);
      ctx.fillStyle = isExplored ? COLORS.explored : COLORS.cellBg;

      carveCellCorridor(ctx, x, y, cellSize, wh, wN, wS, wE, wW);
    }
  }

  // 4. Draw crossing cells
  for (const [ck, over] of crossings) {
    const [rowStr, colStr] = ck.split(",");
    const row = Number(rowStr);
    const col = Number(colStr);
    const x = offsetX + col * cellSize;
    const y = offsetY + row * cellSize;
    drawCrossingCell(ctx, x, y, cellSize, wh, over);
  }

  // 5. Draw start and end markers
  const startCx = offsetX + start.col * cellSize + cellSize / 2;
  const startCy = offsetY + start.row * cellSize + cellSize / 2;
  drawPig(ctx, startCx, startCy, cellSize);

  const endCx = offsetX + end.col * cellSize + cellSize / 2;
  const endCy = offsetY + end.row * cellSize + cellSize / 2;
  drawCarrot(ctx, endCx, endCy, cellSize);

  // 6. Draw solution path
  if (solutionPath && solutionPath.length > 1) {
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = Math.max(cellSize * 0.12, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    for (let i = 0; i < solutionPath.length; i++) {
      const cell = solutionPath[i];
      const cx = offsetX + cell.col * cellSize + cellSize / 2;
      const cy = offsetY + cell.row * cellSize + cellSize / 2;
      if (i === 0) {
        ctx.moveTo(cx, cy);
      } else {
        ctx.lineTo(cx, cy);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // 7. Draw hovered wall highlight (edit mode)
  if (editMode && hoveredWall) {
    drawWallHighlight(ctx, hoveredWall, topology, walls, opts, wh);
  }
}

/** Draw a highlighted wall segment for edit mode hover */
function drawWallHighlight(
  ctx: CanvasRenderingContext2D,
  wk: string,
  topology: Topology,
  walls: Set<string>,
  opts: DrawOptions,
  wh: number,
) {
  const { cellSize, offsetX, offsetY } = opts;
  // Find the wall's position by checking all cells
  for (let row = 0; row < topology.rows; row++) {
    for (let col = 0; col < topology.cols; col++) {
      const cell: CellCoord = { row, col };
      for (const dir of ALL_DIRECTIONS) {
        const neighbor = topology.neighbor(cell, dir);
        if (!neighbor) continue;
        if (wallKey(cell, neighbor) !== wk) continue;

        const x = offsetX + col * cellSize;
        const y = offsetY + row * cellSize;
        const isPresent = walls.has(wk);

        ctx.fillStyle = isPresent ? COLORS.wallHover : `${COLORS.wallHover}60`;
        ctx.globalAlpha = 0.5;

        switch (dir) {
          case "north":
            ctx.fillRect(x + wh, y - wh / 2, cellSize - 2 * wh, wh);
            break;
          case "south":
            ctx.fillRect(x + wh, y + cellSize - wh / 2, cellSize - 2 * wh, wh);
            break;
          case "west":
            ctx.fillRect(x - wh / 2, y + wh, wh, cellSize - 2 * wh);
            break;
          case "east":
            ctx.fillRect(x + cellSize - wh / 2, y + wh, wh, cellSize - 2 * wh);
            break;
        }
        ctx.globalAlpha = 1;
        return;
      }
    }
  }
}

/** Hit test: given a click position, find which cell was clicked */
export function hitTestCell(
  x: number,
  y: number,
  maze: MazeState,
  canvasWidth: number,
  canvasHeight: number,
): CellCoord | null {
  const { config } = maze;
  const maxCellW = (canvasWidth - 60) / config.cols;
  const maxCellH = (canvasHeight - 60) / config.rows;
  const cellSize = Math.floor(Math.min(maxCellW, maxCellH, 40));
  const mazeW = cellSize * config.cols;
  const mazeH = cellSize * config.rows;
  const offsetX = Math.floor((canvasWidth - mazeW) / 2);
  const offsetY = Math.floor((canvasHeight - mazeH) / 2);

  const col = Math.floor((x - offsetX) / cellSize);
  const row = Math.floor((y - offsetY) / cellSize);

  if (row < 0 || row >= config.rows || col < 0 || col >= config.cols) {
    return null;
  }
  return { row, col };
}

/** Export maze as PNG by drawing to an offscreen canvas at fixed resolution */
export function exportMazePNG(
  maze: MazeState,
  solutionPath: CellCoord[] | null = null,
  start?: CellCoord,
  end?: CellCoord,
) {
  const { config } = maze;
  const cellSize = 30;
  const padding = 40;
  const width = cellSize * config.cols + padding * 2;
  const height = cellSize * config.rows + padding * 2;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  drawMaze(ctx, maze, false, null, solutionPath, start, end);

  const link = document.createElement("a");
  link.download = `skinny-pig-maze-${config.rows}x${config.cols}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/** Build SVG corridor path data for a cell with rounded corners */
function svgCellCorridorPath(
  x: number,
  y: number,
  cellSize: number,
  wh: number,
  wN: boolean,
  wS: boolean,
  wE: boolean,
  wW: boolean,
): string {
  const k = wh * KAPPA;
  const parts: string[] = [];

  // Inner corridor rect
  parts.push(`<rect x="${x + wh}" y="${y + wh}" width="${cellSize - 2 * wh}" height="${cellSize - 2 * wh}"/>`);

  // Passage extensions
  if (!wN) parts.push(`<rect x="${x + wh}" y="${y}" width="${cellSize - 2 * wh}" height="${wh}"/>`);
  if (!wS) parts.push(`<rect x="${x + wh}" y="${y + cellSize - wh}" width="${cellSize - 2 * wh}" height="${wh}"/>`);
  if (!wW) parts.push(`<rect x="${x}" y="${y + wh}" width="${wh}" height="${cellSize - 2 * wh}"/>`);
  if (!wE) parts.push(`<rect x="${x + cellSize - wh}" y="${y + wh}" width="${wh}" height="${cellSize - 2 * wh}"/>`);

  // Open corners (no walls on either side)
  if (!wN && !wW) parts.push(`<rect x="${x}" y="${y}" width="${wh}" height="${wh}"/>`);
  if (!wN && !wE) parts.push(`<rect x="${x + cellSize - wh}" y="${y}" width="${wh}" height="${wh}"/>`);
  if (!wS && !wW) parts.push(`<rect x="${x}" y="${y + cellSize - wh}" width="${wh}" height="${wh}"/>`);
  if (!wS && !wE) parts.push(`<rect x="${x + cellSize - wh}" y="${y + cellSize - wh}" width="${wh}" height="${wh}"/>`);

  // Rounded corners where two walls meet
  if (wN && wW) {
    const cx = x + wh, cy = y + wh;
    parts.push(`<path d="M${x},${y} L${x},${cy} C${x},${cy - k} ${cx - k},${y} ${cx},${y} Z"/>`);
  }
  if (wN && wE) {
    const cx = x + cellSize - wh, cy = y + wh;
    const gx = x + cellSize;
    parts.push(`<path d="M${gx},${y} L${cx},${y} C${cx + k},${y} ${gx},${cy - k} ${gx},${cy} Z"/>`);
  }
  if (wS && wW) {
    const cx = x + wh, cy = y + cellSize - wh;
    const gy = y + cellSize;
    parts.push(`<path d="M${x},${gy} L${cx},${gy} C${cx - k},${gy} ${x},${cy + k} ${x},${cy} Z"/>`);
  }
  if (wS && wE) {
    const cx = x + cellSize - wh, cy = y + cellSize - wh;
    const gx = x + cellSize, gy = y + cellSize;
    parts.push(`<path d="M${gx},${gy} L${gx},${cy} C${gx},${cy + k} ${cx + k},${gy} ${cx},${gy} Z"/>`);
  }

  return parts.join("\n");
}

/** Export maze as SVG and trigger download */
export function exportMazeSVG(
  maze: MazeState,
  solutionPath: CellCoord[] | null = null,
  start: CellCoord = { row: 0, col: 0 },
  end: CellCoord = { row: maze.config.rows - 1, col: maze.config.cols - 1 },
) {
  const { config, walls } = maze;
  const topology = rectangleTopology(config.rows, config.cols);
  const cellSize = 30;
  const padding = 40;
  const width = cellSize * config.cols + padding * 2;
  const height = cellSize * config.rows + padding * 2;
  const offsetX = padding;
  const offsetY = padding;
  const wh = Math.max(cellSize * 0.15, 2);
  const crossings = maze.crossings;
  const crossingCellKey = (c: CellCoord) => `${c.row},${c.col}`;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  );

  // Background
  parts.push(`<rect width="${width}" height="${height}" fill="${COLORS.bgPrimary}"/>`);

  // Maze area filled with wall color
  parts.push(
    `<rect x="${offsetX}" y="${offsetY}" width="${cellSize * config.cols}" height="${cellSize * config.rows}" fill="${COLORS.wallColor}"/>`,
  );

  // Carve corridors
  parts.push(`<g fill="${COLORS.cellBg}">`);
  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const cell: CellCoord = { row, col };
      if (crossings.has(crossingCellKey(cell))) continue;

      const x = offsetX + col * cellSize;
      const y = offsetY + row * cellSize;
      const wN = hasWall(cell, "north", topology, walls);
      const wS = hasWall(cell, "south", topology, walls);
      const wE = hasWall(cell, "east", topology, walls);
      const wW = hasWall(cell, "west", topology, walls);

      parts.push(svgCellCorridorPath(x, y, cellSize, wh, wN, wS, wE, wW));
    }
  }
  parts.push("</g>");

  // Crossings
  const corridorWidth = cellSize - 2 * wh;
  for (const [ck, over] of crossings) {
    const [rowStr, colStr] = ck.split(",");
    const row = Number(rowStr);
    const col = Number(colStr);
    const x = offsetX + col * cellSize;
    const y = offsetY + row * cellSize;

    if (over === "h") {
      // E-W overpass, N-S underpass
      parts.push(`<rect x="${x + wh}" y="${y}" width="${corridorWidth}" height="${cellSize}" fill="${COLORS.cellBg}"/>`);
      parts.push(`<rect x="${x + wh}" y="${y + wh}" width="${corridorWidth}" height="${wh}" fill="${COLORS.wallColor}"/>`);
      parts.push(`<rect x="${x + wh}" y="${y + cellSize - 2 * wh}" width="${corridorWidth}" height="${wh}" fill="${COLORS.wallColor}"/>`);
      parts.push(`<rect x="${x}" y="${y + wh}" width="${cellSize}" height="${corridorWidth}" fill="${COLORS.cellBg}"/>`);
    } else {
      parts.push(`<rect x="${x}" y="${y + wh}" width="${cellSize}" height="${corridorWidth}" fill="${COLORS.cellBg}"/>`);
      parts.push(`<rect x="${x + wh}" y="${y + wh}" width="${wh}" height="${corridorWidth}" fill="${COLORS.wallColor}"/>`);
      parts.push(`<rect x="${x + cellSize - 2 * wh}" y="${y + wh}" width="${wh}" height="${corridorWidth}" fill="${COLORS.wallColor}"/>`);
      parts.push(`<rect x="${x + wh}" y="${y}" width="${corridorWidth}" height="${cellSize}" fill="${COLORS.cellBg}"/>`);
    }
  }

  // Start pig
  const startCx = offsetX + start.col * cellSize + cellSize / 2;
  const startCy = offsetY + start.row * cellSize + cellSize / 2;
  parts.push(svgPig(startCx, startCy, cellSize));

  // End carrot
  const endCx = offsetX + end.col * cellSize + cellSize / 2;
  const endCy = offsetY + end.row * cellSize + cellSize / 2;
  parts.push(svgCarrot(endCx, endCy, cellSize));

  // Solution path
  if (solutionPath && solutionPath.length > 1) {
    const pathWidth = Math.max(cellSize * 0.12, 2);
    const d = solutionPath.map((cell, i) => {
      const cx = offsetX + cell.col * cellSize + cellSize / 2;
      const cy = offsetY + cell.row * cellSize + cellSize / 2;
      return i === 0 ? `M${cx},${cy}` : `L${cx},${cy}`;
    }).join(" ");
    parts.push(
      `<path d="${d}" fill="none" stroke="${COLORS.accent}" stroke-width="${pathWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>`,
    );
  }

  parts.push("</svg>");

  const svgString = parts.join("\n");
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `skinny-pig-maze-${config.rows}x${config.cols}.svg`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

function svgPig(cx: number, cy: number, size: number): string {
  const s = size * 0.35;
  const parts: string[] = [];
  parts.push(
    `<ellipse cx="${cx}" cy="${cy}" rx="${s}" ry="${s * 0.75}" fill="${COLORS.pigPink}" stroke="${COLORS.pigDark}" stroke-width="1"/>`,
  );
  parts.push(
    `<ellipse cx="${cx - s * 0.6}" cy="${cy - s * 0.5}" rx="${s * 0.25}" ry="${s * 0.3}" transform="rotate(${(-0.3 * 180) / Math.PI} ${cx - s * 0.6} ${cy - s * 0.5})" fill="${COLORS.pigPink}" stroke="${COLORS.pigDark}" stroke-width="1"/>`,
  );
  parts.push(
    `<ellipse cx="${cx + s * 0.6}" cy="${cy - s * 0.5}" rx="${s * 0.25}" ry="${s * 0.3}" transform="rotate(${(0.3 * 180) / Math.PI} ${cx + s * 0.6} ${cy - s * 0.5})" fill="${COLORS.pigPink}" stroke="${COLORS.pigDark}" stroke-width="1"/>`,
  );
  parts.push(
    `<circle cx="${cx - s * 0.25}" cy="${cy - s * 0.1}" r="${s * 0.08}" fill="${COLORS.text}"/>`,
  );
  parts.push(
    `<circle cx="${cx + s * 0.25}" cy="${cy - s * 0.1}" r="${s * 0.08}" fill="${COLORS.text}"/>`,
  );
  parts.push(
    `<ellipse cx="${cx}" cy="${cy + s * 0.15}" rx="${s * 0.15}" ry="${s * 0.1}" fill="${COLORS.pigDark}"/>`,
  );
  return parts.join("\n");
}

function svgCarrot(cx: number, cy: number, size: number): string {
  const s = size * 0.3;
  const parts: string[] = [];
  parts.push(
    `<polygon points="${cx},${cy + s} ${cx - s * 0.4},${cy - s * 0.3} ${cx + s * 0.4},${cy - s * 0.3}" fill="${COLORS.endColor}"/>`,
  );
  parts.push(
    `<ellipse cx="${cx - s * 0.15}" cy="${cy - s * 0.5}" rx="${s * 0.1}" ry="${s * 0.25}" transform="rotate(${(-0.3 * 180) / Math.PI} ${cx - s * 0.15} ${cy - s * 0.5})" fill="#66BB6A"/>`,
  );
  parts.push(
    `<ellipse cx="${cx + s * 0.15}" cy="${cy - s * 0.5}" rx="${s * 0.1}" ry="${s * 0.25}" transform="rotate(${(0.3 * 180) / Math.PI} ${cx + s * 0.15} ${cy - s * 0.5})" fill="#66BB6A"/>`,
  );
  return parts.join("\n");
}

/** Hit test: given a click position, find the nearest wall key */
export function hitTestWall(
  x: number,
  y: number,
  maze: MazeState,
  canvasWidth: number,
  canvasHeight: number,
): string | null {
  const { config } = maze;
  const topology = rectangleTopology(config.rows, config.cols);

  const maxCellW = (canvasWidth - 60) / config.cols;
  const maxCellH = (canvasHeight - 60) / config.rows;
  const cellSize = Math.floor(Math.min(maxCellW, maxCellH, 40));
  const mazeW = cellSize * config.cols;
  const mazeH = cellSize * config.rows;
  const offsetX = Math.floor((canvasWidth - mazeW) / 2);
  const offsetY = Math.floor((canvasHeight - mazeH) / 2);

  const gx = (x - offsetX) / cellSize;
  const gy = (y - offsetY) / cellSize;

  if (gx < -0.2 || gy < -0.2 || gx > config.cols + 0.2 || gy > config.rows + 0.2) {
    return null;
  }

  const threshold = 0.2;
  let bestWall: string | null = null;
  let bestDist = threshold;

  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const cell: CellCoord = { row, col };
      for (const dir of ALL_DIRECTIONS) {
        const neighbor = topology.neighbor(cell, dir);
        if (!neighbor) continue;

        let wx: number, wy: number;
        switch (dir) {
          case "north": wx = col + 0.5; wy = row; break;
          case "south": wx = col + 0.5; wy = row + 1; break;
          case "west": wx = col; wy = row + 0.5; break;
          case "east": wx = col + 1; wy = row + 0.5; break;
        }

        const dist = Math.sqrt((gx - wx) ** 2 + (gy - wy) ** 2);
        if (dist < bestDist) {
          bestDist = dist;
          bestWall = wallKey(cell, neighbor);
        }
      }
    }
  }

  return bestWall;
}
