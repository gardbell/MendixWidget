import { createElement, useMemo, type ReactElement } from "react";
import type { DoughnutChartContainerProps } from "../typings/DoughnutChartProps";

/* ───────────── 공용 유틸/가드 ───────────── */
const TAU = Math.PI * 2;
const deg2rad = (d: number) => (Number.isFinite(d) ? (d * Math.PI) / 180 : 0);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const asFinite = (v: unknown, def: number) => (isFiniteNum(Number(v)) ? Number(v) : def);

/** Mendix attr.get(item) 호출 방어 */
function safeAttrGet(attr: any, item: any): any {
  try {
    if (!attr || !item || typeof attr.get !== "function") return undefined;
    return attr.get(item);
  } catch {
    return undefined;
  }
}

/** 문자열/숫자 파싱 방어 */
function parseNumber(raw: unknown): number {
  if (raw == null) return 0;
  const n = Number(String((raw as any)?.value ?? (raw as any)?.displayValue ?? raw));
  return Number.isFinite(n) ? n : 0;
}
function parseString(raw: unknown, def = ""): string {
  const v = (raw as any)?.value ?? (raw as any)?.displayValue ?? raw;
  return typeof v === "string" ? v : def;
}

const polar = (cx: number, cy: number, r: number, a: number) => ({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });

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

