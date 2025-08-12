import { createElement, ReactElement } from "react";
import type { DoughnutChartPreviewProps } from "../typings/DoughnutChartProps";

export function getPreview(props: DoughnutChartPreviewProps): ReactElement {
  // width/height가 Preview 타입에 없더라도 동작하도록 any 캐스팅 + 기본값
  const w = Number(((props as any)?.width ?? 360));
  const h = Number(((props as any)?.height ?? 360));

  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 12,
        border: "1px solid #e0e0e0",
        display: "grid",
        placeItems: "center",
        background: "repeating-conic-gradient(#eef 0 10deg,#f9f9f9 10deg 20deg)"
      }}
    >
      <div style={{ textAlign: "center", color: "#555", fontSize: 12, lineHeight: 1.4 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Donut Elbow Chart</div>
        <div>Top/Bottom: elbow</div>
        <div>Left/Right: straight</div>
      </div>
    </div>
  );
}

export function getPreviewCss(): string {
  return "";
}
