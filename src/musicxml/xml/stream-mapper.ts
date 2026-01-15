import { createBarlinesReducer } from "@/musicxml/xml/barlines";
import { createClefReducer } from "@/musicxml/xml/clef";
import { createDirectionsReducer } from "@/musicxml/xml/directions";
import { dispatchXmlEvents } from "@/musicxml/xml/dispatch";
import { createDivisionsReducer } from "@/musicxml/xml/divisions";
import {
  type MusicXmlDiagnostic,
  MusicXmlErrorCode,
} from "@/musicxml/xml/error";
import type { MusicXmlMapperEvent } from "@/musicxml/xml/events";
import { createKeySignatureReducer } from "@/musicxml/xml/key-signature";
import { createMeasureBoundaryReducer } from "@/musicxml/xml/measure";
import { createNoteReducer } from "@/musicxml/xml/note";
import { createPartListReducer } from "@/musicxml/xml/part-list";
import { createStavesReducer } from "@/musicxml/xml/staves";
import { createTempoReducer } from "@/musicxml/xml/tempo";
import { createTimeSignatureReducer } from "@/musicxml/xml/time-signature";
import { createMusicXmlTimingState } from "@/musicxml/xml/timing-state";
import { createTransposeReducer } from "@/musicxml/xml/transpose";
import { parseEventsCollect } from "@/xml";
import type { XmlNamePool } from "@/xml/public/name-pool";

export type MusicXmlMapperOptions = {
  strict?: boolean;
};

export type MusicXmlScorePartwise = unknown;

export type MusicXmlExtract = {
  score: MusicXmlScorePartwise;
  events: MusicXmlMapperEvent[];
  diagnostics: MusicXmlDiagnostic[];
};

export type MusicXmlScoreRoot =
  | Readonly<{ kind: "score-partwise" }>
  | Readonly<{ kind: "score-timewise" }>
  | Readonly<{ kind: "unknown"; name: string | null }>;

function toXmlString(input: unknown): string {
  if (typeof input === "string") return input;
  if (input instanceof Uint8Array) return new TextDecoder().decode(input);
  throw new Error("MusicXML input must be a string or Uint8Array");
}

function firstRootStart(
  pool: XmlNamePool,
  events: ReturnType<typeof parseEventsCollect>["events"],
) {
  for (const evt of events) {
    if (evt.kind !== "StartElement") continue;
    return { name: pool.toString(evt.name), evt };
  }
  return { name: null, evt: null } as const;
}

export function detectMusicXmlRoot(input: unknown): {
  root: MusicXmlScoreRoot;
  diagnostics: MusicXmlDiagnostic[];
} {
  const xml = toXmlString(input);
  const { pool, events } = parseEventsCollect(xml);
  const { name } = firstRootStart(pool, events);
  if (name === "score-partwise")
    return { root: { kind: "score-partwise" }, diagnostics: [] };
  if (name === "score-timewise")
    return { root: { kind: "score-timewise" }, diagnostics: [] };
  return {
    root: { kind: "unknown", name },
    diagnostics: [
      {
        code: name
          ? MusicXmlErrorCode.UnexpectedRoot
          : MusicXmlErrorCode.MissingRoot,
        message: name
          ? `Unexpected root element: ${name}`
          : "Missing root element",
      },
    ],
  };
}

export function mapMusicXmlScorePartwise(
  xmlInput: unknown,
  options?: MusicXmlMapperOptions,
): MusicXmlExtract {
  const strict = options?.strict ?? false;
  const detected = detectMusicXmlRoot(xmlInput);
  if (detected.root.kind !== "score-partwise") {
    if (strict) {
      throw new Error(
        detected.root.kind === "unknown"
          ? `MusicXML root is not score-partwise (found: ${detected.root.name ?? "<none>"})`
          : `MusicXML root is not score-partwise (found: ${detected.root.kind})`,
      );
    }
    const diags = [...detected.diagnostics];
    if (detected.root.kind === "score-timewise") {
      diags.push({
        code: MusicXmlErrorCode.UnsupportedRoot,
        message: "score-timewise is not supported by mapMusicXmlScorePartwise",
      });
    }
    return { score: undefined, events: [], diagnostics: diags };
  }

  const xml = toXmlString(xmlInput);
  const diagnostics: MusicXmlDiagnostic[] = [...detected.diagnostics];
  const { pool, events } = parseEventsCollect(xml);
  const timing = createMusicXmlTimingState();

  const mapped = dispatchXmlEvents(events, [
    createDivisionsReducer(pool, diagnostics),
    createPartListReducer(pool, diagnostics),
    createTempoReducer(pool, diagnostics, timing),
    createDirectionsReducer(pool, diagnostics, timing),
    createTimeSignatureReducer(pool, diagnostics, timing),
    createKeySignatureReducer(pool, diagnostics, timing),
    createStavesReducer(pool, diagnostics, timing),
    createClefReducer(pool, diagnostics, timing),
    createTransposeReducer(pool, diagnostics, timing),
    createBarlinesReducer(pool, diagnostics, timing),
    createMeasureBoundaryReducer(pool, diagnostics, timing),
    createNoteReducer(pool, diagnostics, timing),
  ]);

  return { score: undefined, events: mapped, diagnostics };
}
