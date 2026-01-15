import {
  type MusicXmlDiagnostic,
  MusicXmlErrorCode,
} from "@/musicxml/xml/error";
import type { MusicXmlMapperEvent } from "@/musicxml/xml/events";
import { musicXmlPathToString } from "@/musicxml/xml/path";
import type { MusicXmlReducer } from "@/musicxml/xml/reducer";
import type { XmlEvent } from "@/xml";
import type { XmlNamePool } from "@/xml/public/name-pool";

export type MusicXmlDivisionsEvent = Readonly<{
  kind: "Divisions";
  partId: string;
  divisions: number;
  meta: Readonly<{
    path: string;
    offset: number;
  }>;
}>;

type State = {
  currentPartId: string | null;
  captureDivisionsText: boolean;
  divisionsByPartId: Map<string, number>;
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
  if (!Number.isFinite(n)) return null;
  return n;
}

export function createDivisionsReducer(
  pool: XmlNamePool,
  diagnostics: MusicXmlDiagnostic[],
): MusicXmlReducer<State, MusicXmlMapperEvent> {
  return {
    init: () => ({
      currentPartId: null,
      captureDivisionsText: false,
      divisionsByPartId: new Map(),
    }),

    consume(state, evt, ctx, emit) {
      if (evt.kind === "StartElement") {
        const name = segmentName(pool, evt);

        if (name === "part") {
          state.currentPartId = getAttr(pool, evt, "id");
          return;
        }

        if (name === "divisions") {
          state.captureDivisionsText = true;
        }

        return;
      }

      if (evt.kind === "Text") {
        if (!state.captureDivisionsText) return;

        const partId = state.currentPartId;
        if (!partId) return;

        const raw = String(evt.value).trim();
        if (!raw) return;

        const parsed = parsePositiveInt(raw);
        if (parsed == null) {
          diagnostics.push({
            code: MusicXmlErrorCode.InvalidDivisions,
            message: `Invalid divisions value: ${raw}`,
            path: musicXmlPathToString(pool, ctx.path),
            offset: ctx.pos.offset,
          });
          return;
        }

        const prev = state.divisionsByPartId.get(partId);
        if (prev === parsed) return;

        state.divisionsByPartId.set(partId, parsed);
        emit({
          kind: "Divisions",
          partId,
          divisions: parsed,
          meta: {
            path: musicXmlPathToString(pool, ctx.path),
            offset: ctx.pos.offset,
          },
        });
        return;
      }

      if (evt.kind === "EndElement") {
        const name = segmentName(pool, evt);
        if (name === "divisions") {
          state.captureDivisionsText = false;
          return;
        }

        if (name === "part") {
          state.currentPartId = null;
          state.captureDivisionsText = false;
        }
      }
    },
  };
}
