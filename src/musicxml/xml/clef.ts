import type { MusicXmlMapperEvent } from "@/musicxml/xml/events";
import { musicXmlPathToString } from "@/musicxml/xml/path";
import type { MusicXmlReducer } from "@/musicxml/xml/reducer";
import type { MusicXmlDiagnostic } from "@/musicxml/xml/stream-mapper";
import {
  getPartCursorAbsDiv,
  type MusicXmlTimingState,
} from "@/musicxml/xml/timing-state";
import type { XmlEvent } from "@/xml";
import type { XmlNamePool } from "@/xml/public/name-pool";

export type MusicXmlClefEvent = Readonly<{
  kind: "Clef";
  partId: string;
  sign: string | null;
  line: number | null;
  octaveChange: number | null;
  tAbsDiv: number;
  meta: Readonly<{
    path: string;
    offset: number;
  }>;
}>;

type State = {
  currentPartId: string | null;
  inClef: boolean;
  captureSignText: boolean;
  captureLineText: boolean;
  captureOctaveChangeText: boolean;
  sign: string | null;
  line: number | null;
  octaveChange: number | null;
};

function segmentName(pool: XmlNamePool, evt: XmlEvent): string | null {
  if (evt.kind === "StartElement" || evt.kind === "EndElement")
    return pool.toString(evt.name);
  return null;
}

function getAttr(
  pool: XmlNamePool,
  evt: Extract<XmlEvent, { kind: "StartElement" }>,
  attrName: string,
): string | null {
  for (const a of evt.attrs) {
    if (pool.toString(a.name) === attrName) return String(a.value);
  }
  return null;
}

function parseIntStrict(value: string): number | null {
  if (!/^-?[0-9]+$/.test(value)) return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function createClefReducer(
  pool: XmlNamePool,
  diagnostics: MusicXmlDiagnostic[],
  timing: MusicXmlTimingState,
): MusicXmlReducer<State, MusicXmlMapperEvent> {
  return {
    init: () => ({
      currentPartId: null,
      inClef: false,
      captureSignText: false,
      captureLineText: false,
      captureOctaveChangeText: false,
      sign: null,
      line: null,
      octaveChange: null,
    }),

    consume(state, evt, ctx, emit) {
      if (evt.kind === "StartElement") {
        const name = segmentName(pool, evt);
        if (name === "part") {
          state.currentPartId = getAttr(pool, evt, "id");
          return;
        }

        if (name === "clef") {
          state.inClef = true;
          state.sign = null;
          state.line = null;
          state.octaveChange = null;
          return;
        }

        if (!state.inClef) return;
        if (name === "sign") state.captureSignText = true;
        if (name === "line") state.captureLineText = true;
        if (name === "clef-octave-change") state.captureOctaveChangeText = true;
        return;
      }

      if (evt.kind === "Text") {
        if (!state.inClef) return;
        const text = String(evt.value).trim();
        if (!text) return;

        if (state.captureSignText && state.sign == null) {
          state.sign = text;
          return;
        }

        if (state.captureLineText && state.line == null) {
          const n = parseIntStrict(text);
          if (n == null) {
            diagnostics.push({
              message: `Invalid clef line: ${text}`,
              path: musicXmlPathToString(pool, ctx.path),
            });
          } else {
            state.line = n;
          }
          return;
        }

        if (state.captureOctaveChangeText && state.octaveChange == null) {
          const n = parseIntStrict(text);
          if (n == null) {
            diagnostics.push({
              message: `Invalid clef octave-change: ${text}`,
              path: musicXmlPathToString(pool, ctx.path),
            });
          } else {
            state.octaveChange = n;
          }
        }
        return;
      }

      if (evt.kind === "EndElement") {
        const name = segmentName(pool, evt);
        if (name === "sign") state.captureSignText = false;
        if (name === "line") state.captureLineText = false;
        if (name === "clef-octave-change")
          state.captureOctaveChangeText = false;

        if (name === "clef" && state.inClef) {
          state.inClef = false;
          const partId = state.currentPartId;
          if (!partId) return;

          emit({
            kind: "Clef",
            partId,
            sign: state.sign,
            line: state.line,
            octaveChange: state.octaveChange,
            tAbsDiv: getPartCursorAbsDiv(timing, partId),
            meta: {
              path: musicXmlPathToString(pool, ctx.path),
              offset: ctx.pos.offset,
            },
          });
          return;
        }

        if (name === "part") state.currentPartId = null;
      }
    },
  };
}
