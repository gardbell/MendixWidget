import { createElement, useMemo, type ReactElement } from "react";
import type { DoughnutChartContainerProps } from "../typings/DoughnutChartProps";

type Row = { label: string; value: number; color: string };

function parseNumber(raw: unknown): number {
  if (raw == null) return 0;
  const n = Number(String(raw));
  return Number.isFinite(n) ? n : 0;
}

function useRows(p: DoughnutChartContainerProps): Row[] {
  return useMemo(() => {
    const items = p.dataSource?.items ?? [];
    return items
      .map(item => {
        const v: any = p.valueAttr.get(item);
        const l: any = p.labelAttr.get(item);
        const c: any = p.colorAttr.get(item);
        return {
          value: parseNumber(v?.value ?? v?.displayValue),
          label: String(l?.value ?? l?.displayValue ?? ""),
          color: String(c?.value ?? c?.displayValue ?? "#9aa")
        };
      })
      .filter(r => Number.isFinite(r.value) && r.value > 0);
  }, [p.dataSource, p.valueAttr, p.labelAttr, p.colorAttr]);
}

const TAU = Math.PI * 2;
const deg2rad = (d: number) => (d * Math.PI) / 180;
const polar = (cx: number, cy: number, r: number, a: number) => ({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });

function donutSlicePath(cx: number, cy: number, innerR: number, outerR: number, a0: number, a1: number) {
  let start = a0, end = a1;
  while (end < start) end += TAU;
  const large = end - start > Math.PI ? 1 : 0;
  const p0 = polar(cx, cy, outerR, start);
  const p1 = polar(cx, cy, outerR, end);
  const q1 = polar(cx, cy, innerR, end);
  const q0 = polar(cx, cy, innerR, start);
  return [`M ${p0.x} ${p0.y}`, `A ${outerR} ${outerR} 0 ${large} 1 ${p1.x} ${p1.y}`, `L ${q1.x} ${q1.y}`, `A ${innerR} ${innerR} 0 ${large} 0 ${q0.x} ${q0.y}`, "Z"].join(" ");
}

