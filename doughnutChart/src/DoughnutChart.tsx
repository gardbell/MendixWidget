import { createElement, useMemo, type ReactElement, type CSSProperties } from "react";
import type { DoughnutChartContainerProps } from "../typings/DoughnutChartProps";

type Row = { label: string; value: number; color: string };

const TAU = Math.PI * 2;
const deg2rad = (d: number) => (d * Math.PI) / 180;
const polar = (cx: number, cy: number, r: number, a: number) => ({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function parseNumber(raw: unknown): number {
  if (raw == null) return 0;
  const n = Number(String(raw));
  return Number.isFinite(n) ? n : 0;
}

function mergeStyle(s: any): CSSProperties {
  if (!s) return {};
  return Array.isArray(s) ? Object.assign({}, ...s) : s;
}

// ===== text width(오프스크린 캔버스 + 캐시) =====
const measureCtx: CanvasRenderingContext2D | null = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  return c.getContext("2d");
})();

const twCache = new Map<string, number>();
function measureTextWidth(text: string, fontPx: number, weight: number) {
  if (!measureCtx) return text.length * (fontPx * 0.6);
  measureCtx.font = `${weight || 500} ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  return measureCtx.measureText(text).width;
}
function measureTextWidthCached(text: string, fontPx: number, weight: number) {
  const key = `${weight}|${fontPx}|${text}`;
  const v = twCache.get(key);
  if (v != null) return v;
  const w = measureTextWidth(text, fontPx, weight);
  twCache.set(key, w);
  return w;
}

// 안전 게터
function getNum(p: any, key: string, fallback: number): number {
  const v = p?.[key];
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function getStr(p: any, key: string, fallback: string): string {
  const v = p?.[key];
  return (v == null ? fallback : String(v)) as string;
}

// ===== Mendix 문자열(JSON) 파서: '...', "...", ['a','b'], [1,2] 모두 허용 =====
function parseJsonArray<T = unknown>(raw: string): T[] {
  let s = (raw ?? "").trim();
  if (!s) return [];
  // 바깥 단/쌍따옴표 제거
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith(`"`) && s.endsWith(`"`))) {
    s = s.slice(1, -1).trim();
  }
  // 1차: 표준 JSON
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch { /* 다음 */ }
  // 2차: 단따옴표 JSON → 쌍따옴표 치환
  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      const v2 = JSON.parse(s.replace(/'/g, `"`));
      return Array.isArray(v2) ? (v2 as T[]) : [];
    } catch { /* 다음 */ }
  }
  // 3차: 느슨한 파싱
  return s
    .replace(/^\[|\]$/g, "")
    .replace(/['"]/g, "")
    .split(",")
    .map(x => x.trim())
    .filter(x => x.length > 0) as unknown as T[];
}

const DEFAULT_PALETTE = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"
];

// 컨텍스트 엔티티의 문자열 속성 3개에서 rows 생성
function useRowsFromContext(p: DoughnutChartContainerProps): Row[] {
  return useMemo(() => {
    const va: any = (p as any).valuesAttr;
    const la: any = (p as any).labelsAttr;
    const ca: any = (p as any).colorsAttr;

    // 속성 status 확인(available일 때만 파싱)
    const vStat = va?.status ?? "available";
    const lStat = la?.status ?? "available";
    const cStat = ca?.status ?? "available";
    if (vStat !== "available" || lStat !== "available" || cStat === "loading") return [];

    const valuesStr = String(va?.value ?? va?.displayValue ?? "").trim();
    const labelsStr = String(la?.value ?? la?.displayValue ?? "").trim();
    const colorsStr = String(ca?.value ?? ca?.displayValue ?? "").trim();

    const values = parseJsonArray<any>(valuesStr).map(parseNumber);
    const labels = parseJsonArray<string>(labelsStr).map(v => String(v ?? ""));
    let colors = parseJsonArray<string>(colorsStr).map(v => String(v ?? ""));

    const n = Math.min(values.length, labels.length);
    if (colors.length < n) {
      const need = n - colors.length;
      colors = [
        ...colors,
        ...Array.from({ length: need }, (_, i) => DEFAULT_PALETTE[(colors.length + i) % DEFAULT_PALETTE.length])
      ];
    }

    const rows: Row[] = [];
    for (let i = 0; i < n; i++) {
      const value = values[i];
      if (!Number.isFinite(value) || value <= 0) continue;
      rows.push({ value, label: labels[i] ?? "", color: colors[i] ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length] });
    }
    return rows;
  }, [(p as any).valuesAttr, (p as any).labelsAttr, (p as any).colorsAttr]);
}

