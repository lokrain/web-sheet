export enum MusicXmlErrorCode {
  MissingRoot = "MissingRoot",
  UnexpectedRoot = "UnexpectedRoot",
  UnsupportedRoot = "UnsupportedRoot",
  MissingRequiredAttribute = "MissingRequiredAttribute",
  InvalidDivisions = "InvalidDivisions",
  InvalidBackupDuration = "InvalidBackupDuration",
  InvalidForwardDuration = "InvalidForwardDuration",
  CursorUnderflowOnBackup = "CursorUnderflowOnBackup",
  InvalidNoteDuration = "InvalidNoteDuration",
  MissingNoteDuration = "MissingNoteDuration",
  InvalidPitchAlter = "InvalidPitchAlter",
  InvalidPitchOctave = "InvalidPitchOctave",
  ChordWithoutPriorOnset = "ChordWithoutPriorOnset",
  InvalidTimeBeats = "InvalidTimeBeats",
  InvalidTimeBeatType = "InvalidTimeBeatType",
  InvalidKeyFifths = "InvalidKeyFifths",
  InvalidClefLine = "InvalidClefLine",
  InvalidClefOctaveChange = "InvalidClefOctaveChange",
  InvalidStavesCount = "InvalidStavesCount",
  InvalidTransposeChromatic = "InvalidTransposeChromatic",
  InvalidTransposeDiatonic = "InvalidTransposeDiatonic",
  InvalidTransposeOctaveChange = "InvalidTransposeOctaveChange",
  InvalidSoundTempo = "InvalidSoundTempo",
  InvalidMetronomePerMinute = "InvalidMetronomePerMinute",
}

export type MusicXmlDiagnostic = Readonly<{
  code: MusicXmlErrorCode;
  message: string;
  path?: string;
  offset?: number;
}>;
