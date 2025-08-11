import { createElement, useEffect, useRef } from "react";
import Plotly, { PieData } from "plotly.js-dist-min";
import { LeadLineChartContainerProps } from "../typings/LeadLineChartProps";
import Big from "big.js";

export default function LeadLineChart(props: LeadLineChartContainerProps) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elRef.current || !props.dataSource?.items) return;

    // 데이터
    const values: number[] = [];
    const labels: string[] = [];
    const colors: string[] = [];
    for (const item of props.dataSource.items) {
      const v = props.valueAttr.get(item).value;
      values.push(v instanceof Big ? Number(v.toString()) : Number(v ?? 0));
      labels.push(props.labelAttr.get(item).value ?? "");
      colors.push(props.colorAttr?.get(item).value ?? "");
    }

    const trace: Partial<PieData> = {
      type: "pie",
      values,
      labels,
      hole: 0.68,
      // ★ 라벨 + 리드라인 자동
      textposition: "outside",
      textinfo: "label+percent",
      automargin: true,
      sort: false,
      rotation: -90,
      direction: "clockwise",
      marker: {
        colors: colors.some(Boolean) ? colors : undefined,
        line: { color: "#fff", width: 1 }
      },
      // 도메인 살짝 중앙으로 → 리드라인 짧고 라벨 잘림 방지
      domain: { x: [0.25, 0.75], y: [0.22, 0.78] },
      // 작은 영역에서도 라벨 겹치면 숨겨 과밀 방지
      textfont: { family: "Arial, sans-serif", size: 12, color: "#333" },
    };

    const layout = {
      showlegend: false,
      annotations: [
        {
          text: "포트폴리오",
          x: 0.5,
          y: 0.5,
          font: {
            size: 20
          },
          showarrow: false
        }
      ],
      margin: { t: 20, b: 20, l: 20, r: 20 }
    };

    Plotly.react(elRef.current, [trace], layout, { responsive: true, displayModeBar: false });

    const onResize = () => Plotly.Plots.resize(elRef.current!);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      Plotly.purge(elRef.current!);
    };
  }, [props.dataSource?.items, props.valueAttr, props.labelAttr, props.colorAttr]);

  return (
    <div
      ref={elRef}
      style={{ width: "100%", height: "100%", overflow: "visible", ...(props.style ?? {}) }}
    />
  );
}
