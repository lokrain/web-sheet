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

export type MusicXmlKeySigEvent = Readonly<{
  kind: "KeySig";
  partId: string;
  fifths: number;
  mode: string | null;
  tAbsDiv: number;
  meta: Readonly<{
    path: string;
    offset: number;
  }>;
}>;

type State = {
  currentPartId: string | null;
  inKey: boolean;
  captureFifthsText: boolean;
  captureModeText: boolean;
  fifths: number | null;
  mode: string | null;
  lastSigByPartId: Map<
    string,
    Readonly<{ fifths: number; mode: string | null }>
  >;
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

export function createKeySignatureReducer(
  pool: XmlNamePool,
  diagnostics: MusicXmlDiagnostic[],
  timing: MusicXmlTimingState,
): MusicXmlReducer<State, MusicXmlMapperEvent> {
  return {
    init: () => ({
      currentPartId: null,
      inKey: false,
      captureFifthsText: false,
      captureModeText: false,
      fifths: null,
      mode: null,
      lastSigByPartId: new Map(),
    }),

    consume(state, evt, ctx, emit) {
      if (evt.kind === "StartElement") {
        const name = segmentName(pool, evt);

        if (name === "part") {
          state.currentPartId = getAttr(pool, evt, "id");
          return;
        }

        if (name === "key") {
          state.inKey = true;
          state.fifths = null;
          state.mode = null;
          return;
        }

        if (state.inKey && name === "fifths") state.captureFifthsText = true;
        if (state.inKey && name === "mode") state.captureModeText = true;
        return;
      }

      if (evt.kind === "Text") {
        if (!state.inKey) return;
        const text = String(evt.value).trim();
        if (!text) return;

        if (state.captureFifthsText && state.fifths == null) {
          const parsed = parseIntStrict(text);
          if (parsed == null) {
            diagnostics.push({
              message: `Invalid key fifths: ${text}`,
              path: musicXmlPathToString(pool, ctx.path),
            });
          } else {
            state.fifths = parsed;
          }
          return;
        }

        if (state.captureModeText && state.mode == null) {
          state.mode = text;
        }
        return;
      }

      if (evt.kind === "EndElement") {
        const name = segmentName(pool, evt);
        if (name === "fifths") state.captureFifthsText = false;
        if (name === "mode") state.captureModeText = false;

        if (name === "key" && state.inKey) {
          state.inKey = false;

          const partId = state.currentPartId;
          if (!partId) return;
          if (state.fifths == null) return;

          const next = { fifths: state.fifths, mode: state.mode };
          const prev = state.lastSigByPartId.get(partId);
          if (prev && prev.fifths === next.fifths && prev.mode === next.mode)
            return;
          state.lastSigByPartId.set(partId, next);

          emit({
            kind: "KeySig",
            partId,
            fifths: next.fifths,
            mode: next.mode,
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
