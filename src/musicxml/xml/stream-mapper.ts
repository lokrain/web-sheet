export type MusicXmlDiagnostic = {
  message: string;
  path?: string;
};

export type MusicXmlMapperOptions = {
  strict?: boolean;
};

export type MusicXmlDivisionsEvent = unknown;
export type MusicXmlTempoEvent = unknown;
export type MusicXmlTie = unknown;

export type MusicXmlPitch = unknown;
export type MusicXmlNote = unknown;
export type MusicXmlMeasure = unknown;
export type MusicXmlPart = unknown;

export type MusicXmlScorePartwise = unknown;

export type MusicXmlExtract = {
  score: MusicXmlScorePartwise;
  diagnostics: MusicXmlDiagnostic[];
};

export function mapMusicXmlScorePartwise(
  _xml: unknown,
  _options?: MusicXmlMapperOptions,
): MusicXmlExtract {
  throw new Error("MusicXML stream mapping is not implemented yet.");
}
