
export function getPreview(_props: any) {
  // 간단한 컨테이너 미리보기만 반환
  return { type: "Container", borders: true, children: [] } as any;
}

export function check(_props: any) {
  // 편집기 경고/오류 없음
  return [] as any[];
}

export function getProperties(_props: any, defaultProperties: any) {
  // XML 정의 그대로 노출
  return defaultProperties;
}