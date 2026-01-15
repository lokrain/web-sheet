import type { MusicXmlDiagnostic } from "@/musicxml/xml/error";
import type { MusicXmlMapperEvent } from "@/musicxml/xml/events";
import { musicXmlPathToString } from "@/musicxml/xml/path";
import type { MusicXmlReducer } from "@/musicxml/xml/reducer";
import {
  getPartCursorAbsDiv,
  type MusicXmlTimingState,
} from "@/musicxml/xml/timing-state";
import type { XmlEvent } from "@/xml";
import type { XmlNamePool } from "@/xml/public/name-pool";

export type MusicXmlRepeatEvent = Readonly<{
  kind: "Repeat";
  partId: string;
  measureNo: string | null;
  direction: "forward" | "backward";
  tAbsDiv: number;
  meta: Readonly<{
    path: string;
    offset: number;
  }>;
}>;

export type MusicXmlEndingEvent = Readonly<{
  kind: "Ending";
  partId: string;
  measureNo: string | null;
  type: "start" | "stop" | "discontinue";
  numbers: string[];
  tAbsDiv: number;
  meta: Readonly<{
    path: string;
    offset: number;
  }>;
}>;

type State = {
  currentPartId: string | null;
  currentMeasureNo: string | null;
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

function parseEndingNumbers(raw: string | null): string[] {
  if (!raw) return [];
  // MusicXML allows "1", "1,2" etc. Keep it simple & lossless.
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function createBarlinesReducer(
  pool: XmlNamePool,
  diagnostics: MusicXmlDiagnostic[],
  timing: MusicXmlTimingState,
): MusicXmlReducer<State, MusicXmlMapperEvent> {
  void diagnostics;

  return {
    init: () => ({
      currentPartId: null,
      currentMeasureNo: null,
    }),

    consume(state, evt, ctx, emit) {
      if (evt.kind === "StartElement") {
        const name = segmentName(pool, evt);

        if (name === "part") {
          state.currentPartId = getAttr(pool, evt, "id");
          return;
        }

        if (name === "measure") {
          state.currentMeasureNo = getAttr(pool, evt, "number");
          return;
        }

        if (name === "repeat") {
          const partId = state.currentPartId;
          if (!partId) return;

          const direction = getAttr(pool, evt, "direction");
          if (direction !== "forward" && direction !== "backward") return;

          emit({
            kind: "Repeat",
            partId,
            measureNo: state.currentMeasureNo,
            direction,
            tAbsDiv: getPartCursorAbsDiv(timing, partId),
            meta: {
              path: musicXmlPathToString(pool, ctx.path),
              offset: ctx.pos.offset,
            },
          });
          return;
        }

        if (name === "ending") {
          const partId = state.currentPartId;
          if (!partId) return;

          const type = getAttr(pool, evt, "type");
          if (type !== "start" && type !== "stop" && type !== "discontinue")
            return;

          const numbers = parseEndingNumbers(getAttr(pool, evt, "number"));

          emit({
            kind: "Ending",
            partId,
            measureNo: state.currentMeasureNo,
            type,
            numbers,
            tAbsDiv: getPartCursorAbsDiv(timing, partId),
            meta: {
              path: musicXmlPathToString(pool, ctx.path),
              offset: ctx.pos.offset,
            },
          });
          return;
        }
      }

      if (evt.kind === "EndElement") {
        const name = segmentName(pool, evt);
        if (name === "measure") state.currentMeasureNo = null;
        if (name === "part") state.currentPartId = null;
      }
    },
  };
}