/** 라벨 폭 측정(오프스크린 캔버스, 실패 시 근사값) */
const measureCtx: CanvasRenderingContext2D | null = (() => {
  try {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    return c.getContext("2d");
  } catch {
    return null;
  }
})();
function measureTextWidth(text: string, fontPx: number, weight: number) {
  if (!measureCtx) return Math.max(4, text.length) * (fontPx * 0.6);
  try {
    measureCtx.font = `${weight || 500} ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    const m = measureCtx.measureText(String(text));
    const w = m?.width ?? 0;
    return Number.isFinite(w) && w > 0 ? w : Math.max(4, String(text).length) * (fontPx * 0.6);
  } catch {
    return Math.max(4, String(text).length) * (fontPx * 0.6);
  }
}

/* ───────────── 데이터 로딩 가드(A) ───────────── */
type Row = { label: string; value: number; color: string };

function useRows(p: DoughnutChartContainerProps): Row[] {
  return useMemo(() => {
    if (!p?.dataSource || p.dataSource.status !== "available") return [];
    const items = p.dataSource.items ?? [];
    try {
      return items
        .map(item => {
          const v = safeAttrGet(p.valueAttr, item);
          const l = safeAttrGet(p.labelAttr, item);
          const c = safeAttrGet(p.colorAttr, item);
          return {
            value: parseNumber(v),
            label: parseString(l, ""),
            color: parseString(c, "#9aa")
          };
        })
        .filter(r => Number.isFinite(r.value) && r.value > 0);
    } catch {
      return [];
    }
  }, [p?.dataSource?.status, p?.dataSource?.items, p?.valueAttr, p?.labelAttr, p?.colorAttr]);
}

/* ───────────── 컴포넌트 ───────────── */
export default function DoughnutChart(p: DoughnutChartContainerProps): ReactElement {
  /* 크기/스타일 파라미터(안전 변환) */
  const W = asFinite((p as any)?.width, 420);
  const H = asFinite((p as any)?.height, 360);
  const cutoutPct = clamp(asFinite((p as any)?.cutoutPct, 60), 0, 95);
  const cx = W / 2;
  const cy = H / 2;
  const pad = 12;
  const baseOuter = Math.max(10, Math.min(W, H) / 2 - pad);
  const phOuter = baseOuter * 0.7;                // 플레이스홀더/본 렌더 동일 비율
  const phInner = phOuter * (cutoutPct / 100);

  /* style 병합(스프레드 X) */
  const mixStyle = (extra: any = {}) => {
    const s: any = { position: "relative", width: W, height: H };
    if (p && p.style) try { Object.assign(s, p.style as any); } catch {}
    Object.assign(s, extra);
    return s;
  };

  /* 플레이스홀더(B 가드) */
  const renderPlaceholder = (text: string) => (
    <div className={p.class} style={mixStyle()} tabIndex={p.tabIndex}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={phOuter} fill="#eee" />
        <circle cx={cx} cy={cy} r={phInner} fill="#fff" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#999", fontSize: 14, pointerEvents: "none" }}>
        {text}
      </div>
    </div>
  );

  /* 로딩/언어밸러블 시 자리 유지 */
  if (!p?.dataSource || p.dataSource.status !== "available") {
    return renderPlaceholder("로딩 중…");
  }

  /* 데이터 파싱 */
  const rows = useRows(p);
  if (!rows.length) {
    return renderPlaceholder("데이터 없음");
  }

  /* 렌더 옵션(방어값) */
  const fontSize = clamp(asFinite((p as any)?.fontSize, 13), 8, 48);
  const labelWeight = clamp(asFinite((p as any)?.labelWeight, 600), 100, 900);
  const labelColor = parseString((p as any)?.labelColor, "#333");
  const showPercent = Boolean((p as any)?.showPercent ?? true);
  const elbowLenBase = clamp(asFinite((p as any)?.elbowLen, 44), 8, Math.max(20, W));
  const elbowVertBase = clamp(asFinite((p as any)?.elbowVert, 16), 6, Math.max(10, H));
  const gapY = clamp(asFinite((p as any)?.minLabelGap, 8), 4, 80);
  const labelPad = 4;
  const doughnutSize=asFinite((p as any)?.doughnutSize, 0.7);
  const lineStart=asFinite((p as any)?.lineStart, 0.85);
  const startDeg = asFinite((p as any)?.rotationDeg, -90);
  const topBottomThreshold = deg2rad(clamp(asFinite((p as any)?.topBottomThresholdDeg, 22), 0, 90));

  /* 도넛 반지름 */
  const outerR = Math.max(10, baseOuter * doughnutSize);
  const innerR = Math.max(0, outerR * (cutoutPct / 100));

  /* 라인 시작 반지름: 중앙선에서 바깥쪽 30% */
  const startR = clamp(innerR + (outerR - innerR) * lineStart, 0, outerR);

  /* 각도/조각 */
  const total = rows.reduce((a, b) => a + (Number.isFinite(b.value) ? b.value : 0), 0);
  if (!Number.isFinite(total) || total <= 0) {
    return renderPlaceholder("데이터 없음");
  }
  let angle = deg2rad(startDeg);

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

  try {
    rows.forEach(r => {
      const sweep = (r.value / total) * TAU;
      const a0 = angle, a1 = angle + sweep, aMid = (a0 + a1) / 2;

      // 조각(경계선 없음)
      slices.push({ d: donutSlicePath(cx, cy, innerR, outerR, a0, a1), fill: r.color });

      // 라벨 텍스트(+%)
      const labelText = showPercent ? `${r.label} ${Math.round((r.value / total) * 100)}%` : r.label;
      const textWidth = Math.max(4, measureTextWidth(labelText, fontSize, labelWeight));

      // 리드라인 계산
      const start = polar(cx, cy, startR, aMid);
      const norm = ((aMid % TAU) + TAU) % TAU;
      const nearTop    = Math.abs(norm - (3 * Math.PI) / 2) <= topBottomThreshold; // 270°
      const nearBottom = Math.abs(norm - Math.PI / 2)      <= topBottomThreshold; // 90°
      const rightSide  = Math.cos(aMid) >= 0;
      const side: "left" | "right" = rightSide ? "right" : "left";

      let seg1End = { x: start.x, y: start.y };
      let end     = { x: start.x, y: start.y };

      if (nearTop || nearBottom) {
        const vSign = nearTop ? -1 : +1; // 위:-, 아래:+
        seg1End = { x: start.x, y: start.y + vSign * elbowVertBase };
        end = rightSide ? { x: seg1End.x + elbowLenBase, y: seg1End.y }
                        : { x: seg1End.x - elbowLenBase, y: seg1End.y };
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
        start,
        seg1End,
        end
      });

      angle = a1;
    });
  } catch (e) {
    // 예상치 못한 오류는 플레이스홀더로 안전 처리
    console.warn("[DoughnutChart] build error:", e);
    return renderPlaceholder("표시 중 오류");
  }

  /* ── 라벨 겹침 해소(방향 고정 + 레인 배치, 수평 길이 자동증가 없음) ── */
  try {
    const half = fontSize / 2;
    const topLimit = half + 4;
    const bottomLimit = H - half - 4;
    const laneStep = Math.max(gapY, fontSize + 16);

    // 1) 한쪽이 촘촘하면 -> 그쪽 전체 엘보 + 레인 배치
    (["right", "left"] as const).forEach(side => {
      const horiz = nodes
        .filter(n => n.side === side && !n.isVerticalCase)
        .sort((a, b) => a.end.y - b.end.y);

      let crowded = false;
      for (let i = 1; i < horiz.length; i++) {
        if (Math.abs(horiz[i].end.y - horiz[i - 1].end.y) < fontSize * 1.1) { crowded = true; break; }
      }
      if (!crowded) return;

      const group = nodes
        .filter(n => n.side === side)
        .sort((a, b) => a.start.y - b.start.y);

      const needed = (group.length - 1) * laneStep;
      const meanY = group.reduce((s, n) => s + (n.isVerticalCase ? n.seg1End.y : n.start.y), 0) / group.length || cy;
      let y0 = clamp(meanY - needed / 2, topLimit, bottomLimit - needed);

      group.forEach((n, i) => {
        let y = y0 + i * laneStep;
        // 방향 고정(위는 위로만, 아래는 아래로만 이동)
        y = n.start.y < cy ? Math.min(y, n.start.y - 1) : Math.max(y, n.start.y + 1);
        y = clamp(y, topLimit, bottomLimit);

        n.isVerticalCase = true;
        n.seg1End = { x: n.start.x, y };
        n.end.y = y;
      });
    });

    // 2) 최종: 위/아래 분리 레인 배치(양쪽 각각, 방향 고정)
    (["left", "right"] as const).forEach(side => {
      const distribute = (list: typeof nodes) => {
        if (!list.length) return;
        const needed = (list.length - 1) * laneStep;
        const meanY = list.reduce((s, n) => s + n.seg1End.y, 0) / list.length || cy;
        let y0 = clamp(meanY - needed / 2, topLimit, bottomLimit - needed);
        list.forEach((n, i) => {
          let y = y0 + i * laneStep;
          y = n.start.y < cy ? Math.min(y, n.start.y - 1) : Math.max(y, n.start.y + 1);
          y = clamp(y, topLimit, bottomLimit);
          n.seg1End.y = y;
          n.end.y = y;
        });
      };

      const tops = nodes.filter(n => n.side === side && n.isVerticalCase && n.start.y < cy).sort((a, b) => a.seg1End.y - b.seg1End.y);
      const bots = nodes.filter(n => n.side === side && n.isVerticalCase && n.start.y >= cy).sort((a, b) => a.seg1End.y - b.seg1End.y);
      distribute(tops);
      distribute(bots);
    });

  } catch (e) {
    console.warn("[DoughnutChart] label layout error:", e);
  }

  /* 중앙 텍스트(방어값) */
  const centerText = parseString((p as any)?.centerText, "");
  const centerTextFontSize = clamp(asFinite((p as any)?.centerTextFontSize, 18), 8, 64);
  const centerTextFontWeight = clamp(asFinite((p as any)?.centerTextFontWeight, 700), 100, 900);
  const centerTextFontColor = parseString((p as any)?.centerTextFontColor, "#333");

  /* ───────────── 렌더 ───────────── */
  try {
    return (
      <div className={p.class} style={mixStyle()} tabIndex={p.tabIndex}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
          {slices.map((s, i) => <path key={`slice-${i}`} d={s.d} fill={s.fill} stroke="none" />)}
          {nodes.map((n, i) => {
            const d = n.isVerticalCase
              ? `M ${n.start.x} ${n.start.y} L ${n.seg1End.x} ${n.seg1End.y} L ${n.end.x} ${n.end.y}`
              : `M ${n.start.x} ${n.start.y} L ${n.end.x} ${n.end.y}`;
            return <path key={`lead-${i}`} d={d} fill="none" stroke="#000" strokeWidth="1.5" />;
          })}
        </svg>

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
                  textAlign: isRight ? "left" : "right",
                  pointerEvents: "none",
                  maxWidth: W * 0.45,            // 라벨 길이 과도 시 방어
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
                title={n.label}
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
  } catch (e) {
    console.warn("[DoughnutChart] render error:", e);
    return renderPlaceholder("표시 중 오류");
  }
}
