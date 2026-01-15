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

export type MusicXmlDynamicsEvent = Readonly<{
  kind: "Dynamics";
  partId: string;
  glyphs: string[];
  tAbsDiv: number;
  meta: Readonly<{
    path: string;
    offset: number;
  }>;
}>;

export type MusicXmlWordsEvent = Readonly<{
  kind: "Words";
  partId: string;
  text: string;
  tAbsDiv: number;
  meta: Readonly<{
    path: string;
    offset: number;
  }>;
}>;

type State = {
  currentPartId: string | null;
  inDynamics: boolean;
  dynamicsGlyphs: Set<string>;
  captureWordsText: boolean;
  wordsText: string;
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

export function createDirectionsReducer(
  pool: XmlNamePool,
  diagnostics: MusicXmlDiagnostic[],
  timing: MusicXmlTimingState,
): MusicXmlReducer<State, MusicXmlMapperEvent> {
  void diagnostics;

  return {
    init: () => ({
      currentPartId: null,
      inDynamics: false,
      dynamicsGlyphs: new Set(),
      captureWordsText: false,
      wordsText: "",
    }),

    consume(state, evt, ctx, emit) {
      if (evt.kind === "StartElement") {
        const name = segmentName(pool, evt);

        if (name === "part") {
          state.currentPartId = getAttr(pool, evt, "id");
          return;
        }

        if (name === "dynamics") {
          state.inDynamics = true;
          state.dynamicsGlyphs.clear();
          return;
        }

        // Dynamics glyphs are elements inside <dynamics>, e.g. <p/>, <ff/>, <sfz/>.
        if (state.inDynamics && name && name !== "dynamics") {
          state.dynamicsGlyphs.add(name);
          return;
        }

        if (name === "words") {
          state.captureWordsText = true;
          state.wordsText = "";
          return;
        }

        return;
      }

      if (evt.kind === "Text") {
        if (!state.captureWordsText) return;
        const text = String(evt.value);
        if (!text) return;
        // Preserve internal spacing but avoid leading/trailing noise.
        state.wordsText = `${state.wordsText}${text}`;
        return;
      }

      if (evt.kind === "EndElement") {
        const name = segmentName(pool, evt);

        if (name === "dynamics" && state.inDynamics) {
          state.inDynamics = false;
          const partId = state.currentPartId;
          if (!partId) return;

          const glyphs = Array.from(state.dynamicsGlyphs);
          if (glyphs.length === 0) return;

          emit({
            kind: "Dynamics",
            partId,
            glyphs,
            tAbsDiv: getPartCursorAbsDiv(timing, partId),
            meta: {
              path: musicXmlPathToString(pool, ctx.path),
              offset: ctx.pos.offset,
            },
          });
          return;
        }

        if (name === "words" && state.captureWordsText) {
          state.captureWordsText = false;
          const partId = state.currentPartId;
          if (!partId) return;

          const text = state.wordsText.trim();
          if (!text) return;

          emit({
            kind: "Words",
            partId,
            text,
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
