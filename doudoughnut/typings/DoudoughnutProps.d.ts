/**
 * This file was generated from Doudoughnut.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { CSSProperties } from "react";
import { ListValue, ListAttributeValue } from "mendix";
import { Big } from "big.js";

export interface DoudoughnutContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    dataSource: ListValue;
    valueAttr: ListAttributeValue<Big>;
    labelAttr: ListAttributeValue<string>;
    colorAttr: ListAttributeValue<string>;
    innerLabel: string;
    width: number;
    height: number;
    outerRadius: number;
    thickness: number;
    lineRadialGap: number;
    lineBendLen: number;
    lineStroke: number;
    fontSize: number;
    percentDigits: number;
}

export interface DoudoughnutPreviewProps {
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
    innerLabel: string;
    width: number | null;
    height: number | null;
    outerRadius: number | null;
    thickness: number | null;
    lineRadialGap: number | null;
    lineBendLen: number | null;
    lineStroke: number | null;
    fontSize: number | null;
    percentDigits: number | null;
}
