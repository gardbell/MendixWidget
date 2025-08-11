import { createElement, useMemo } from "react";
import type { ListValue, ListAttributeValue, ObjectItem } from "mendix";
import Doudoughnut from "./Doudoughnut";

interface Props {
  name: string;
  class: string;
  style?: string; // or CSSProperties via styleObject if 쓰는 중이면 그 타입
  dataSource: ListValue;
  valueAttr: ListAttributeValue<Big>;
  labelAttr: ListAttributeValue<string>;
  colorAttr?: ListAttributeValue<string>;

  // appearance
  width: number;
  height: number;
  innerLabel: string;
  outerRadius: number;
  thickness: number;
  lineRadialGap: number;
  lineBendLen: number;
  lineStroke: number;
  fontSize: number;
  percentDigits: number;
}

export default function DoudoughnutWidget(props: Props) {
    console.warn("DS status:", props.dataSource?.status, "items:", props.dataSource?.items?.length);
console.warn("first item values:", {
  value: props.dataSource?.items?.[0] ? props.valueAttr?.get(props.dataSource.items[0])?.value : undefined,
  label: props.dataSource?.items?.[0] ? props.labelAttr?.get(props.dataSource.items[0])?.value : undefined,
  color: props.dataSource?.items?.[0] ? props.colorAttr?.get(props.dataSource.items[0])?.value : undefined
});
  const isReady =
    props.dataSource?.status === "available";

  const items: ObjectItem[] = (isReady && (props.dataSource.items ?? [])) || [];

  const { values, labels, colors } = useMemo(() => {
    const v: number[] = [];
    const l: string[] = [];
    const c: string[] = [];

    if (!isReady) return { values: v, labels: l, colors: c };

    for (const item of items) {
      const raw = props.valueAttr?.get(item)?.value;
      const num =
        typeof raw === "number"
          ? raw
          : typeof raw === "bigint"
          ? Number(raw)
          : typeof raw === "string"
          ? Number(raw)
          : 0;

      const lab = props.labelAttr?.get(item)?.value ?? "";
      const col = props.colorAttr?.get(item)?.value ?? undefined;

      if (Number.isFinite(num)) {
        v.push(num);
        l.push(lab);
        c.push(col ?? "");
      }
    }
    return { values: v, labels: l, colors: c };
  }, [isReady, items, props.valueAttr, props.labelAttr, props.colorAttr]);

  // 로딩/빈데이터 가드 (선택)
  if (!isReady) return <div className="mx-progress">Loading…</div>;

  return (
    <Doudoughnut
      width={props.width}
      height={props.height || props.width}
      values={values}
      labels={labels}
      colors={colors}
      innerLabel={props.innerLabel}
      outerRadius={props.outerRadius}
      thickness={props.thickness}
      lineRadialGap={props.lineRadialGap}
      lineBendLen={props.lineBendLen}
      lineStroke={props.lineStroke}
      fontSize={props.fontSize}
      percentDigits={props.percentDigits}
    />
  );
}
