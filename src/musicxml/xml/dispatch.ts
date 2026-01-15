import { createMusicXmlPathTracker } from "@/musicxml/xml/path";
import type {
  MusicXmlReducer,
  MusicXmlXmlContext,
} from "@/musicxml/xml/reducer";
import { createReducerHandle } from "@/musicxml/xml/reducer";
import type { XmlEvent } from "@/xml";

export type DispatchOptions = Readonly<{
  includeCurrentElementInStartEventPath: boolean;
}>;

const DEFAULT_OPTIONS: DispatchOptions = {
  includeCurrentElementInStartEventPath: true,
};

export function dispatchXmlEvents<TOut>(
  events: readonly XmlEvent[],
  reducers: readonly MusicXmlReducer<unknown, TOut>[],
  options: Partial<DispatchOptions> = DEFAULT_OPTIONS,
): TOut[] {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const tracker = createMusicXmlPathTracker();
  const handles = reducers.map((r) => createReducerHandle(r));
  const out: TOut[] = [];
  const emit = (evt: TOut) => out.push(evt);

  for (const evt of events) {
    if (
      evt.kind === "StartElement" &&
      resolved.includeCurrentElementInStartEventPath
    ) {
      tracker.write(evt);
      const ctx: MusicXmlXmlContext = {
        path: tracker.path(),
        pos: {
          offset: evt.span.start,
          line: evt.span.startLine,
          column: evt.span.startColumn,
        },
      };
      for (const h of handles) h.consume(evt, ctx, emit);
      continue;
    }

    const ctxBefore: MusicXmlXmlContext = {
      path: tracker.path(),
      pos: {
        offset: evt.span.start,
        line: evt.span.startLine,
        column: evt.span.startColumn,
      },
    };
    for (const h of handles) h.consume(evt, ctxBefore, emit);

    if (evt.kind === "StartElement" || evt.kind === "EndElement") {
      tracker.write(evt);
    }
  }

  for (const h of handles) h.flush(emit);
  return out;
}
