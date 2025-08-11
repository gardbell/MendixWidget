import { createElement } from "react";
import type { LeadLineChartPreviewProps } from "../typings/LeadLineChartProps";

export function preview(props: LeadLineChartPreviewProps) {
    // 간단한 도넛 모양 플레이스홀더
    return (
        <div style={{ ...container, ...(props.styleObject ?? {}) }}>
            <div style={donut}>LeadLineChart</div>
            <div style={meta}>
                <div><b>Data source</b>: bound</div>
                <div><b>Value</b>: {props.valueAttr || "(not set)"}</div>
                <div><b>Label</b>: {props.labelAttr || "(not set)"}</div>
                <div><b>Color</b>: {props.colorAttr || "(optional)"}</div>
            </div>
        </div>
    );
}

export function getPreviewCss() {
    // 디자이너 전용 스타일 (선택)
    return `
    `;
}

const container: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    border: "1px dashed #ccc",
    borderRadius: 8
};

const donut: React.CSSProperties = {
    width: 60,
    height: 60,
    borderRadius: "50%",
    border: "10px solid rgba(0,0,0,.15)",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10
};

const meta: React.CSSProperties = { lineHeight: 1.6 };