// text width(오프스크린 캔버스)
const measureCtx: CanvasRenderingContext2D | null = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  return c.getContext("2d");
})();
function measureTextWidth(text: string, fontPx: number, weight: number) {
  if (!measureCtx) return text.length * (fontPx * 0.6);
  measureCtx.font = `${weight || 500} ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  return measureCtx.measureText(text).width;
}

export default function DoughnutChart(p: DoughnutChartContainerProps): ReactElement {
  const rows = useRows(p);
  const hasData = rows.length > 0;

  const width = p.width ?? 420;
  const height = p.height ?? 360;
  const cx = width / 2;
  const cy = height / 2;

  // 도넛 30% 축소
  const pad = 12;
  const baseOuter = Math.min(width, height) / 2 - pad;
  const outerR = baseOuter * 0.7;
  const innerR = outerR * ((p.cutoutPct ?? 60) / 100);

  // 표기/선 설정
  const fontSize = p.fontSize ?? 13;
  const labelWeight = (p as any).labelWeight ?? 600;
  const labelColor = (p as any).labelColor ?? "#333";
  const showPercent = p.showPercent ?? true;
  const elbowLenBase = p.elbowLen ?? 44;   // 수평 길이
  const elbowVertBase = p.elbowVert ?? 16; // 수직 길이
  const gapY = p.minLabelGap ?? 8;
  const labelPad = 4;
  const topBottomThreshold = deg2rad(p.topBottomThresholdDeg ?? 22);

  // 시작 반지름: 중앙선에서 바깥쪽 30%
  const startR = innerR + (outerR - innerR) * 0.65;

  // 각도/조각
  const total = rows.reduce((a, b) => a + b.value, 0);
  let angle = deg2rad(p.rotationDeg ?? -90);

  type Node = {
    label: string;
    textWidth: number;
    side: "left" | "right";
    isVerticalCase: boolean;
    start: { x: number; y: number };
    seg1End: { x: number; y: number };
    end: { x: number; y: number };
  };

  const nodes: Node[] = [];
  const slices: Array<{ d: string; fill: string }> = [];

  if (hasData && total > 0) {
    rows.forEach(r => {
      const sweep = (r.value / total) * TAU;
      const a0 = angle, a1 = angle + sweep, aMid = (a0 + a1) / 2;

      slices.push({ d: donutSlicePath(cx, cy, innerR, outerR, a0, a1), fill: r.color });

      const labelText = showPercent ? `${r.label} ${Math.round((r.value / total) * 100)}%` : r.label;
      const textWidth = measureTextWidth(labelText, fontSize, labelWeight);

      const start = polar(cx, cy, startR, aMid);
      const norm = ((aMid % TAU) + TAU) % TAU;
      const nearBottom = Math.abs(norm - Math.PI / 2) <= topBottomThreshold;        // ↓
      const nearTop = Math.abs(norm - (3 * Math.PI) / 2) <= topBottomThreshold;   // ↑
      const rightSide = Math.cos(aMid) >= 0;
      const side: "left" | "right" = rightSide ? "right" : "left";

      let seg1End = { x: start.x, y: start.y };
      let end = { x: start.x, y: start.y };

      if (nearTop) {
        seg1End = { x: start.x, y: start.y - elbowVertBase };
        end = rightSide ? { x: seg1End.x + elbowLenBase, y: seg1End.y } : { x: seg1End.x - elbowLenBase, y: seg1End.y };
      } else if (nearBottom) {
        seg1End = { x: start.x, y: start.y + elbowVertBase };
        end = rightSide ? { x: seg1End.x + elbowLenBase, y: seg1End.y } : { x: seg1End.x - elbowLenBase, y: seg1End.y };
      } else if (rightSide) {
        end = { x: start.x + elbowLenBase, y: start.y };
      } else {
        end = { x: start.x - elbowLenBase, y: start.y };
      }

      nodes.push({ label: labelText, textWidth, side, isVerticalCase: nearTop || nearBottom, start, seg1End, end });
      angle = a1;
    });
  }

  // ===== 라벨 겹침 해소 =====
{
  const half = fontSize / 2;
  const topLimit = half + 4;
  const bottomLimit = height - half - 4;
  const laneStep = Math.max(gapY, fontSize + 10); // 간격 넉넉히

  // 1) 한쪽에 수평 라벨이 촘촘하면 -> 그쪽 '전부'를 엘보 + 레인 배치로 강제 분산
  (["right", "left"] as const).forEach(side => {
    const horiz = nodes
      .filter(n => n.side === side && !n.isVerticalCase)
      .sort((a, b) => a.end.y - b.end.y);

    let crowded = false;
    for (let i = 1; i < horiz.length; i++) {
      if (Math.abs(horiz[i].end.y - horiz[i - 1].end.y) < fontSize * 1.1) {
        crowded = true;
        break;
      }
    }
    if (!crowded) return;

    // 그쪽 전체(기존 수직 포함) 모아 레인 배치
    const group = nodes
      .filter(n => n.side === side)
      .sort((a, b) => a.start.y - b.start.y);

    const needed = (group.length - 1) * laneStep;
    const meanY =
      group.reduce((s, n) => s + (n.isVerticalCase ? n.seg1End.y : n.start.y), 0) /
      group.length;

    let y0 = Math.max(topLimit, Math.min(meanY - needed / 2, bottomLimit - needed));

    group.forEach((n, i) => {
      const y = Math.min(Math.max(y0 + i * laneStep, topLimit), bottomLimit);
      n.isVerticalCase = true;
      n.seg1End = { x: n.start.x, y };
      n.end.y = y; // 라벨도 같은 Y
    });
  });

  // 2) 모든 수직 케이스는 최종적으로 레인 간격 유지(양쪽 각각)
  (["left", "right"] as const).forEach(side => {
    const list = nodes
      .filter(n => n.side === side && n.isVerticalCase)
      .sort((a, b) => a.seg1End.y - b.seg1End.y);

    if (!list.length) return;

    const needed = (list.length - 1) * laneStep;
    const meanY = list.reduce((s, n) => s + n.seg1End.y, 0) / list.length;
    let y0 = Math.max(topLimit, Math.min(meanY - needed / 2, bottomLimit - needed));

    list.forEach((n, i) => {
      const y = Math.min(Math.max(y0 + i * laneStep, topLimit), bottomLimit);
      n.seg1End.y = y;
      n.end.y = y;
    });
  });
}
  // 중앙 텍스트
  const centerText = (p as any).centerText as string | undefined;
  const centerTextFontSize = (p as any).centerTextFontSize ?? 18;
  const centerTextFontWeight = (p as any).centerTextFontWeight ?? 700;
  const centerTextFontColor = (p as any).centerTextFontColor ?? "#333";

  return (
    <div className={p.class} style={{ ...(p.style as any), width, height, position: "relative" }} tabIndex={p.tabIndex}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0 }}>
        {/* 도넛(경계선 없음) */}
        {slices.map((s, i) => <path key={`slice-${i}`} d={s.d} fill={s.fill} stroke="none" />)}
        {/* 리드라인 */}
        {nodes.map((n, i) => {
          const d = n.isVerticalCase
            ? `M ${n.start.x} ${n.start.y} L ${n.seg1End.x} ${n.seg1End.y} L ${n.end.x} ${n.end.y}`
            : `M ${n.start.x} ${n.start.y} L ${n.end.x} ${n.end.y}`;
          return <path key={`lead-${i}`} d={d} fill="none" stroke="#000" strokeWidth="1.5" />;
        })}
      </svg>

      {/* 라벨 */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {nodes.map((n, i) => {
          const isRight = n.side === "right";
          const left = isRight ? n.end.x + labelPad : n.end.x - labelPad;
          const top = n.end.y;
          return (
            <div
              key={`label-${i}`}
              style={{
                position: "absolute",
                left,
                top,
                transform: `translate(${isRight ? "0" : "-100%"}, -50%)`,
                whiteSpace: "nowrap",
                fontSize,
                fontWeight: labelWeight,
                color: labelColor,
                textAlign: isRight ? "left" : "right"
              }}
            >
              {n.label}
            </div>
          );
        })}
      </div>

      {/* 중앙 텍스트 */}
      {centerText && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            fontSize: centerTextFontSize,
            fontWeight: centerTextFontWeight,
            color: centerTextFontColor,
            textAlign: "center",
            lineHeight: 1.2
          }}
        >
          {centerText}
        </div>
      )}
    </div>
  );
}
