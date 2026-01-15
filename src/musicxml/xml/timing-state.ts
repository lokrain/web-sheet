export type MusicXmlTimingState = {
  // Absolute cursor in divisions for the current position within a part.
  cursorAbsDivByPartId: Map<string, number>;

  // Absolute measure start cursor in divisions for the current measure within a part.
  measureStartAbsDivByPartId: Map<string, number>;
};

export function createMusicXmlTimingState(): MusicXmlTimingState {
  return {
    cursorAbsDivByPartId: new Map(),
    measureStartAbsDivByPartId: new Map(),
  };
}

export function getPartCursorAbsDiv(
  state: MusicXmlTimingState,
  partId: string,
): number {
  return state.cursorAbsDivByPartId.get(partId) ?? 0;
}

export function setPartCursorAbsDiv(
  state: MusicXmlTimingState,
  partId: string,
  value: number,
): void {
  state.cursorAbsDivByPartId.set(partId, value);
}

export function setMeasureStartAbsDiv(
  state: MusicXmlTimingState,
  partId: string,
  value: number,
): void {
  state.measureStartAbsDivByPartId.set(partId, value);
}

export function getMeasureStartAbsDiv(
  state: MusicXmlTimingState,
  partId: string,
): number {
  return state.measureStartAbsDivByPartId.get(partId) ?? 0;
}
