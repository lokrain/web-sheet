import { createBarlinesReducer } from "@/musicxml/xml/barlines";
import { createClefReducer } from "@/musicxml/xml/clef";
import { createDirectionsReducer } from "@/musicxml/xml/directions";
import {
  createDispatchState,
  dispatchXmlEvent,
  flushDispatch,
} from "@/musicxml/xml/dispatch-streaming";
import { createDivisionsReducer } from "@/musicxml/xml/divisions";
import type { MusicXmlDiagnostic } from "@/musicxml/xml/error";
import { MusicXmlErrorCode } from "@/musicxml/xml/error";
import type { MusicXmlMapperEvent } from "@/musicxml/xml/events";
import { createKeySignatureReducer } from "@/musicxml/xml/key-signature";
import { createMeasureBoundaryReducer } from "@/musicxml/xml/measure";
import { createNoteReducer } from "@/musicxml/xml/note";
import { createPartListReducer } from "@/musicxml/xml/part-list";
import { createStavesReducer } from "@/musicxml/xml/staves";
import type { MusicXmlMapperOptions } from "@/musicxml/xml/stream-mapper";
import { createTempoReducer } from "@/musicxml/xml/tempo";
import { createTimeSignatureReducer } from "@/musicxml/xml/time-signature";
import { createMusicXmlTimingState } from "@/musicxml/xml/timing-state";
import { createTransposeReducer } from "@/musicxml/xml/transpose";
import { createNamePool, parseEventsToSink } from "@/xml";
import type { XmlNamePool } from "@/xml/public/name-pool";

export type MusicXmlEventStream = Readonly<{
  events: AsyncIterable<MusicXmlMapperEvent>;
  diagnostics: Promise<MusicXmlDiagnostic[]>;
}>;

type QueueItem<T> = { type: "value"; value: T } | { type: "done" };

function createAsyncQueue<T>() {
  let done = false;
  const buffer: QueueItem<T>[] = [];
  let notify: (() => void) | null = null;

  const push = (value: T) => {
    if (done) return;
    buffer.push({ type: "value", value });
    notify?.();
  };

  const end = () => {
    if (done) return;
    done = true;
    buffer.push({ type: "done" });
    notify?.();
  };

  const iterable: AsyncIterable<T> = {
    async *[Symbol.asyncIterator]() {
      while (true) {
        while (buffer.length === 0) {
          await new Promise<void>((resolve) => {
            notify = resolve;
          });
          notify = null;
        }

        const item = buffer.shift();
        if (!item) continue;
        if (item.type === "done") return;
        yield item.value;
      }
    },
  };

  return { push, end, iterable };
}

function createReducers(
  pool: XmlNamePool,
  diagnostics: MusicXmlDiagnostic[],
): ReturnType<typeof createDispatchState<MusicXmlMapperEvent>> {
  const timing = createMusicXmlTimingState();
  return createDispatchState<MusicXmlMapperEvent>([
    createDivisionsReducer(pool, diagnostics),
    createPartListReducer(pool, diagnostics),
    createTempoReducer(pool, diagnostics, timing),
    createDirectionsReducer(pool, diagnostics, timing),
    createTimeSignatureReducer(pool, diagnostics, timing),
    createKeySignatureReducer(pool, diagnostics, timing),
    createStavesReducer(pool, diagnostics, timing),
    createClefReducer(pool, diagnostics, timing),
    createTransposeReducer(pool, diagnostics, timing),
    createBarlinesReducer(pool, diagnostics, timing),
    createMeasureBoundaryReducer(pool, diagnostics, timing),
    createNoteReducer(pool, diagnostics, timing),
  ]);
}

export async function mapMusicXmlScorePartwiseEventStream(
  chunks: AsyncIterable<string | Uint8Array> | unknown,
  options: MusicXmlMapperOptions = {},
): Promise<MusicXmlEventStream> {
  const diagnostics: MusicXmlDiagnostic[] = [];
  const pool = createNamePool();
  const dispatch = createReducers(pool, diagnostics);

  let rootSeen = false;
  const { push, end, iterable } = createAsyncQueue<MusicXmlMapperEvent>();

  const diagnosticsPromise = (async () => {
    try {
      await parseEventsToSink(
        chunks as never,
        (evt) => {
          // Root validation (best-effort in streaming mode).
          if (!rootSeen && evt.kind === "StartElement") {
            rootSeen = true;
            const rootName = pool.toString(evt.name);
            if (rootName !== "score-partwise") {
              diagnostics.push({
                code: MusicXmlErrorCode.UnexpectedRoot,
                message: `Expected score-partwise root, got: ${rootName}`,
                path: `/${rootName}`,
                offset: evt.span.start,
              });
            }
          }

          dispatchXmlEvent(dispatch, evt, push);
        },
        { pool },
      );

      flushDispatch(dispatch, push);
      return diagnostics;
    } finally {
      end();
    }
  })();

  // Keep strict option reserved for future behavior changes.
  void options;

  return { events: iterable, diagnostics: diagnosticsPromise };
}
