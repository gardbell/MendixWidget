import { createElement, useEffect, useRef } from "react";
import Plotly, { PieData } from "plotly.js-dist-min";
import { LeadLineChartContainerProps } from "../typings/LeadLineChartProps";
import Big from "big.js";

export default function LeadLineChart(props: LeadLineChartContainerProps) {

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!props.dataSource?.items) return;

    const values: number[] = [];
    const labels: string[] = [];
    const colors: string[] = [];
    for (const item of props.dataSource.items) {
      const v = props.valueAttr.get(item).value;
      values.push(v instanceof Big ? Number(v.toString()) : Number(v ?? 0));
      labels.push(props.labelAttr.get(item).value ?? "");
      colors.push(props.colorAttr?.get(item).value ?? "");
    }

    const data: Partial<PieData>[] = [{
      type: "pie",
      values,
      labels,
      hole: 0.6,
      textposition: "outside",
      textinfo: "label+percent",
      automargin: true,
      pull: 0,
      marker: {
        colors: colors.some(Boolean) ? colors : undefined,
        line: { color: "#fff", width: 1 }
      },
      domain: { x: [0.25, 0.75], y: [0.22, 0.78] },
      textfont: { family: "Arial, sans-serif", size: 12, color: "#333" },
    }];

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
      margin: { t: 0, b: 0, l: 0, r: 0 }
    };

    if (chartRef.current) {
      Plotly.newPlot(chartRef.current, data, layout, {
        responsive: true
      });
    }
  }, [props.valueAttr, props.labelAttr, props.colorAttr]);

  return (
    <div
      ref={chartRef}
      style={{ width: "200px", height: "200px", ...(props.style ?? {}) }}
    />
  );
}
