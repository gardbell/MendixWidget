import { transformGroupsIntoTabs, type Properties } from "@mendix/pluggable-widgets-tools";
import type { DoughnutChartPreviewProps } from "../typings/DoughnutChartProps";

export function getProperties(
  _values: DoughnutChartPreviewProps,
  defaultProperties: Properties
): Properties {
  transformGroupsIntoTabs(defaultProperties);
  return defaultProperties;
}
