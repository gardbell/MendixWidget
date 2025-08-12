/**
 * This file was generated from DoughnutChart.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { CSSProperties } from "react";
import { ListValue, ListAttributeValue } from "mendix";
import { Big } from "big.js";

export interface DoughnutChartContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    dataSource: ListValue;
    valueAttr: ListAttributeValue<Big>;
    labelAttr: ListAttributeValue<string>;
    colorAttr: ListAttributeValue<string>;
    width: number;
    height: number;
    cutoutPct: number;
    rotationDeg: number;
    centerText: string;
    centerTextFontSize: number;
    centerTextFontWeight: number;
    centerTextFontColor: string;
    showPercent: boolean;
    fontSize: number;
    minLabelGap: number;
    labelWeight: number;
    labelColor: string;
    elbowLen: number;
    elbowVert: number;
    elbowOnlyTopBottom: boolean;
    topBottomThresholdDeg: number;
}

export interface DoughnutChartPreviewProps {
    /**
     * @deprecated Deprecated since version 9.18.0. Please use class property instead.
     */
    className: string;
    class: string;
    style: string;
    styleObject?: CSSProperties;
    readOnly: boolean;
    renderMode: "design" | "xray" | "structure";
    translate: (text: string) => string;
    dataSource: {} | { caption: string } | { type: string } | null;
    valueAttr: string;
    labelAttr: string;
    colorAttr: string;
    width: number | null;
    height: number | null;
    cutoutPct: number | null;
    rotationDeg: number | null;
    centerText: string;
    centerTextFontSize: number | null;
    centerTextFontWeight: number | null;
    centerTextFontColor: string;
    showPercent: boolean;
    fontSize: number | null;
    minLabelGap: number | null;
    labelWeight: number | null;
    labelColor: string;
    elbowLen: number | null;
    elbowVert: number | null;
    elbowOnlyTopBottom: boolean;
    topBottomThresholdDeg: number | null;
}
