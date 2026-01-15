import type { MusicXmlMapperEvent } from "@/musicxml/xml/events";
import { musicXmlPathToString } from "@/musicxml/xml/path";
import type { MusicXmlReducer } from "@/musicxml/xml/reducer";
import type { MusicXmlDiagnostic } from "@/musicxml/xml/stream-mapper";
import type { XmlEvent } from "@/xml";
import type { XmlNamePool } from "@/xml/public/name-pool";

export type MusicXmlPartDefEvent = Readonly<{
  kind: "PartDef";
  partId: string;
  name: string | null;
  instruments: readonly string[];
  meta: Readonly<{
    path: string;
    offset: number;
  }>;
}>;

export type MusicXmlPartListEvent = MusicXmlPartDefEvent;

type State = {
  inScorePart: boolean;
  currentPartId: string | null;
  currentPartName: string | null;
  currentInstruments: string[];
  capturePartNameText: boolean;
  captureInstrumentNameText: boolean;
};

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

function segmentName(pool: XmlNamePool, evt: XmlEvent): string | null {
  if (evt.kind === "StartElement" || evt.kind === "EndElement")
    return pool.toString(evt.name);
  return null;
}

export function createPartListReducer(
  pool: XmlNamePool,
  diagnostics: MusicXmlDiagnostic[],
): MusicXmlReducer<State, MusicXmlMapperEvent> {
  return {
    init: () => ({
      inScorePart: false,
      currentPartId: null,
      currentPartName: null,
      currentInstruments: [],
      capturePartNameText: false,
      captureInstrumentNameText: false,
    }),

    consume(state, evt, ctx, emit) {
      if (evt.kind === "StartElement") {
        const name = segmentName(pool, evt);

        if (name === "score-part") {
          state.inScorePart = true;
          state.currentPartId = getAttr(pool, evt, "id");
          state.currentPartName = null;
          state.currentInstruments = [];
          state.capturePartNameText = false;
          state.captureInstrumentNameText = false;

          if (!state.currentPartId) {
            diagnostics.push({
              message: "score-part is missing required id attribute",
              path: musicXmlPathToString(pool, ctx.path),
            });
          }
          return;
        }

        if (state.inScorePart && name === "part-name") {
          state.capturePartNameText = true;
          return;
        }

        if (state.inScorePart && name === "instrument-name") {
          state.captureInstrumentNameText = true;
          return;
        }

        return;
      }

      if (evt.kind === "Text") {
        const text = String(evt.value).trim();
        if (!text) return;

        if (state.capturePartNameText && state.currentPartName == null) {
          state.currentPartName = text;
          return;
        }

        if (state.captureInstrumentNameText) {
          state.currentInstruments.push(text);
        }

        return;
      }

      if (evt.kind === "EndElement") {
        const name = segmentName(pool, evt);

        if (state.inScorePart && name === "part-name") {
          state.capturePartNameText = false;
          return;
        }

        if (state.inScorePart && name === "instrument-name") {
          state.captureInstrumentNameText = false;
          return;
        }

        if (name === "score-part" && state.inScorePart) {
          const partId = state.currentPartId;
          if (partId) {
            emit({
              kind: "PartDef",
              partId,
              name: state.currentPartName,
              instruments: state.currentInstruments,
              meta: {
                path: musicXmlPathToString(pool, ctx.path),
                offset: ctx.pos.offset,
              },
            });
          }

          state.inScorePart = false;
          state.currentPartId = null;
          state.currentPartName = null;
          state.currentInstruments = [];
          state.capturePartNameText = false;
          state.captureInstrumentNameText = false;
        }
      }
    },
  };
}
