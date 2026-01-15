import type { MusicXmlDivisionsEvent } from "@/musicxml/xml/divisions";
import type { MusicXmlMeasureBoundaryEvent } from "@/musicxml/xml/measure";
import type { MusicXmlPartListEvent } from "@/musicxml/xml/part-list";

export type MusicXmlMapperEvent =
  | MusicXmlDivisionsEvent
  | MusicXmlPartListEvent
  | MusicXmlMeasureBoundaryEvent;
