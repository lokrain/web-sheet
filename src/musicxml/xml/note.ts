import type { MusicXmlMapperEvent } from "@/musicxml/xml/events";
import { musicXmlPathToString } from "@/musicxml/xml/path";
import type { MusicXmlReducer } from "@/musicxml/xml/reducer";
import type { MusicXmlDiagnostic } from "@/musicxml/xml/stream-mapper";
import type { XmlEvent } from "@/xml";
import type { XmlNamePool } from "@/xml/public/name-pool";

export type MusicXmlPitch = Readonly<{
  step: string;
  alter: number;
  octave: number;
}>;

export type MusicXmlTieMarkers = Readonly<{
  start: boolean;
  stop: boolean;
}>;

export type MusicXmlNoteEvent = Readonly<{
  kind: "Note";
  partId: string;
  voice: string;
  tOnAbsDiv: number;
  durDiv: number;
  isRest: boolean;
  pitch: MusicXmlPitch | null;
  chord: boolean;
  grace: boolean;
  cue: boolean;
  tie: MusicXmlTieMarkers;
  meta: Readonly<{
    path: string;
    offset: number;
  }>;
}>;

type State = {
  currentPartId: string | null;
  noteDepth: number;
  inNote: boolean;
  noteIsRest: boolean;
  noteChord: boolean;
  noteGrace: boolean;
  noteCue: boolean;
  noteVoice: string | null;
  noteDurationDiv: number | null;
  pitchStep: string | null;
  pitchAlter: number;
  pitchOctave: number | null;
  tieStart: boolean;
  tieStop: boolean;
  captureVoiceText: boolean;
  captureDurationText: boolean;
  captureStepText: boolean;
  captureAlterText: boolean;
  captureOctaveText: boolean;
  cursorByPartVoice: Map<string, Map<string, number>>;
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

function parseIntStrict(value: string): number | null {
  if (!/^-?[0-9]+$/.test(value)) return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

function getVoiceCursor(state: State, partId: string, voice: string): number {
  let byVoice = state.cursorByPartVoice.get(partId);
  if (!byVoice) {
    byVoice = new Map();
    state.cursorByPartVoice.set(partId, byVoice);
  }
  return byVoice.get(voice) ?? 0;
}

function setVoiceCursor(
  state: State,
  partId: string,
  voice: string,
  value: number,
): void {
  let byVoice = state.cursorByPartVoice.get(partId);
  if (!byVoice) {
    byVoice = new Map();
    state.cursorByPartVoice.set(partId, byVoice);
  }
  byVoice.set(voice, value);
}

export function createNoteReducer(
  pool: XmlNamePool,
  diagnostics: MusicXmlDiagnostic[],
): MusicXmlReducer<State, MusicXmlMapperEvent> {
  return {
    init: () => ({
      currentPartId: null,
      noteDepth: 0,
      inNote: false,
      noteIsRest: false,
      noteChord: false,
      noteGrace: false,
      noteCue: false,
      noteVoice: null,
      noteDurationDiv: null,
      pitchStep: null,
      pitchAlter: 0,
      pitchOctave: null,
      tieStart: false,
      tieStop: false,
      captureVoiceText: false,
      captureDurationText: false,
      captureStepText: false,
      captureAlterText: false,
      captureOctaveText: false,
      cursorByPartVoice: new Map(),
    }),

    consume(state, evt, ctx, emit) {
      if (evt.kind === "StartElement") {
        const name = segmentName(pool, evt);

        if (name === "part") {
          state.currentPartId = getAttr(pool, evt, "id");
          return;
        }

        if (name === "note") {
          state.inNote = true;
          state.noteDepth = 1;
          state.noteIsRest = false;
          state.noteChord = false;
          state.noteGrace = false;
          state.noteCue = false;
          state.noteVoice = null;
          state.noteDurationDiv = null;
          state.pitchStep = null;
          state.pitchAlter = 0;
          state.pitchOctave = null;
          state.tieStart = false;
          state.tieStop = false;
          state.captureVoiceText = false;
          state.captureDurationText = false;
          state.captureStepText = false;
          state.captureAlterText = false;
          state.captureOctaveText = false;
          return;
        }

        if (!state.inNote) return;

        state.noteDepth += 1;

        if (name === "rest") state.noteIsRest = true;
        if (name === "chord") state.noteChord = true;
        if (name === "grace") state.noteGrace = true;
        if (name === "cue") state.noteCue = true;

        if (name === "voice") state.captureVoiceText = true;
        if (name === "duration") state.captureDurationText = true;
        if (name === "step") state.captureStepText = true;
        if (name === "alter") state.captureAlterText = true;
        if (name === "octave") state.captureOctaveText = true;

        if (name === "tie") {
          const type = getAttr(pool, evt, "type");
          if (type === "start") state.tieStart = true;
          if (type === "stop") state.tieStop = true;
        }

        return;
      }

      if (evt.kind === "Text") {
        const text = String(evt.value).trim();
        if (!text) return;

        if (state.captureVoiceText && state.noteVoice == null) {
          state.noteVoice = text;
          return;
        }

        if (state.captureDurationText && state.noteDurationDiv == null) {
          const n = parseIntStrict(text);
          if (n == null || n < 0) {
            diagnostics.push({
              message: `Invalid note duration: ${text}`,
              path: musicXmlPathToString(pool, ctx.path),
            });
          } else {
            state.noteDurationDiv = n;
          }
          return;
        }

        if (state.captureStepText && state.pitchStep == null) {
          state.pitchStep = text;
          return;
        }

        if (state.captureAlterText) {
          const n = parseIntStrict(text);
          if (n == null) {
            diagnostics.push({
              message: `Invalid pitch alter: ${text}`,
              path: musicXmlPathToString(pool, ctx.path),
            });
          } else {
            state.pitchAlter = n;
          }
          return;
        }

        if (state.captureOctaveText && state.pitchOctave == null) {
          const n = parseIntStrict(text);
          if (n == null) {
            diagnostics.push({
              message: `Invalid pitch octave: ${text}`,
              path: musicXmlPathToString(pool, ctx.path),
            });
          } else {
            state.pitchOctave = n;
          }
        }

        return;
      }

      if (evt.kind === "EndElement") {
        const name = segmentName(pool, evt);

        if (name === "voice") state.captureVoiceText = false;
        if (name === "duration") state.captureDurationText = false;
        if (name === "step") state.captureStepText = false;
        if (name === "alter") state.captureAlterText = false;
        if (name === "octave") state.captureOctaveText = false;

        if (!state.inNote) {
          if (name === "part") state.currentPartId = null;
          return;
        }

        state.noteDepth -= 1;

        if (name === "note") {
          const partId = state.currentPartId;
          if (!partId) {
            state.inNote = false;
            state.noteDepth = 0;
            return;
          }

          const voice = state.noteVoice ?? "1";
          const durDiv = state.noteDurationDiv;

          if (durDiv == null) {
            diagnostics.push({
              message: "Note is missing duration",
              path: musicXmlPathToString(pool, ctx.path),
            });
            state.inNote = false;
            state.noteDepth = 0;
            return;
          }

          const tOnAbsDiv = getVoiceCursor(state, partId, voice);

          const pitch: MusicXmlPitch | null = state.noteIsRest
            ? null
            : state.pitchStep && state.pitchOctave != null
              ? {
                  step: state.pitchStep,
                  alter: state.pitchAlter,
                  octave: state.pitchOctave,
                }
              : null;

          emit({
            kind: "Note",
            partId,
            voice,
            tOnAbsDiv,
            durDiv,
            isRest: state.noteIsRest,
            pitch,
            chord: state.noteChord,
            grace: state.noteGrace,
            cue: state.noteCue,
            tie: { start: state.tieStart, stop: state.tieStop },
            meta: {
              path: musicXmlPathToString(pool, ctx.path),
              offset: ctx.pos.offset,
            },
          });

          if (!state.noteChord) {
            setVoiceCursor(state, partId, voice, tOnAbsDiv + durDiv);
          }

          state.inNote = false;
          state.noteDepth = 0;
        }
      }
    },
  };
}