function donutSlicePath(cx: number, cy: number, innerR: number, outerR: number, a0: number, a1: number) {
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
  const rows = useRowsFromContext(p);
  const hasData = rows.length > 0;

  // XML 기본값
  const width = p.width ?? 360;
  const height = p.height ?? 360;
  const cx = width / 2;
  const cy = height / 2;

  // 반지름
  const pad = 12;
  const baseOuter = Math.min(width, height) / 2 - pad;
  const doughnutSize = getNum(p as any, "doughnutSize", 0.7);
  const outerR = baseOuter * doughnutSize;
  const innerR = outerR * ((p.cutoutPct ?? 60) / 100);

  // 라벨/라인 옵션
  const fontSize = p.fontSize ?? 12;
  const labelWeight = p.labelWeight ?? 500;
  const labelColor = p.labelColor ?? "#333";
  const showPercent = p.showPercent ?? true;
  const elbowLenBase = p.elbowLen ?? 24;
  const elbowVertBase = p.elbowVert ?? 12;
  const gapY = p.minLabelGap ?? 8;
  const topBottomThreshold = deg2rad(p.topBottomThresholdDeg ?? 45);

  // 리드라인 시작 r
  const lineStart = getNum(p as any, "lineStart", 0.85);
  const startR = innerR + (outerR - innerR) * lineStart;

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
    preferredHalf?: "top" | "bottom" | null;
  };

  const nodes: Node[] = [];
  const slices: Array<{ d: string; fill: string }> = [];

  if (hasData && total > 0) {
    rows.forEach(r => {
      const sweep = (r.value / total) * TAU;
      const a0 = angle, a1 = angle + sweep, aMid = (a0 + a1) / 2;

      slices.push({ d: donutSlicePath(cx, cy, innerR, outerR, a0, a1), fill: r.color });

      const labelText = showPercent ? `${r.label} ${Math.round((r.value / total) * 100)}%` : r.label;
      const textWidth = measureTextWidthCached(labelText, fontSize, labelWeight);

      const start = polar(cx, cy, startR, aMid);
      const norm = ((aMid % TAU) + TAU) % TAU;
      const nearBottom = Math.abs(norm - Math.PI / 2) <= topBottomThreshold;        // ↓
      const nearTop = Math.abs(norm - (3 * Math.PI) / 2) <= topBottomThreshold;     // ↑
      const rightSide = Math.cos(aMid) >= 0;
      const side: "left" | "right" = rightSide ? "right" : "left";
      const preferredHalf: "top" | "bottom" | null = nearTop ? "top" : nearBottom ? "bottom" : null;

      let seg1End = { x: start.x, y: start.y };
      let end = { x: start.x, y: start.y };

      if (nearTop) {
        seg1End = { x: start.x, y: start.y - Math.max(elbowVertBase, 10) };
        end = rightSide ? { x: seg1End.x + elbowLenBase, y: seg1End.y } : { x: seg1End.x - elbowLenBase, y: seg1End.y };
      } else if (nearBottom) {
        seg1End = { x: start.x, y: start.y + Math.max(elbowVertBase, 10) };
        end = rightSide ? { x: seg1End.x + elbowLenBase, y: seg1End.y } : { x: seg1End.x - elbowLenBase, y: seg1End.y };
      } else if (rightSide) {
        end = { x: start.x + elbowLenBase, y: start.y };
      } else {
        end = { x: start.x - elbowLenBase, y: start.y };
      }

      nodes.push({
        label: labelText,
        textWidth,
        side,
        isVerticalCase: nearTop || nearBottom,
        start, seg1End, end,
        preferredHalf
      });
      angle = a1;
    });
  }

  // ===== 라벨 겹침 해소 =====
  {
    const half = fontSize / 2;
    const topLimit = half + 4;
    const bottomLimit = height - half - 4;
    const laneStep = Math.max(gapY, fontSize + 10);
    const cyGap = Math.max(6, fontSize * 0.4); // 중앙 절연 간격

    function layout(list: Node[], minY: number, maxY: number) {
      if (!list.length) return;
      list.sort((a, b) => a.seg1End.y - b.seg1End.y);
      const needed = (list.length - 1) * laneStep;
      const meanY = list.reduce((s, n) => s + n.seg1End.y, 0) / list.length;
      let y0 = Math.max(minY, Math.min(meanY - needed / 2, maxY - needed));
      list.forEach((n, i) => {
        const y = clamp(y0 + i * laneStep, minY, maxY);
        n.isVerticalCase = true;
        n.seg1End = { x: n.start.x, y };
        n.end.y = y;
      });
    }

    (["right", "left"] as const).forEach(side => {
      const onSide = nodes.filter(n => n.side === side);

      // 1) 수직 엘보인 것들은 항상 레이아웃(겹침 방지)
      const vTop = onSide.filter(n => n.isVerticalCase && (n.preferredHalf ?? (n.end.y < cy ? "top" : "bottom")) === "top");
      const vBot = onSide.filter(n => n.isVerticalCase && (n.preferredHalf ?? (n.end.y < cy ? "top" : "bottom")) === "bottom");
      layout(vTop, topLimit, cy - cyGap);
      layout(vBot, cy + cyGap, bottomLimit);

      // 2) 수평 라벨 혼잡 시 → 그쪽 전부를 수직 전환하여 위/아래 분리 배치
      const horiz = onSide.filter(n => !n.isVerticalCase).sort((a, b) => a.end.y - b.end.y);
      let crowded = false;
      for (let i = 1; i < horiz.length; i++) {
        if (Math.abs(horiz[i].end.y - horiz[i - 1].end.y) < Math.max(laneStep / 2, fontSize)) { crowded = true; break; }
      }
      if (crowded) {
        const topList = onSide.filter(n => (n.preferredHalf ?? (n.end.y < cy ? "top" : "bottom")) === "top");
        const bottomList = onSide.filter(n => (n.preferredHalf ?? (n.end.y < cy ? "top" : "bottom")) === "bottom");
        layout(topList, topLimit, cy - cyGap);
        layout(bottomList, cy + cyGap, bottomLimit);
      }
    });
  }

  // 중앙 텍스트
  const centerText = getStr(p as any, "centerText", "");
  const centerTextFontSize = getNum(p as any, "centerTextFontSize", 16);
  const centerTextFontWeight = getNum(p as any, "centerTextFontWeight", 700);
  const centerTextFontColor = getStr(p as any, "centerTextFontColor", "#333");

  const makeKey = (i: number) => {
    const r = rows[i];
    return r ? `${r.label}__${r.value}__${i}` : `k__${i}`;
  };

  // 속성 로딩 중이면 빈 div
  const anyLoading =
    ((p as any).valuesAttr?.status === "loading") ||
    ((p as any).labelsAttr?.status === "loading") ||
    ((p as any).colorsAttr?.status === "loading");

  if (anyLoading) {
    return <div className={p.class} style={{ ...mergeStyle(p.style), width, height }} tabIndex={p.tabIndex} />;
  }

  return (
    <div className={p.class} style={{ ...mergeStyle(p.style), width, height, position: "relative" }} tabIndex={p.tabIndex}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0 }} role="img" aria-label="Doughnut chart">
        {slices.map((s, i) => <path key={`slice-${makeKey(i)}`} d={s.d} fill={s.fill} stroke="none" />)}
        {nodes.map((n, i) => {
          const d = n.isVerticalCase
            ? `M ${n.start.x} ${n.start.y} L ${n.seg1End.x} ${n.seg1End.y} L ${n.end.x} ${n.end.y}`
            : `M ${n.start.x} ${n.start.y} L ${n.end.x} ${n.end.y}`;
          return <path key={`lead-${makeKey(i)}`} d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />;
        })}
      </svg>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {nodes.map((n, i) => {
          const isRight = n.side === "right";
          const leftMin = 2;
          const rightMax = width - 2;
          const labelW = n.textWidth ?? measureTextWidthCached(n.label, fontSize, labelWeight);
          const safeEndX = isRight ? clamp(n.end.x, leftMin, rightMax - labelW - 4) : clamp(n.end.x, leftMin + 4 + labelW, rightMax);
          const left = isRight ? safeEndX + 4 : safeEndX - 4;
          const half = fontSize / 2;
          const top = clamp(n.end.y, half + 4, height - half - 4);
          return (
            <div
              key={`label-${makeKey(i)}`}
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
