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

export type MusicXmlStavesEvent = Readonly<{
  kind: "Staves";
  partId: string;
  staves: number;
  tAbsDiv: number;
  meta: Readonly<{
    path: string;
    offset: number;
  }>;
}>;

type State = {
  currentPartId: string | null;
  captureStavesText: boolean;
  pendingStaves: number | null;
  lastStavesByPartId: Map<string, number>;
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

function parsePositiveInt(value: string): number | null {
  if (!/^[0-9]+$/.test(value)) return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function createStavesReducer(
  pool: XmlNamePool,
  diagnostics: MusicXmlDiagnostic[],
  timing: MusicXmlTimingState,
): MusicXmlReducer<State, MusicXmlMapperEvent> {
  return {
    init: () => ({
      currentPartId: null,
      captureStavesText: false,
      pendingStaves: null,
      lastStavesByPartId: new Map(),
    }),

    consume(state, evt, ctx, emit) {
      if (evt.kind === "StartElement") {
        const name = segmentName(pool, evt);
        if (name === "part") {
          state.currentPartId = getAttr(pool, evt, "id");
          return;
        }

        if (name === "staves") {
          state.captureStavesText = true;
          state.pendingStaves = null;
        }
        return;
      }

      if (evt.kind === "Text") {
        if (!state.captureStavesText || state.pendingStaves != null) return;
        const partId = state.currentPartId;
        if (!partId) return;
        const text = String(evt.value).trim();
        if (!text) return;
        const parsed = parsePositiveInt(text);
        if (parsed == null) {
          diagnostics.push({
            code: MusicXmlErrorCode.InvalidStavesCount,
            message: `Invalid staves count: ${text}`,
            path: musicXmlPathToString(pool, ctx.path),
            offset: ctx.pos.offset,
          });
          return;
        }
        state.pendingStaves = parsed;
        return;
      }

      if (evt.kind === "EndElement") {
        const name = segmentName(pool, evt);
        if (name === "staves" && state.captureStavesText) {
          state.captureStavesText = false;
          const partId = state.currentPartId;
          const staves = state.pendingStaves;
          state.pendingStaves = null;
          if (!partId || staves == null) return;

          const prev = state.lastStavesByPartId.get(partId);
          if (prev === staves) return;
          state.lastStavesByPartId.set(partId, staves);

          emit({
            kind: "Staves",
            partId,
            staves,
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
