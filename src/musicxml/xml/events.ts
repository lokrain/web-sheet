import type { MusicXmlDivisionsEvent } from "@/musicxml/xml/divisions";
import type { MusicXmlMeasureBoundaryEvent } from "@/musicxml/xml/measure";
import type { MusicXmlNoteEvent } from "@/musicxml/xml/note";
import type { MusicXmlPartListEvent } from "@/musicxml/xml/part-list";
import type { MusicXmlTimeSigEvent } from "@/musicxml/xml/time-signature";

export type MusicXmlMapperEvent =
  | MusicXmlDivisionsEvent
  | MusicXmlNoteEvent
  | MusicXmlPartListEvent
  | MusicXmlTimeSigEvent
  | MusicXmlMeasureBoundaryEvent;
