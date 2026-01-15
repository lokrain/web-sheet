import type { MusicXmlMapperEvent } from "@/musicxml/xml/events";
import { musicXmlPathToString } from "@/musicxml/xml/path";
import type { MusicXmlReducer } from "@/musicxml/xml/reducer";
import type { MusicXmlDiagnostic } from "@/musicxml/xml/stream-mapper";
import type { XmlEvent } from "@/xml";
import type { XmlNamePool } from "@/xml/public/name-pool";

export type MusicXmlMeasureStartEvent = Readonly<{
  kind: "MeasureStart";
  partId: string;
  measureNo: string | null;
  implicit: boolean;
  meta: Readonly<{
    path: string;
    offset: number;
  }>;
}>;

export type MusicXmlMeasureEndEvent = Readonly<{
  kind: "MeasureEnd";
  partId: string;
  measureNo: string | null;
  implicit: boolean;
  meta: Readonly<{
    path: string;
    offset: number;
  }>;
}>;

export type MusicXmlMeasureBoundaryEvent =
  | MusicXmlMeasureStartEvent
  | MusicXmlMeasureEndEvent;

type State = {
  currentPartId: string | null;
  currentMeasureNo: string | null;
  currentMeasureImplicit: boolean;
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

export function createMeasureBoundaryReducer(
  pool: XmlNamePool,
  diagnostics: MusicXmlDiagnostic[],
): MusicXmlReducer<State, MusicXmlMapperEvent> {
  return {
    init: () => ({
      currentPartId: null,
      currentMeasureNo: null,
      currentMeasureImplicit: false,
    }),

    consume(state, evt, ctx, emit) {
      if (evt.kind === "StartElement") {
        const name = segmentName(pool, evt);

        if (name === "part") {
          state.currentPartId = getAttr(pool, evt, "id");
          if (!state.currentPartId) {
            diagnostics.push({
              message: "part is missing required id attribute",
              path: musicXmlPathToString(pool, ctx.path),
            });
          }
          return;
        }

        if (name === "measure") {
          const partId = state.currentPartId;
          if (!partId) return;

          state.currentMeasureNo = getAttr(pool, evt, "number");
          state.currentMeasureImplicit =
            getAttr(pool, evt, "implicit") === "yes";

          emit({
            kind: "MeasureStart",
            partId,
            measureNo: state.currentMeasureNo,
            implicit: state.currentMeasureImplicit,
            meta: {
              path: musicXmlPathToString(pool, ctx.path),
              offset: ctx.pos.offset,
            },
          });

          return;
        }

        return;
      }

      if (evt.kind === "EndElement") {
        const name = segmentName(pool, evt);

        if (name === "measure") {
          const partId = state.currentPartId;
          if (!partId) return;

          emit({
            kind: "MeasureEnd",
            partId,
            measureNo: state.currentMeasureNo,
            implicit: state.currentMeasureImplicit,
            meta: {
              path: musicXmlPathToString(pool, ctx.path),
              offset: ctx.pos.offset,
            },
          });
          return;
        }

        if (name === "part") {
          state.currentPartId = null;
          state.currentMeasureNo = null;
          state.currentMeasureImplicit = false;
        }
      }
    },
  };
}
