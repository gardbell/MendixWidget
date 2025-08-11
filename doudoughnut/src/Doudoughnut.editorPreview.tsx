import { createElement } from "react";
import { DoudoughnutPreviewProps } from "../typings/DoudoughnutProps";
import DoudoughnutWidget from "./DoudoughnutWidget";

// null → 기본값
const nz = <T,>(v: T | null | undefined, fallback: T) => (v ?? fallback);

export const preview = (props: DoudoughnutPreviewProps) => {
  const width         = nz(props.width, 360);
  const height        = nz(props.height, width);
  const outerRadius   = nz(props.outerRadius, 150);
  const thickness     = nz(props.thickness, 40);
  const lineRadialGap = nz(props.lineRadialGap, 16);
  const lineBendLen   = nz(props.lineBendLen, 24);
  const lineStroke    = nz(props.lineStroke, 2);
  const fontSize      = nz(props.fontSize, 14);
  const percentDigits = nz(props.percentDigits, 0);
  const innerLabel    = props.innerLabel ?? "";

  const name  = (props as any).name  ?? "Preview";
  const klass = (props as any).class ?? "";
  const style     = (props as any).style ?? "";

  return (
    <div style={{ display: "inline-block", background: "#fff" }}>
      <DoudoughnutWidget

        name={name}
        class={klass}
        style={style}

        dataSource={{} as any}
        valueAttr={{} as any}
        labelAttr={{} as any}
        colorAttr={{} as any}

        width={width}
        height={height}
        outerRadius={outerRadius}
        thickness={thickness}
        lineRadialGap={lineRadialGap}
        lineBendLen={lineBendLen}
        lineStroke={lineStroke}
        fontSize={fontSize}
        percentDigits={percentDigits}
        innerLabel={innerLabel}
      />
    </div>
  );
};
