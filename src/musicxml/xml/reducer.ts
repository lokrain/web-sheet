import type { MusicXmlPath } from "@/musicxml/xml/path";
import type { XmlEvent } from "@/xml";

export type MusicXmlSourcePosition = Readonly<{
  offset: number;
  line?: number;
  column?: number;
}>;

export type MusicXmlXmlContext = Readonly<{
  path: MusicXmlPath;
  pos: MusicXmlSourcePosition;
}>;

export type MusicXmlEmit<TOut> = (out: TOut) => void;

export type MusicXmlReducer<TState, TOut> = Readonly<{
  init: () => TState;
  consume(
    state: TState,
    evt: XmlEvent,
    ctx: MusicXmlXmlContext,
    emit: MusicXmlEmit<TOut>,
  ): void;
  flush?(state: TState, emit: MusicXmlEmit<TOut>): void;
}>;

export type MusicXmlReducerHandle<TOut> = Readonly<{
  consume: (
    evt: XmlEvent,
    ctx: MusicXmlXmlContext,
    emit: MusicXmlEmit<TOut>,
  ) => void;
  flush: (emit: MusicXmlEmit<TOut>) => void;
}>;

export function createReducerHandle<TState, TOut>(
  reducer: MusicXmlReducer<TState, TOut>,
): MusicXmlReducerHandle<TOut> {
  const state = reducer.init();
  return {
    consume: (evt, ctx, emit) => reducer.consume(state, evt, ctx, emit),
    flush: (emit) => (reducer.flush ? reducer.flush(state, emit) : undefined),
  };
}
