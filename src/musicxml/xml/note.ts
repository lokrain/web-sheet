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

  // Part-level cursor (absolute divisions).
  cursorAbsDivByPartId: Map<string, number>;

  // Per-voice cursors for future validation.
  cursorByPartVoice: Map<string, Map<string, number>>;

  // backup/forward parsing
  inBackup: boolean;
  inForward: boolean;
  captureBackupDurationText: boolean;
  captureForwardDurationText: boolean;
  pendingBackupDurationDiv: number | null;
  pendingForwardDurationDiv: number | null;

  // note parsing
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
  captureNoteDurationText: boolean;
  captureStepText: boolean;
  captureAlterText: boolean;
  captureOctaveText: boolean;
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

function getPartCursor(state: State, partId: string): number {
  return state.cursorAbsDivByPartId.get(partId) ?? 0;
}

function setPartCursor(state: State, partId: string, value: number): void {
  state.cursorAbsDivByPartId.set(partId, value);
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
      cursorAbsDivByPartId: new Map(),
      cursorByPartVoice: new Map(),
      inBackup: false,
      inForward: false,
      captureBackupDurationText: false,
      captureForwardDurationText: false,
      pendingBackupDurationDiv: null,
      pendingForwardDurationDiv: null,
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
      captureNoteDurationText: false,
      captureStepText: false,
      captureAlterText: false,
      captureOctaveText: false,
    }),

    consume(state, evt, ctx, emit) {
      if (evt.kind === "StartElement") {
        const name = segmentName(pool, evt);

        if (name === "part") {
          state.currentPartId = getAttr(pool, evt, "id");
          return;
        }

        if (name === "backup") {
          state.inBackup = true;
          state.pendingBackupDurationDiv = null;
          return;
        }

        if (name === "forward") {
          state.inForward = true;
          state.pendingForwardDurationDiv = null;
          return;
        }

        if (name === "note") {
          state.inNote = true;
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
          state.captureNoteDurationText = false;
          state.captureStepText = false;
          state.captureAlterText = false;
          state.captureOctaveText = false;
          return;
        }

        if (state.inNote) {
          if (name === "rest") state.noteIsRest = true;
          if (name === "chord") state.noteChord = true;
          if (name === "grace") state.noteGrace = true;
          if (name === "cue") state.noteCue = true;

          if (name === "voice") state.captureVoiceText = true;
          if (name === "duration") state.captureNoteDurationText = true;
          if (name === "step") state.captureStepText = true;
          if (name === "alter") state.captureAlterText = true;
          if (name === "octave") state.captureOctaveText = true;

          if (name === "tie") {
            const type = getAttr(pool, evt, "type");
            if (type === "start") state.tieStart = true;
            if (type === "stop") state.tieStop = true;
          }
        }

        if (name === "duration") {
          if (state.inBackup) state.captureBackupDurationText = true;
          if (state.inForward) state.captureForwardDurationText = true;
        }

        return;
      }

      if (evt.kind === "Text") {
        const text = String(evt.value).trim();
        if (!text) return;

        if (
          state.captureBackupDurationText &&
          state.pendingBackupDurationDiv == null
        ) {
          const n = parseIntStrict(text);
          if (n == null || n < 0) {
            diagnostics.push({
              message: `Invalid backup duration: ${text}`,
              path: musicXmlPathToString(pool, ctx.path),
            });
          } else {
            state.pendingBackupDurationDiv = n;
          }
          return;
        }

        if (
          state.captureForwardDurationText &&
          state.pendingForwardDurationDiv == null
        ) {
          const n = parseIntStrict(text);
          if (n == null || n < 0) {
            diagnostics.push({
              message: `Invalid forward duration: ${text}`,
              path: musicXmlPathToString(pool, ctx.path),
            });
          } else {
            state.pendingForwardDurationDiv = n;
          }
          return;
        }

        if (!state.inNote) return;

        if (state.captureVoiceText && state.noteVoice == null) {
          state.noteVoice = text;
          return;
        }

        if (state.captureNoteDurationText && state.noteDurationDiv == null) {
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
        if (name === "duration") {
          state.captureNoteDurationText = false;
          state.captureBackupDurationText = false;
          state.captureForwardDurationText = false;
        }
        if (name === "step") state.captureStepText = false;
        if (name === "alter") state.captureAlterText = false;
        if (name === "octave") state.captureOctaveText = false;

        if (name === "backup" && state.inBackup) {
          const partId = state.currentPartId;
          const dur = state.pendingBackupDurationDiv;
          state.inBackup = false;
          state.pendingBackupDurationDiv = null;
          if (!partId || dur == null) return;

          const prev = getPartCursor(state, partId);
          const next = prev - dur;
          if (next < 0) {
            diagnostics.push({
              message: "Cursor underflow on backup",
              path: musicXmlPathToString(pool, ctx.path),
            });
            setPartCursor(state, partId, 0);
            return;
          }
          setPartCursor(state, partId, next);
          return;
        }

        if (name === "forward" && state.inForward) {
          const partId = state.currentPartId;
          const dur = state.pendingForwardDurationDiv;
          state.inForward = false;
          state.pendingForwardDurationDiv = null;
          if (!partId || dur == null) return;

          const prev = getPartCursor(state, partId);
          setPartCursor(state, partId, prev + dur);
          return;
        }

        if (name === "note" && state.inNote) {
          const partId = state.currentPartId;
          const voice = state.noteVoice ?? "1";
          const durDiv = state.noteDurationDiv;

          if (!partId || durDiv == null) {
            if (durDiv == null) {
              diagnostics.push({
                message: "Note is missing duration",
                path: musicXmlPathToString(pool, ctx.path),
              });
            }
            state.inNote = false;
            return;
          }

          const tOnAbsDiv = getPartCursor(state, partId);

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
            const next = tOnAbsDiv + durDiv;
            setPartCursor(state, partId, next);
            setVoiceCursor(state, partId, voice, next);
          }

          state.inNote = false;
          return;
        }

        if (name === "part") {
          state.currentPartId = null;
          state.inBackup = false;
          state.inForward = false;
        }
      }
    },
  };
}
