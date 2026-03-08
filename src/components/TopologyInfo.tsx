import type { SurfaceType } from "../types";

interface TopologyInfoProps {
  surface: SurfaceType;
}

const INFO: Record<SurfaceType, { name: string; desc: string; diagram: string }> = {
  rectangle: {
    name: "Rectangle",
    desc: "A flat, bounded surface. The classic maze — no edges wrap around.",
    diagram: `
 ─────
│     │
│     │
 ─────`,
  },
  cylinder: {
    name: "Cylinder",
    desc: "Left and right edges are connected. Walk off one side and appear on the other!",
    diagram: `
 ─────
 ←   →
 ←   →
 ─────`,
  },
  torus: {
    name: "Torus (Donut)",
    desc: "All four edges wrap around — left connects to right, top connects to bottom. Like the surface of a donut.",
    diagram: `
 ↑ ↑ ↑
 ←   →
 ←   →
 ↓ ↓ ↓`,
  },
  mobius: {
    name: "Möbius Strip",
    desc: "Left and right edges connect with a twist — walk off the right side and you come back on the left, but flipped upside down!",
    diagram: `
 ─────
 ↙   ↗
 ↖   ↘
 ─────`,
  },
  klein: {
    name: "Klein Bottle",
    desc: "Left-right edges connect with a flip (like Möbius), and top-bottom wrap normally. A surface that can't exist in 3D without self-intersection!",
    diagram: `
 ↑ ↑ ↑
 ↙   ↗
 ↖   ↘
 ↓ ↓ ↓`,
  },
};

export function TopologyInfo({ surface }: TopologyInfoProps) {
  const info = INFO[surface];
  return (
    <div className="topology-info">
      <h3 className="topology-name">{info.name}</h3>
      <pre className="topology-diagram">{info.diagram.trim()}</pre>
      <p className="topology-desc">{info.desc}</p>
    </div>
  );
}
