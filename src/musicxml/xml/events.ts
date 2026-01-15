import type { MusicXmlClefEvent } from "@/musicxml/xml/clef";
import type { MusicXmlDivisionsEvent } from "@/musicxml/xml/divisions";
import type { MusicXmlKeySigEvent } from "@/musicxml/xml/key-signature";
import type { MusicXmlMeasureBoundaryEvent } from "@/musicxml/xml/measure";
import type { MusicXmlNoteEvent } from "@/musicxml/xml/note";
import type { MusicXmlPartListEvent } from "@/musicxml/xml/part-list";
import type { MusicXmlStavesEvent } from "@/musicxml/xml/staves";
import type { MusicXmlTimeSigEvent } from "@/musicxml/xml/time-signature";
import type { MusicXmlTransposeEvent } from "@/musicxml/xml/transpose";

export type MusicXmlMapperEvent =
  | MusicXmlDivisionsEvent
  | MusicXmlClefEvent
  | MusicXmlKeySigEvent
  | MusicXmlNoteEvent
  | MusicXmlPartListEvent
  | MusicXmlStavesEvent
  | MusicXmlTimeSigEvent
  | MusicXmlTransposeEvent
  | MusicXmlMeasureBoundaryEvent;
