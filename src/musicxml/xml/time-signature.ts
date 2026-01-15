import {
  type MusicXmlDiagnostic,
  MusicXmlErrorCode,
} from "@/musicxml/xml/error";
import type { MusicXmlMapperEvent } from "@/musicxml/xml/events";
import { musicXmlPathToString } from "@/musicxml/xml/path";
import type { MusicXmlReducer } from "@/musicxml/xml/reducer";
import {
  getPartCursorAbsDiv,
  type MusicXmlTimingState,
} from "@/musicxml/xml/timing-state";
import type { XmlEvent } from "@/xml";
import type { XmlNamePool } from "@/xml/public/name-pool";

export type MusicXmlTimeSigEvent = Readonly<{
  kind: "TimeSig";
  partId: string;
  beats: number;
  beatType: number;
  tAbsDiv: number;
  meta: Readonly<{
    path: string;
    offset: number;
  }>;
}>;

type State = {
  currentPartId: string | null;
  inTime: boolean;
  captureBeatsText: boolean;
  captureBeatTypeText: boolean;
  beats: number | null;
  beatType: number | null;
  lastSigByPartId: Map<string, Readonly<{ beats: number; beatType: number }>>;
};

function segmentName(pool: XmlNamePool, evt: XmlEvent): string | null {
  if (evt.kind === "StartElement" || evt.kind === "EndElement") {
    return pool.toString(evt.name);
  }
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

function parsePositiveInt(value: string): number | null {
  if (!/^[0-9]+$/.test(value)) return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function createTimeSignatureReducer(
  pool: XmlNamePool,
  diagnostics: MusicXmlDiagnostic[],
  timing: MusicXmlTimingState,
): MusicXmlReducer<State, MusicXmlMapperEvent> {
  return {
    init: () => ({
      currentPartId: null,
      inTime: false,
      captureBeatsText: false,
      captureBeatTypeText: false,
      beats: null,
      beatType: null,
      lastSigByPartId: new Map(),
    }),

    consume(state, evt, ctx, emit) {
      if (evt.kind === "StartElement") {
        const name = segmentName(pool, evt);

        if (name === "part") {
          state.currentPartId = getAttr(pool, evt, "id");
          return;
        }

        if (name === "time") {
          state.inTime = true;
          state.beats = null;
          state.beatType = null;
          return;
        }

        if (state.inTime && name === "beats") state.captureBeatsText = true;
        if (state.inTime && name === "beat-type")
          state.captureBeatTypeText = true;
        return;
      }

      if (evt.kind === "Text") {
        if (!state.inTime) return;
        const text = String(evt.value).trim();
        if (!text) return;

        if (state.captureBeatsText && state.beats == null) {
          const parsed = parsePositiveInt(text);
          if (parsed == null) {
            diagnostics.push({
              code: MusicXmlErrorCode.InvalidTimeBeats,
              message: `Invalid time beats: ${text}`,
              path: musicXmlPathToString(pool, ctx.path),
              offset: ctx.pos.offset,
            });
          } else {
            state.beats = parsed;
          }
          return;
        }

        if (state.captureBeatTypeText && state.beatType == null) {
          const parsed = parsePositiveInt(text);
          if (parsed == null) {
            diagnostics.push({
              code: MusicXmlErrorCode.InvalidTimeBeatType,
              message: `Invalid time beat-type: ${text}`,
              path: musicXmlPathToString(pool, ctx.path),
              offset: ctx.pos.offset,
            });
          } else {
            state.beatType = parsed;
          }
        }
        return;
      }

      if (evt.kind === "EndElement") {
        const name = segmentName(pool, evt);
        if (name === "beats") state.captureBeatsText = false;
        if (name === "beat-type") state.captureBeatTypeText = false;

        if (name === "time" && state.inTime) {
          state.inTime = false;

          const partId = state.currentPartId;
          if (!partId) return;
          if (state.beats == null || state.beatType == null) return;

          const prev = state.lastSigByPartId.get(partId);
          if (
            prev &&
            prev.beats === state.beats &&
            prev.beatType === state.beatType
          )
            return;
          state.lastSigByPartId.set(partId, {
            beats: state.beats,
            beatType: state.beatType,
          });

          emit({
            kind: "TimeSig",
            partId,
            beats: state.beats,
            beatType: state.beatType,
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
