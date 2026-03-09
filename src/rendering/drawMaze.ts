import type { CellCoord, CrossingOver, Direction, MazeState } from "../types";
import { type Topology, ALL_DIRECTIONS, rectangleTopology } from "../maze/topology";
import { wallKey } from "../maze/walls";
import { COLORS } from "../theme/colors";

const WALL_WIDTH = 2;

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
  // Body
  ctx.fillStyle = COLORS.pigPink;
  ctx.beginPath();
  ctx.ellipse(cx, cy, s, s * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.pigDark;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Ears
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.6, cy - s * 0.5, s * 0.25, s * 0.3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.6, cy - s * 0.5, s * 0.25, s * 0.3, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Eyes
  ctx.fillStyle = COLORS.text;
  ctx.beginPath();
  ctx.arc(cx - s * 0.25, cy - s * 0.1, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + s * 0.25, cy - s * 0.1, s * 0.08, 0, Math.PI * 2);
  ctx.fill();
  // Nose
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
  // Carrot body
  ctx.fillStyle = COLORS.endColor;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s);
  ctx.lineTo(cx - s * 0.4, cy - s * 0.3);
  ctx.lineTo(cx + s * 0.4, cy - s * 0.3);
  ctx.closePath();
  ctx.fill();
  // Leaves
  ctx.fillStyle = "#66BB6A";
  ctx.beginPath();
  ctx.ellipse(cx - s * 0.15, cy - s * 0.5, s * 0.1, s * 0.25, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.15, cy - s * 0.5, s * 0.1, s * 0.25, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw crossing cells with a bridge/tunnel visual effect.
 * The "over" passage is drawn on top with a bridge appearance.
 */
function drawCrossings(
  ctx: CanvasRenderingContext2D,
  _topology: Topology,
  crossings: Map<string, CrossingOver>,
  opts: DrawOptions,
) {
  const { cellSize, offsetX, offsetY } = opts;
  const gap = cellSize * 0.3; // gap size for the under-passage

  for (const [ck, over] of crossings) {
    const [rowStr, colStr] = ck.split(",");
    const row = Number(rowStr);
    const col = Number(colStr);
    const x = offsetX + col * cellSize;
    const y = offsetY + row * cellSize;
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;

    // The "under" passage has wall stubs on each side that stop at the bridge
    // The "over" passage has a bridge drawn over the center

    ctx.strokeStyle = COLORS.wallColor;
    ctx.lineWidth = WALL_WIDTH;
    ctx.lineCap = "round";

    if (over === "h") {
      // Horizontal (E-W) is over, vertical (N-S) goes under
      // Draw N-S under-passage: wall stubs on east and west that leave a gap in the center
      // East side wall stubs (north part and south part)
      ctx.beginPath();
      ctx.moveTo(x + cellSize, y);
      ctx.lineTo(x + cellSize, cy - gap);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + cellSize, cy + gap);
      ctx.lineTo(x + cellSize, y + cellSize);
      ctx.stroke();
      // West side wall stubs
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, cy - gap);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, cy + gap);
      ctx.lineTo(x, y + cellSize);
      ctx.stroke();

      // Draw the bridge for E-W passage: two horizontal lines across the gap
      // Fill bridge background to cover the under-passage
      ctx.fillStyle = COLORS.cellBg;
      ctx.fillRect(x, cy - gap, cellSize, gap * 2);
      // Bridge walls (north and south edges of the E-W corridor)
      ctx.strokeStyle = COLORS.wallColor;
      ctx.lineWidth = WALL_WIDTH;
      ctx.beginPath();
      ctx.moveTo(x, cy - gap);
      ctx.lineTo(x + cellSize, cy - gap);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, cy + gap);
      ctx.lineTo(x + cellSize, cy + gap);
      ctx.stroke();
    } else {
      // Vertical (N-S) is over, horizontal (E-W) goes under
      // Draw E-W under-passage: wall stubs on north and south that leave a gap
      // North side wall stubs
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(cx - gap, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + gap, y);
      ctx.lineTo(x + cellSize, y);
      ctx.stroke();
      // South side wall stubs
      ctx.beginPath();
      ctx.moveTo(x, y + cellSize);
      ctx.lineTo(cx - gap, y + cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + gap, y + cellSize);
      ctx.lineTo(x + cellSize, y + cellSize);
      ctx.stroke();

      // Draw the bridge for N-S passage
      ctx.fillStyle = COLORS.cellBg;
      ctx.fillRect(cx - gap, y, gap * 2, cellSize);
      // Bridge walls (east and west edges of the N-S corridor)
      ctx.strokeStyle = COLORS.wallColor;
      ctx.lineWidth = WALL_WIDTH;
      ctx.beginPath();
      ctx.moveTo(cx - gap, y);
      ctx.lineTo(cx - gap, y + cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + gap, y);
      ctx.lineTo(cx + gap, y + cellSize);
      ctx.stroke();
    }
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

  // Clear
  ctx.fillStyle = COLORS.bgPrimary;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw cells
  ctx.fillStyle = COLORS.cellBg;
  ctx.fillRect(
    offsetX,
    offsetY,
    cellSize * config.cols,
    cellSize * config.rows,
  );

  // Draw explored cells (solver animation)
  if (exploredCells && exploredCells.size > 0) {
    ctx.fillStyle = COLORS.explored;
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        if (exploredCells.has(`${row},${col}`)) {
          ctx.fillRect(
            offsetX + col * cellSize,
            offsetY + row * cellSize,
            cellSize,
            cellSize,
          );
        }
      }
    }
  }

  // Draw start and end
  const startCx = offsetX + start.col * cellSize + cellSize / 2;
  const startCy = offsetY + start.row * cellSize + cellSize / 2;
  drawPig(ctx, startCx, startCy, cellSize);

  const endCx = offsetX + end.col * cellSize + cellSize / 2;
  const endCy = offsetY + end.row * cellSize + cellSize / 2;
  drawCarrot(ctx, endCx, endCy, cellSize);

  // Draw walls (skip crossing cells — drawn separately)
  const crossings = maze.crossings;
  const crossingKey = (c: CellCoord) => `${c.row},${c.col}`;
  ctx.lineCap = "round";
  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const cell: CellCoord = { row, col };
      const x = offsetX + col * cellSize;
      const y = offsetY + row * cellSize;

      if (crossings.has(crossingKey(cell))) continue; // drawn later

      for (const dir of ALL_DIRECTIONS) {
        const neighbor = topology.neighbor(cell, dir);
        if (!neighbor) {
          // Boundary wall — always draw
          ctx.strokeStyle = COLORS.wallColor;
          ctx.lineWidth = WALL_WIDTH + 1;
          ctx.beginPath();
          switch (dir) {
            case "north":
              ctx.moveTo(x, y);
              ctx.lineTo(x + cellSize, y);
              break;
            case "south":
              ctx.moveTo(x, y + cellSize);
              ctx.lineTo(x + cellSize, y + cellSize);
              break;
            case "west":
              ctx.moveTo(x, y);
              ctx.lineTo(x, y + cellSize);
              break;
            case "east":
              ctx.moveTo(x + cellSize, y);
              ctx.lineTo(x + cellSize, y + cellSize);
              break;
          }
          ctx.stroke();
          continue;
        }

        const wk = wallKey(cell, neighbor);
        if (!walls.has(wk)) continue;

        // Draw internal wall
        const isHovered = hoveredWall === wk;
        ctx.strokeStyle = isHovered ? COLORS.wallHover : COLORS.wallColor;
        ctx.lineWidth = isHovered ? WALL_WIDTH + 2 : WALL_WIDTH;
        ctx.beginPath();
        switch (dir) {
          case "north":
            ctx.moveTo(x, y);
            ctx.lineTo(x + cellSize, y);
            break;
          case "south":
            ctx.moveTo(x, y + cellSize);
            ctx.lineTo(x + cellSize, y + cellSize);
            break;
          case "west":
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + cellSize);
            break;
          case "east":
            ctx.moveTo(x + cellSize, y);
            ctx.lineTo(x + cellSize, y + cellSize);
            break;
        }
        ctx.stroke();
      }
    }
  }

  // Draw crossing cells with bridge effect
  drawCrossings(ctx, topology, crossings, opts);

  // Draw solution path
  if (solutionPath && solutionPath.length > 1) {
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = Math.max(cellSize * 0.15, 2);
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
        // Check if this is a wrap (big jump in grid position)
        const prev = solutionPath[i - 1];
        const dr = Math.abs(cell.row - prev.row);
        const dc = Math.abs(cell.col - prev.col);
        if (dr > 1 || dc > 1) {
          // Wrap — draw a new sub-path segment
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx, cy);
        } else {
          ctx.lineTo(cx, cy);
        }
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
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
  const crossings = maze.crossings;
  const crossingCellKey = (c: CellCoord) => `${c.row},${c.col}`;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  );

  // Background
  parts.push(`<rect width="${width}" height="${height}" fill="${COLORS.bgPrimary}"/>`);

  // Cell background
  parts.push(
    `<rect x="${offsetX}" y="${offsetY}" width="${cellSize * config.cols}" height="${cellSize * config.rows}" fill="${COLORS.cellBg}"/>`,
  );

  // Start pig
  const startCx = offsetX + start.col * cellSize + cellSize / 2;
  const startCy = offsetY + start.row * cellSize + cellSize / 2;
  parts.push(svgPig(startCx, startCy, cellSize));

  // End carrot
  const endCx = offsetX + end.col * cellSize + cellSize / 2;
  const endCy = offsetY + end.row * cellSize + cellSize / 2;
  parts.push(svgCarrot(endCx, endCy, cellSize));

  // Walls (skip crossing cells)
  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const cell: CellCoord = { row, col };
      const x = offsetX + col * cellSize;
      const y = offsetY + row * cellSize;

      if (crossings.has(crossingCellKey(cell))) continue;

      for (const dir of ALL_DIRECTIONS) {
        const neighbor = topology.neighbor(cell, dir);
        if (!neighbor) {
          // Boundary wall
          const [x1, y1, x2, y2] = wallLineCoords(x, y, cellSize, dir);
          parts.push(
            `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS.wallColor}" stroke-width="${WALL_WIDTH + 1}" stroke-linecap="round"/>`,
          );
          continue;
        }

        const wk = wallKey(cell, neighbor);
        if (!walls.has(wk)) continue;

        const [x1, y1, x2, y2] = wallLineCoords(x, y, cellSize, dir);
        parts.push(
          `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS.wallColor}" stroke-width="${WALL_WIDTH}" stroke-linecap="round"/>`,
        );
      }
    }
  }

  // Crossings
  parts.push(svgCrossings(topology, crossings, cellSize, offsetX, offsetY));

  // Solution path
  if (solutionPath && solutionPath.length > 1) {
    const pathWidth = Math.max(cellSize * 0.15, 2);
    // Build segments (break at wraps)
    let segment: string[] = [];
    for (let i = 0; i < solutionPath.length; i++) {
      const cell = solutionPath[i];
      const cx = offsetX + cell.col * cellSize + cellSize / 2;
      const cy = offsetY + cell.row * cellSize + cellSize / 2;
      if (i === 0) {
        segment.push(`M${cx},${cy}`);
      } else {
        const prev = solutionPath[i - 1];
        const dr = Math.abs(cell.row - prev.row);
        const dc = Math.abs(cell.col - prev.col);
        if (dr > 1 || dc > 1) {
          // Wrap — flush segment and start new one
          if (segment.length > 0) {
            parts.push(
              `<path d="${segment.join(" ")}" fill="none" stroke="${COLORS.accent}" stroke-width="${pathWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>`,
            );
          }
          segment = [`M${cx},${cy}`];
        } else {
          segment.push(`L${cx},${cy}`);
        }
      }
    }
    if (segment.length > 0) {
      parts.push(
        `<path d="${segment.join(" ")}" fill="none" stroke="${COLORS.accent}" stroke-width="${pathWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>`,
      );
    }
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

function wallLineCoords(
  x: number,
  y: number,
  cellSize: number,
  dir: Direction,
): [number, number, number, number] {
  switch (dir) {
    case "north":
      return [x, y, x + cellSize, y];
    case "south":
      return [x, y + cellSize, x + cellSize, y + cellSize];
    case "west":
      return [x, y, x, y + cellSize];
    case "east":
      return [x + cellSize, y, x + cellSize, y + cellSize];
  }
}

function svgPig(cx: number, cy: number, size: number): string {
  const s = size * 0.35;
  const parts: string[] = [];
  // Body
  parts.push(
    `<ellipse cx="${cx}" cy="${cy}" rx="${s}" ry="${s * 0.75}" fill="${COLORS.pigPink}" stroke="${COLORS.pigDark}" stroke-width="1"/>`,
  );
  // Ears
  parts.push(
    `<ellipse cx="${cx - s * 0.6}" cy="${cy - s * 0.5}" rx="${s * 0.25}" ry="${s * 0.3}" transform="rotate(${(-0.3 * 180) / Math.PI} ${cx - s * 0.6} ${cy - s * 0.5})" fill="${COLORS.pigPink}" stroke="${COLORS.pigDark}" stroke-width="1"/>`,
  );
  parts.push(
    `<ellipse cx="${cx + s * 0.6}" cy="${cy - s * 0.5}" rx="${s * 0.25}" ry="${s * 0.3}" transform="rotate(${(0.3 * 180) / Math.PI} ${cx + s * 0.6} ${cy - s * 0.5})" fill="${COLORS.pigPink}" stroke="${COLORS.pigDark}" stroke-width="1"/>`,
  );
  // Eyes
  parts.push(
    `<circle cx="${cx - s * 0.25}" cy="${cy - s * 0.1}" r="${s * 0.08}" fill="${COLORS.text}"/>`,
  );
  parts.push(
    `<circle cx="${cx + s * 0.25}" cy="${cy - s * 0.1}" r="${s * 0.08}" fill="${COLORS.text}"/>`,
  );
  // Nose
  parts.push(
    `<ellipse cx="${cx}" cy="${cy + s * 0.15}" rx="${s * 0.15}" ry="${s * 0.1}" fill="${COLORS.pigDark}"/>`,
  );
  return parts.join("\n");
}

function svgCarrot(cx: number, cy: number, size: number): string {
  const s = size * 0.3;
  const parts: string[] = [];
  // Carrot body
  parts.push(
    `<polygon points="${cx},${cy + s} ${cx - s * 0.4},${cy - s * 0.3} ${cx + s * 0.4},${cy - s * 0.3}" fill="${COLORS.endColor}"/>`,
  );
  // Leaves
  parts.push(
    `<ellipse cx="${cx - s * 0.15}" cy="${cy - s * 0.5}" rx="${s * 0.1}" ry="${s * 0.25}" transform="rotate(${(-0.3 * 180) / Math.PI} ${cx - s * 0.15} ${cy - s * 0.5})" fill="#66BB6A"/>`,
  );
  parts.push(
    `<ellipse cx="${cx + s * 0.15}" cy="${cy - s * 0.5}" rx="${s * 0.1}" ry="${s * 0.25}" transform="rotate(${(0.3 * 180) / Math.PI} ${cx + s * 0.15} ${cy - s * 0.5})" fill="#66BB6A"/>`,
  );
  return parts.join("\n");
}

function svgCrossings(
  _topology: Topology,
  crossings: Map<string, CrossingOver>,
  cellSize: number,
  offsetX: number,
  offsetY: number,
): string {
  const parts: string[] = [];
  const gap = cellSize * 0.3;

  for (const [ck, over] of crossings) {
    const [rowStr, colStr] = ck.split(",");
    const row = Number(rowStr);
    const col = Number(colStr);
    const x = offsetX + col * cellSize;
    const y = offsetY + row * cellSize;
    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;

    if (over === "h") {
      // Horizontal over, vertical under
      // E/W wall stubs
      parts.push(`<line x1="${x + cellSize}" y1="${y}" x2="${x + cellSize}" y2="${cy - gap}" stroke="${COLORS.wallColor}" stroke-width="${WALL_WIDTH}" stroke-linecap="round"/>`);
      parts.push(`<line x1="${x + cellSize}" y1="${cy + gap}" x2="${x + cellSize}" y2="${y + cellSize}" stroke="${COLORS.wallColor}" stroke-width="${WALL_WIDTH}" stroke-linecap="round"/>`);
      parts.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${cy - gap}" stroke="${COLORS.wallColor}" stroke-width="${WALL_WIDTH}" stroke-linecap="round"/>`);
      parts.push(`<line x1="${x}" y1="${cy + gap}" x2="${x}" y2="${y + cellSize}" stroke="${COLORS.wallColor}" stroke-width="${WALL_WIDTH}" stroke-linecap="round"/>`);
      // Bridge background
      parts.push(`<rect x="${x}" y="${cy - gap}" width="${cellSize}" height="${gap * 2}" fill="${COLORS.cellBg}"/>`);
      // Bridge walls
      parts.push(`<line x1="${x}" y1="${cy - gap}" x2="${x + cellSize}" y2="${cy - gap}" stroke="${COLORS.wallColor}" stroke-width="${WALL_WIDTH}" stroke-linecap="round"/>`);
      parts.push(`<line x1="${x}" y1="${cy + gap}" x2="${x + cellSize}" y2="${cy + gap}" stroke="${COLORS.wallColor}" stroke-width="${WALL_WIDTH}" stroke-linecap="round"/>`);
    } else {
      // Vertical over, horizontal under
      // N/S wall stubs
      parts.push(`<line x1="${x}" y1="${y}" x2="${cx - gap}" y2="${y}" stroke="${COLORS.wallColor}" stroke-width="${WALL_WIDTH}" stroke-linecap="round"/>`);
      parts.push(`<line x1="${cx + gap}" y1="${y}" x2="${x + cellSize}" y2="${y}" stroke="${COLORS.wallColor}" stroke-width="${WALL_WIDTH}" stroke-linecap="round"/>`);
      parts.push(`<line x1="${x}" y1="${y + cellSize}" x2="${cx - gap}" y2="${y + cellSize}" stroke="${COLORS.wallColor}" stroke-width="${WALL_WIDTH}" stroke-linecap="round"/>`);
      parts.push(`<line x1="${cx + gap}" y1="${y + cellSize}" x2="${x + cellSize}" y2="${y + cellSize}" stroke="${COLORS.wallColor}" stroke-width="${WALL_WIDTH}" stroke-linecap="round"/>`);
      // Bridge background
      parts.push(`<rect x="${cx - gap}" y="${y}" width="${gap * 2}" height="${cellSize}" fill="${COLORS.cellBg}"/>`);
      // Bridge walls
      parts.push(`<line x1="${cx - gap}" y1="${y}" x2="${cx - gap}" y2="${y + cellSize}" stroke="${COLORS.wallColor}" stroke-width="${WALL_WIDTH}" stroke-linecap="round"/>`);
      parts.push(`<line x1="${cx + gap}" y1="${y}" x2="${cx + gap}" y2="${y + cellSize}" stroke="${COLORS.wallColor}" stroke-width="${WALL_WIDTH}" stroke-linecap="round"/>`);
    }
  }
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

  // Recalculate drawing params
  const maxCellW = (canvasWidth - 60) / config.cols;
  const maxCellH = (canvasHeight - 60) / config.rows;
  const cellSize = Math.floor(Math.min(maxCellW, maxCellH, 40));
  const mazeW = cellSize * config.cols;
  const mazeH = cellSize * config.rows;
  const offsetX = Math.floor((canvasWidth - mazeW) / 2);
  const offsetY = Math.floor((canvasHeight - mazeH) / 2);

  // Convert to grid coordinates
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

        // Wall position (in grid units)
        let wx: number, wy: number;
        switch (dir) {
          case "north":
            wx = col + 0.5;
            wy = row;
            break;
          case "south":
            wx = col + 0.5;
            wy = row + 1;
            break;
          case "west":
            wx = col;
            wy = row + 0.5;
            break;
          case "east":
            wx = col + 1;
            wy = row + 0.5;
            break;
        }

        // Distance: prefer walls whose midpoint is close
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
