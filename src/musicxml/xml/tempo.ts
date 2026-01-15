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

export type MusicXmlTempoEvent = Readonly<{
  kind: "Tempo";
  partId: string;
  bpm: number;
  tAbsDiv: number;
  meta: Readonly<{
    path: string;
    offset: number;
  }>;
}>;

type State = {
  currentPartId: string | null;

  // <sound tempo="..."/>
  pendingSoundTempo: number | null;

  // <metronome><per-minute>...</per-minute></metronome>
  inMetronome: boolean;
  capturePerMinuteText: boolean;
  pendingPerMinute: number | null;

  lastTempoByPartId: Map<string, number>;
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

function parsePositiveNumber(value: string): number | null {
  // MusicXML per-minute/tempo can be decimal.
  if (!/^[0-9]+(\.[0-9]+)?$/.test(value)) return null;
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function createTempoReducer(
  pool: XmlNamePool,
  diagnostics: MusicXmlDiagnostic[],
  timing: MusicXmlTimingState,
): MusicXmlReducer<State, MusicXmlMapperEvent> {
  return {
    init: () => ({
      currentPartId: null,
      pendingSoundTempo: null,
      inMetronome: false,
      capturePerMinuteText: false,
      pendingPerMinute: null,
      lastTempoByPartId: new Map(),
    }),

    consume(state, evt, ctx, emit) {
      if (evt.kind === "StartElement") {
        const name = segmentName(pool, evt);

        if (name === "part") {
          state.currentPartId = getAttr(pool, evt, "id");
          return;
        }

        // <sound tempo="120"/>
        if (name === "sound") {
          const partId = state.currentPartId;
          if (!partId) return;

          const raw = getAttr(pool, evt, "tempo");
          if (!raw) return;
          const parsed = parsePositiveNumber(raw);
          if (parsed == null) {
            diagnostics.push({
              code: MusicXmlErrorCode.InvalidSoundTempo,
              message: `Invalid sound tempo: ${raw}`,
              path: musicXmlPathToString(pool, ctx.path),
              offset: ctx.pos.offset,
            });
            return;
          }
          state.pendingSoundTempo = parsed;
          return;
        }

        if (name === "metronome") {
          state.inMetronome = true;
          state.pendingPerMinute = null;
          return;
        }

        if (state.inMetronome && name === "per-minute") {
          state.capturePerMinuteText = true;
        }

        return;
      }

      if (evt.kind === "Text") {
        if (!state.capturePerMinuteText || state.pendingPerMinute != null)
          return;
        const partId = state.currentPartId;
        if (!partId) return;

        const text = String(evt.value).trim();
        if (!text) return;
        const parsed = parsePositiveNumber(text);
        if (parsed == null) {
          diagnostics.push({
            code: MusicXmlErrorCode.InvalidMetronomePerMinute,
            message: `Invalid metronome per-minute: ${text}`,
            path: musicXmlPathToString(pool, ctx.path),
            offset: ctx.pos.offset,
          });
          return;
        }
        state.pendingPerMinute = parsed;
        return;
      }

      if (evt.kind === "EndElement") {
        const name = segmentName(pool, evt);

        if (name === "per-minute") state.capturePerMinuteText = false;

        // Choose precedence: metronome per-minute wins over sound tempo if both exist.
        if (name === "metronome" && state.inMetronome) {
          state.inMetronome = false;
          const partId = state.currentPartId;
          if (!partId) return;
          if (state.pendingPerMinute == null) return;
          const bpm = state.pendingPerMinute;

          const prev = state.lastTempoByPartId.get(partId);
          if (prev === bpm) return;
          state.lastTempoByPartId.set(partId, bpm);

          emit({
            kind: "Tempo",
            partId,
            bpm,
            tAbsDiv: getPartCursorAbsDiv(timing, partId),
            meta: {
              path: musicXmlPathToString(pool, ctx.path),
              offset: ctx.pos.offset,
            },
          });
          return;
        }

        if (name === "sound" && state.pendingSoundTempo != null) {
          const partId = state.currentPartId;
          if (!partId) {
            state.pendingSoundTempo = null;
            return;
          }

          // If we later see a metronome, it will overwrite via lastTempoByPartId.
          const bpm = state.pendingSoundTempo;
          state.pendingSoundTempo = null;

          const prev = state.lastTempoByPartId.get(partId);
          if (prev === bpm) return;
          state.lastTempoByPartId.set(partId, bpm);

          emit({
            kind: "Tempo",
            partId,
            bpm,
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
