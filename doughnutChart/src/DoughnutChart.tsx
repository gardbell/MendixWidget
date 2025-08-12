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
      .filter(r => Number.isFinite(r.value) && r.value >= 0);
  }, [p.dataSource, p.valueAttr, p.labelAttr, p.colorAttr]);
}

const TAU = Math.PI * 2;
const deg2rad = (d: number) => (d * Math.PI) / 180;

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
}

function donutSlicePath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  a0: number,
  a1: number
) {
  let start = a0, end = a1;
  while (end < start) end += TAU;
  const large = end - start > Math.PI ? 1 : 0;

  const p0 = polar(cx, cy, outerR, start);
  const p1 = polar(cx, cy, outerR, end);
  const q1 = polar(cx, cy, innerR, end);
  const q0 = polar(cx, cy, innerR, start);

  return [
    `M ${p0.x} ${p0.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${p1.x} ${p1.y}`,
    `L ${q1.x} ${q1.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${q0.x} ${q0.y}`,
    "Z"
  ].join(" ");
}

export default function DoughnutChart(p: DoughnutChartContainerProps): ReactElement {
  const rows = useRows(p);
  const hasData = rows.length > 0 && rows.some(r => r.value > 0);

  const width = p.width ?? 360;
  const height = p.height ?? 360;
  const cx = width / 2;
  const cy = height / 2;

  // 라벨 공간: 도넛 30% 축소
  const pad = 12;
  const baseOuter = Math.min(width, height) / 2 - pad;
  const outerR = baseOuter * 0.7;
  const innerR = outerR * ((p.cutoutPct ?? 60) / 100);

  // 리드라인 길이(설정값 그대로)
  const elbowLen = p.elbowLen ?? 22;     // 수평 길이
  const elbowVert = p.elbowVert ?? 12;   // 수직 길이
  const fontSize = p.fontSize ?? 12;
  const labelWeight=(p as any).labelWeight ?? 500;
  const labelColor=(p as any).labelColor ?? "#333";
  const showPercent = p.showPercent ?? true;

  // 위/아래 판정(캔버스 좌표계: 90°가 아래, 270°가 위)
  const topBottomThreshold = deg2rad(p.topBottomThresholdDeg ?? 25);

  // 라벨은 라인 끝에 패딩 주고 붙이기(라인이 라벨을 가리지 않게)
  const labelPad = 4;

  // 라인 시작점: midR에서 외곽 쪽으로 30% 이동
  const startR = innerR + (outerR - innerR) * 0.65;

  // 각도/조각
  const total = rows.reduce((a, b) => a + b.value, 0);
  let angle = deg2rad(p.rotationDeg ?? -90);

  type Node = {
    label: string;
    side: "left" | "right";
    start: { x: number; y: number };
    seg1End: { x: number; y: number };
    end: { x: number; y: number }; // 라벨 기준점(라인 끝)
  };

  const nodes: Node[] = [];
  const slices: Array<{ d: string; fill: string }> = [];

  if (hasData && total > 0) {
    rows.forEach(r => {
      const sweep = (r.value / total) * TAU;
      const a0 = angle;
      const a1 = angle + sweep;
      const aMid = (a0 + a1) / 2;

      // 도넛 조각
      slices.push({ d: donutSlicePath(cx, cy, innerR, outerR, a0, a1), fill: r.color });

      // 리드라인 계산
      const start = polar(cx, cy, startR, aMid);
      const norm = ((aMid % TAU) + TAU) % TAU;
      const nearBottom = Math.abs(norm - Math.PI / 2) <= topBottomThreshold;       // ↓ 90°
      const nearTop    = Math.abs(norm - (3 * Math.PI) / 2) <= topBottomThreshold;  // ↑ 270°
      const rightSide = Math.cos(aMid) >= 0;
      const side: "left" | "right" = rightSide ? "right" : "left";

      let seg1End = { x: start.x, y: start.y };
      let end = { x: start.x, y: start.y };

      if (nearTop) {
        // 위: 위(0°로 보이지만 SVG는 y↑이 음수) → 실제로 y - elbowVert
        seg1End = { x: start.x, y: start.y - elbowVert };
        end = rightSide
          ? { x: seg1End.x + elbowLen, y: seg1End.y }
          : { x: seg1End.x - elbowLen, y: seg1End.y };
      } else if (nearBottom) {
        // 아래: 아래(180°처럼 보이지만 SVG는 y +)
        seg1End = { x: start.x, y: start.y + elbowVert };
        end = rightSide
          ? { x: seg1End.x + elbowLen, y: seg1End.y }
          : { x: seg1End.x - elbowLen, y: seg1End.y };
      } else if (rightSide) {
        // 오른쪽: 90°로 수평
        seg1End = { x: start.x, y: start.y };
        end = { x: start.x + elbowLen, y: start.y };
      } else {
        // 왼쪽: 270°로 수평
        seg1End = { x: start.x, y: start.y };
        end = { x: start.x - elbowLen, y: start.y };
      }

      nodes.push({
        label: showPercent ? `${r.label} ${Math.round((r.value / total) * 100)}%` : r.label,
        side,
        start,
        seg1End,
        end
      });

      angle = a1;
    });
  }

  // 중앙 텍스트
  const centerText = (p as any).centerText as string | undefined;
  const centerTextFontSize = (p as any).centerTextFontSize ?? 16;
  const centerTextFontWeight = (p as any).centerTextFontWeight ?? 700;
  const centerTextFontColor = (p as any).centerTextFontColor ?? 700;

  return (
    <div
      className={p.class}
      style={{ ...(p.style as any), width, height, position: "relative" }}
      tabIndex={p.tabIndex}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0, display: "block" }}
      >
        {/* 도넛 */}
        {slices.map((s, i) => (
          <path key={`slice-${i}`} d={s.d} fill={s.fill} stroke="#fff" strokeWidth="2" />
        ))}

        {/* 리드라인(직선만) */}
        {nodes.map((n, i) => {
          const hasVertical = n.seg1End.x !== n.end.x || n.seg1End.y !== n.end.y;
          const d = hasVertical
            ? `M ${n.start.x} ${n.start.y} L ${n.seg1End.x} ${n.seg1End.y} L ${n.end.x} ${n.end.y}`
            : `M ${n.start.x} ${n.start.y} L ${n.end.x} ${n.end.y}`;
          return <path key={`lead-${i}`} d={d} fill="none" stroke="#000" strokeWidth="1.5" />;
        })}
      </svg>

      {/* 라벨: 라인 끝에서 약간 떨어진 지점 */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {nodes.map((n, i) => {
          const isRight = n.side === "right";
          const left = isRight ? n.end.x + labelPad : n.end.x - labelPad;
          const top = n.end.y;
          return (
            <div
              key={`label-${i}`}
              style={{
                fontWeight: labelWeight,
                position: "absolute",
                left,
                top,
                transform: `translate(${isRight ? "0" : "-100%"}, -50%)`,
                whiteSpace: "nowrap",
                fontSize,
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
