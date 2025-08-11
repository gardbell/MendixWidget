import { useMemo, createElement } from "react";

export type DoudoughnutProps = {
    width?: number;
    height?: number;
    values?: number[];    // ← optional로
    labels?: string[];
    colors?: string[];
    innerLabel?: string;
    outerRadius?: number;
    thickness?: number;
    lineRadialGap?: number;
    lineBendLen?: number;
    lineStroke?: number;
    fontSize?: number;
    percentDigits?: number;
};

const TAU = Math.PI * 2;

function polarToXY(cx: number, cy: number, r: number, a: number) {
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number) {
    const largeArc = end - start > Math.PI ? 1 : 0;
    const [x0, y0] = polarToXY(cx, cy, rOuter, start);
    const [x1, y1] = polarToXY(cx, cy, rOuter, end);
    const [x2, y2] = polarToXY(cx, cy, rInner, end);
    const [x3, y3] = polarToXY(cx, cy, rInner, start);
    return `M ${x0} ${y0} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x1} ${y1} L ${x2} ${y2} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x3} ${y3} Z`;
}

export default function Doudoughnut({
    width = 360,
    height,
    values,
    labels,
    colors,
    innerLabel = "",
    outerRadius = 150,
    thickness = 40,
    lineRadialGap = 16,
    lineBendLen = 24,
    lineStroke = 2,
    fontSize = 14,
    percentDigits = 0
}: DoudoughnutProps) {
    // ✅ 입력 정규화: 항상 배열/숫자로 만든다
    const vals: number[] = Array.isArray(values) ? values.filter(v => Number.isFinite(v)) : [];
    const labs: string[] = Array.isArray(labels) ? labels : [];
    const cols: string[] = Array.isArray(colors) ? colors : [];

    const w = Number.isFinite(width) ? width : 360;
    const h = Number.isFinite(height ?? width) ? (height ?? width) : 360;

    const cx = w / 2;
    const cy = h / 2;
    const rOuter = Number.isFinite(outerRadius) ? outerRadius : 150;
    const rInner = rOuter - (Number.isFinite(thickness) ? thickness : 40);
    const rMid = (rOuter + rInner) / 2;

    // ✅ reduce 안전: 초기값 0 + 빈배열 처리
    const total = useMemo(() => vals.reduce((a, b) => a + b, 0), [vals]);

    const slices = useMemo(() => {
        let acc = -Math.PI / 2; // 12시 방향 시작
        return vals.map((v, i) => {
            const frac = total > 0 ? v / total : 0;
            const angle = frac * TAU;
            const start = acc;
            const end = acc + angle;
            acc = end;
            const mid = (start + end) / 2;

            // 리드라인 시작점: 조각 두께 중앙
            const [sx, sy] = polarToXY(cx, cy, rMid, mid);
            const [ex, ey] = polarToXY(cx, cy, rOuter + (Number.isFinite(lineRadialGap) ? lineRadialGap : 16), mid);
            const right = Math.cos(mid) >= 0;
            const bend = Number.isFinite(lineBendLen) ? lineBendLen : 24;
            const hx = ex + (right ? bend : -bend);
            const hy = ey;

            const labelPad = 6;
            const lx = hx + (right ? labelPad : -labelPad);
            const ly = hy;

            return {
                i,
                start,
                end,
                mid,
                frac,
                path: arcPath(cx, cy, rOuter, rInner, start, end),
                leader: { sx, sy, ex, ey, hx, hy, right, lx, ly }
            };
        });
    }, [vals, total, cx, cy, rInner, rOuter, rMid, lineRadialGap, lineBendLen]);

    // ✅ 렌더 가드: 데이터 없음/합계 0
    if (vals.length === 0 || total <= 0) {
        return (
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img">
                {innerLabel && (
                    <text
                        x={cx}
                        y={cy}
                        fontSize={Math.max(12, (Number.isFinite(thickness) ? thickness : 40) * 0.6)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#8A8A8A"
                        style={{ fontWeight: 600 }}
                    >
                        {innerLabel || "No data"}
                    </text>
                )}
            </svg>
        );
    }

    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img">
            {/* 도넛 조각 */}
            {slices.map(s => (
                <path
                    key={`arc-${s.i}`}
                    d={s.path}
                    fill={cols.length ? (cols[s.i % cols.length] || "#888") : "#888"}
                    stroke="#fff"
                    strokeWidth={1}
                />
            ))}

            {/* 리드라인 */}
            {slices.map(s => (
                <polyline
                    key={`line-${s.i}`}
                    points={`${s.leader.sx},${s.leader.sy} ${s.leader.ex},${s.leader.ey} ${s.leader.hx},${s.leader.hy}`}
                    fill="none"
                    stroke="#757575"
                    strokeWidth={Number.isFinite(lineStroke) ? lineStroke : 2}
                    strokeLinejoin="round"
                />
            ))}

            {/* 라벨 */}
            {slices.map(s => {
                const label = labs[s.i] ?? "";
                const pct = (s.frac * 100) || 0;
                const anchor = s.leader.right ? "start" : "end";
                const dy1 = -4;
                const dy2 = (Number.isFinite(fontSize) ? fontSize : 14) + 2;
                return (
                    <g key={`label-${s.i}`}>
                        <text
                            x={s.leader.lx}
                            y={s.leader.ly + dy1}
                            fontSize={Number.isFinite(fontSize) ? fontSize : 14}
                            textAnchor={anchor}
                            dominantBaseline="ideographic"
                            fill="#3A3A3A"
                            style={{ fontWeight: 600 }}
                        >
                            {label}
                        </text>
                        <text
                            x={s.leader.lx}
                            y={s.leader.ly + dy2}
                            fontSize={Math.max(11, (Number.isFinite(fontSize) ? fontSize : 14) - 2)}
                            textAnchor={anchor}
                            dominantBaseline="hanging"
                            fill="#6B6B6B"
                        >
                            {pct.toFixed(Number.isFinite(percentDigits) ? percentDigits : 0)}%
                        </text>
                    </g>
                );
            })}

            {/* 중앙 텍스트 */}
            {innerLabel && (
                <text
                    x={cx}
                    y={cy}
                    fontSize={Math.max(12, (Number.isFinite(thickness) ? thickness : 40) * 0.6)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#5B5B5B"
                    style={{ fontWeight: 700 }}
                >
                    {innerLabel}
                </text>
            )}
        </svg>
    );
}
