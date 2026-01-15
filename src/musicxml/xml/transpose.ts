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

export type MusicXmlTransposeEvent = Readonly<{
  kind: "Transpose";
  partId: string;
  chromatic: number | null;
  diatonic: number | null;
  octaveChange: number | null;
  double: boolean;
  tAbsDiv: number;
  meta: Readonly<{
    path: string;
    offset: number;
  }>;
}>;

type State = {
  currentPartId: string | null;
  inTranspose: boolean;
  captureChromaticText: boolean;
  captureDiatonicText: boolean;
  captureOctaveChangeText: boolean;
  chromatic: number | null;
  diatonic: number | null;
  octaveChange: number | null;
  double: boolean;
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

export function createTransposeReducer(
  pool: XmlNamePool,
  diagnostics: MusicXmlDiagnostic[],
  timing: MusicXmlTimingState,
): MusicXmlReducer<State, MusicXmlMapperEvent> {
  return {
    init: () => ({
      currentPartId: null,
      inTranspose: false,
      captureChromaticText: false,
      captureDiatonicText: false,
      captureOctaveChangeText: false,
      chromatic: null,
      diatonic: null,
      octaveChange: null,
      double: false,
    }),

    consume(state, evt, ctx, emit) {
      if (evt.kind === "StartElement") {
        const name = segmentName(pool, evt);
        if (name === "part") {
          state.currentPartId = getAttr(pool, evt, "id");
          return;
        }

        if (name === "transpose") {
          state.inTranspose = true;
          state.chromatic = null;
          state.diatonic = null;
          state.octaveChange = null;
          state.double = false;
          return;
        }

        if (!state.inTranspose) return;
        if (name === "chromatic") state.captureChromaticText = true;
        if (name === "diatonic") state.captureDiatonicText = true;
        if (name === "octave-change") state.captureOctaveChangeText = true;
        if (name === "double") state.double = true;
        return;
      }

      if (evt.kind === "Text") {
        if (!state.inTranspose) return;
        const text = String(evt.value).trim();
        if (!text) return;

        if (state.captureChromaticText && state.chromatic == null) {
          const n = parseIntStrict(text);
          if (n == null) {
            diagnostics.push({
              message: `Invalid transpose chromatic: ${text}`,
              path: musicXmlPathToString(pool, ctx.path),
            });
          } else {
            state.chromatic = n;
          }
          return;
        }

        if (state.captureDiatonicText && state.diatonic == null) {
          const n = parseIntStrict(text);
          if (n == null) {
            diagnostics.push({
              message: `Invalid transpose diatonic: ${text}`,
              path: musicXmlPathToString(pool, ctx.path),
            });
          } else {
            state.diatonic = n;
          }
          return;
        }

        if (state.captureOctaveChangeText && state.octaveChange == null) {
          const n = parseIntStrict(text);
          if (n == null) {
            diagnostics.push({
              message: `Invalid transpose octave-change: ${text}`,
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
        if (name === "chromatic") state.captureChromaticText = false;
        if (name === "diatonic") state.captureDiatonicText = false;
        if (name === "octave-change") state.captureOctaveChangeText = false;

        if (name === "transpose" && state.inTranspose) {
          state.inTranspose = false;
          const partId = state.currentPartId;
          if (!partId) return;

          emit({
            kind: "Transpose",
            partId,
            chromatic: state.chromatic,
            diatonic: state.diatonic,
            octaveChange: state.octaveChange,
            double: state.double,
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
