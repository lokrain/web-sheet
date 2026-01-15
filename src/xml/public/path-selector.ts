import type { XmlEvent } from "@/xml/core/stream-parser";
import type { NameId } from "@/xml/core/types";
import type { XmlNamePool } from "@/xml/public/name-pool";
import {
  compilePathString as compilePathStringImpl,
  compileSelector as compileSelectorImpl,
  createPathSelector as createPathSelectorImpl,
  type CompiledSelector,
  type PathSpec,
  type SelectorContext,
} from "@/xml/adapters/path-based-selector";

export type PathSelector = Readonly<{
  onEvent: (evt: XmlEvent) => void;
}>;

export function compilePathString(path: string, pool: XmlNamePool): readonly NameId[] {
  return compilePathStringImpl(path, pool as never);
}

export function compileSelector(specs: readonly PathSpec[]): CompiledSelector {
  return compileSelectorImpl(specs);
}

export function createPathSelector(
  specs: readonly PathSpec[],
  pool?: XmlNamePool,
): { selector: PathSelector; onEvent: (evt: XmlEvent) => void; compiled: CompiledSelector } {
  const { selector, onEvent, compiled } = createPathSelectorImpl(specs, pool as never);
  return { selector, onEvent, compiled };
}

export type { CompiledSelector, PathSpec, SelectorContext };