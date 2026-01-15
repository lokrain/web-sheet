import { createMusicXmlPathTracker } from "@/musicxml/xml/path";
import type {
  MusicXmlReducer,
  MusicXmlXmlContext,
} from "@/musicxml/xml/reducer";
import type { XmlEvent } from "@/xml";

type ReducerHandle<Event> = {
  consume: (
    evt: XmlEvent,
    ctx: MusicXmlXmlContext,
    emit: (mapped: Event) => void,
  ) => void;
  flush: (emit: (mapped: Event) => void) => void;
};

function createReducerHandle<State, Event>(
  reducer: MusicXmlReducer<State, Event>,
): ReducerHandle<Event> {
  const state = reducer.init();
  return {
    consume(evt, ctx, emit) {
      reducer.consume(state, evt, ctx, emit);
    },
    flush(emit) {
      reducer.flush?.(state, emit);
    },
  };
}

export type DispatchState<Event> = {
  tracker: ReturnType<typeof createMusicXmlPathTracker>;
  handles: ReducerHandle<Event>[];
};

export function createDispatchState<Event>(
  reducers: Array<MusicXmlReducer<unknown, Event>>,
): DispatchState<Event> {
  return {
    tracker: createMusicXmlPathTracker(),
    handles: reducers.map((r) => createReducerHandle(r as never)),
  };
}

export function dispatchXmlEvent<Event>(
  state: DispatchState<Event>,
  evt: XmlEvent,
  emit: (mapped: Event) => void,
): void {
  const includeCurrentElementInStartEventPath = true;

  if (evt.kind === "StartElement" && includeCurrentElementInStartEventPath) {
    state.tracker.write(evt);
    const ctx: MusicXmlXmlContext = {
      path: state.tracker.path(),
      pos: {
        offset: evt.span.start,
        line: evt.span.startLine,
        column: evt.span.startColumn,
      },
    };
    for (const h of state.handles) h.consume(evt, ctx, emit);
    return;
  }

  const ctxBefore: MusicXmlXmlContext = {
    path: state.tracker.path(),
    pos: {
      offset: evt.span.start,
      line: evt.span.startLine,
      column: evt.span.startColumn,
    },
  };
  for (const h of state.handles) h.consume(evt, ctxBefore, emit);

  if (evt.kind === "StartElement" || evt.kind === "EndElement") {
    state.tracker.write(evt);
  }
}

export function flushDispatch<Event>(
  state: DispatchState<Event>,
  emit: (mapped: Event) => void,
): void {
  for (const h of state.handles) h.flush(emit);
}
