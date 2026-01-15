import type { MusicXmlDivisionsEvent } from "@/musicxml/xml/divisions";
import type { MusicXmlKeySigEvent } from "@/musicxml/xml/key-signature";
import type { MusicXmlMeasureBoundaryEvent } from "@/musicxml/xml/measure";
import type { MusicXmlNoteEvent } from "@/musicxml/xml/note";
import type { MusicXmlPartListEvent } from "@/musicxml/xml/part-list";
import type { MusicXmlTimeSigEvent } from "@/musicxml/xml/time-signature";

export type MusicXmlMapperEvent =
  | MusicXmlDivisionsEvent
  | MusicXmlKeySigEvent
  | MusicXmlNoteEvent
  | MusicXmlPartListEvent
  | MusicXmlTimeSigEvent
  | MusicXmlMeasureBoundaryEvent;
