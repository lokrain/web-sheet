// Path-based selector (src/xml/adapters/path-based-selector.ts)

import { XmlError } from "@/xml/core/error";
import type { XmlNamePool } from "@/xml/core/name-pool";
import type { XmlEvent } from "@/xml/core/stream-parser";
import type { NameId, Span } from "@/xml/core/types";

/**
 * Streaming, DOM-less, path-based selector with:
 * - Interned NameId segments (no string comparisons in hot path)
 * - Compiled trie dispatch (O(depth) enter, O(1) exit, O(activeCaptures) text)
 * - Zero dynamic allocations on steady-state (no per-event arrays/maps created)
 * - Strict separation: compile-time (pure) vs runtime (stateful)
 * - Higher-order assembly: you compile specs -> get an onEvent handler
 *
 * This is a deterministic structural selector, not XPath.
 */

export type AttrView = readonly Readonly<{ name: NameId; value: string }>[];

/** Minimal, allocation-free context computed per call site. */
export type SelectorContext = Readonly<{
  depth: number;
  name: NameId;
  span: Span;
  pool?: XmlNamePool;
  nameToString: (id: NameId) => string;
}>;

export type EnterHandler = (
  ctx: SelectorContext,
  attrs: AttrView,
  selfClosing: boolean,
) => void;
export type ExitHandler = (ctx: SelectorContext) => void;
export type TextHandler = (ctx: SelectorContext, text: string) => void;

export type PathSpec = Readonly<{
  /** Absolute path from root, as NameIds. */
  path: readonly NameId[];

  /** Called on StartElement at exact path match. */
  onEnter?: EnterHandler;

  /** Called on EndElement at exact path match. */
  onExit?: ExitHandler;

  /** Called on Text when current element is exact path match. */
  onText?: TextHandler;

  /**
   * If true, also deliver Text events to this spec while inside descendants of the matched path.
   * Text is delivered in-order with the current element context (ctx reflects current element).
   */
  textCaptureSubtree?: boolean;
}>;

/**
 * Optimized edge representation:
 * Hybrid small-vector + Map fallback for child transitions.
 * Avoids Map overhead on typical XML (small fanout at each node).
 */
type EdgeVec = ReadonlyArray<readonly [NameId, TrieNode]>;

type TrieNode = Readonly<{
  edges: EdgeVec;
  edgesMap: ReadonlyMap<NameId, TrieNode> | null;
  handlers: HandlerSet | null;
}>;

type HandlerSet = Readonly<{
  enter: ReadonlyArray<EnterHandler>;
  exit: ReadonlyArray<ExitHandler>;
  text: ReadonlyArray<TextHandler>;
  captureSubtree: boolean;
}>;

/**
 * Compiled selector artifact (pure, immutable).
 * Consumers should treat this as a value object.
 */
export type CompiledSelector = Readonly<{
  root: TrieNode;
}>;

function makeNameToString(pool?: XmlNamePool): (id: NameId) => string {
  if (!pool) return (id) => `#${id as unknown as number}`;
  return (id) => pool.toString(id);
}

/** Pure: merge handler spec into existing set. */
function mergeHandlers(
  existing: HandlerSet | null,
  spec: PathSpec,
): HandlerSet {
  const enter = existing?.enter ?? [];
  const exit = existing?.exit ?? [];
  const text = existing?.text ?? [];
  const captureSubtree =
    (existing?.captureSubtree ?? false) || (spec.textCaptureSubtree ?? false);

  return {
    enter: spec.onEnter
      ? enter.length === 0
        ? [spec.onEnter]
        : [...enter, spec.onEnter]
      : enter,
    exit: spec.onExit
      ? exit.length === 0
        ? [spec.onExit]
        : [...exit, spec.onExit]
      : exit,
    text: spec.onText
      ? text.length === 0
        ? [spec.onText]
        : [...text, spec.onText]
      : text,
    captureSubtree,
  };
}

/**
 * Pure: add/update one edge in a node's edge vector.
 * Uses persistent update (creates new arrays along the path), avoiding mutation in compiled output.
 */
function upsertEdge(edges: EdgeVec, key: NameId, child: TrieNode): EdgeVec {
  for (let i = 0; i < edges.length; i++) {
    const [k] = edges[i];
    if (k === key) {
      const next = edges.slice();
      next[i] = [key, child] as const;
      return next;
    }
  }
  return [...edges, [key, child] as const];
}

/**
 * Pure: build a TrieNode with an optional Map fallback if fanout exceeds threshold.
 */
function finalizeNode(edges: EdgeVec, handlers: HandlerSet | null): TrieNode {
  // threshold chosen to keep linear scan faster than Map for typical small fanout
  const THRESHOLD = 12;
  if (edges.length <= THRESHOLD) {
    return { edges, edgesMap: null, handlers };
  }
  const m = new Map<NameId, TrieNode>();
  for (let i = 0; i < edges.length; i++) m.set(edges[i][0], edges[i][1]);
  return { edges, edgesMap: m, handlers };
}

function emptyNode(): TrieNode {
  return { edges: [], edgesMap: null, handlers: null };
}

/**
 * Pure: compile a set of PathSpecs into an immutable trie.
 * This is the only step that allocates arrays proportionally to rule count.
 */
export function compileSelector(specs: readonly PathSpec[]): CompiledSelector {
  let root = emptyNode();

  // Persistent trie build: rebuild path nodes immutably.
  for (let s = 0; s < specs.length; s++) {
    const spec = specs[s];
    if (spec.path.length === 0)
      throw new XmlError(
        "XML_INVALID_SELECTOR",
        { offset: 0, line: 1, column: 1 },
        "compileSelector: empty path is invalid",
      );

    // Stack of nodes along the path for persistent rebuild.
    const pathNodes: TrieNode[] = new Array(spec.path.length + 1);
    pathNodes[0] = root;

    // Walk/create nodes
    let node = root;
    for (let i = 0; i < spec.path.length; i++) {
      const seg = spec.path[i];
      const child = findChild(node, seg) ?? emptyNode();
      pathNodes[i + 1] = child;
      node = child;
    }

    // Apply handlers at leaf
    const leaf = pathNodes[pathNodes.length - 1];
    const newLeaf = finalizeNode(
      leaf.edges,
      mergeHandlers(leaf.handlers, spec),
    );
    pathNodes[pathNodes.length - 1] = newLeaf;

    // Rebuild back up to root
    for (let i = spec.path.length - 1; i >= 0; i--) {
      const parent = pathNodes[i];
      const seg = spec.path[i];
      const updatedChild = pathNodes[i + 1];

      const updatedEdges = upsertEdge(parent.edges, seg, updatedChild);
      const updatedParent = finalizeNode(updatedEdges, parent.handlers);
      pathNodes[i] = updatedParent;
    }

    root = pathNodes[0];
  }

  return { root };
}

function findChild(node: TrieNode, name: NameId): TrieNode | null {
  if (node.edgesMap) {
    return node.edgesMap.get(name) ?? null;
  }
  // small vector scan
  const edges = node.edges;
  for (let i = 0; i < edges.length; i++) {
    const [k, v] = edges[i];
    if (k === name) return v;
  }
  return null;
}

/**
 * Runtime selector: stateful for performance.
 * Consumes XmlEvent stream and dispatches handlers.
 */
export class PathSelector {
  private readonly compiled: CompiledSelector;
  private readonly pool?: XmlNamePool;
  private readonly nameToString: (id: NameId) => string;

  private readonly stackNames: NameId[] = [];
  private readonly stackNodes: (TrieNode | null)[] = [];
  private readonly stackHandlers: (HandlerSet | null)[] = [];
  private readonly stackCaptureDepth: number[] = [];

  /**
   * Active subtree-capture handler stack:
   * Each entry is the handler set that requested subtree text capture at a certain depth.
   * We keep this as a stack aligned to element nesting; push on enter, pop on exit in O(1).
   */
  private readonly captureStack: HandlerSet[] = [];

  constructor(compiled: CompiledSelector, pool?: XmlNamePool) {
    this.compiled = compiled;
    this.pool = pool;
    this.nameToString = makeNameToString(pool);
  }

  public onEvent(evt: XmlEvent): void {
    switch (evt.kind) {
      case "StartElement":
        this.onStart(evt.name, evt.attrs, evt.selfClosing, evt.span);
        break;
      case "EndElement":
        this.onEnd(evt.name, evt.span);
        break;
      case "Text":
        this.onText(evt.value, evt.span);
        break;
      case "Comment":
      case "ProcessingInstruction":
        break;
      default: {
        const _never: never = evt;
        void _never;
      }
    }
  }

  private ctx(depth: number, name: NameId, span: Span): SelectorContext {
    return {
      depth,
      name,
      span,
      pool: this.pool,
      nameToString: this.nameToString,
    };
  }

  private onStart(
    name: NameId,
    attrs: AttrView,
    selfClosing: boolean,
    span: Span,
  ): void {
    const depth = this.stackNames.length + 1;

    const parentNode =
      depth === 1 ? this.compiled.root : this.stackNodes[depth - 2];

    const node = parentNode ? findChild(parentNode, name) : null;
    const handlers = node?.handlers ?? null;

    const prevCaptureDepth =
      depth === 1 ? 0 : this.stackCaptureDepth[depth - 2];
    let activeCaptureDepth = prevCaptureDepth;

    // If this exact node wants subtree capture, push it onto captureStack and increment depth counter.
    if (handlers?.captureSubtree) {
      this.captureStack.push(handlers);
      activeCaptureDepth = prevCaptureDepth + 1;
    }

    this.stackNames.push(name);
    this.stackNodes.push(node);
    this.stackHandlers.push(handlers);
    this.stackCaptureDepth.push(activeCaptureDepth);

    if (handlers && handlers.enter.length > 0) {
      const c = this.ctx(depth, name, span);
      const enter = handlers.enter;
      for (let i = 0; i < enter.length; i++) enter[i](c, attrs, selfClosing);
    }

    // Self-closing: emit exit immediately (mirrors stream parser behavior)
    if (selfClosing) this.onEnd(name, span);
  }

  private onEnd(name: NameId, span: Span): void {
    const depth = this.stackNames.length;
    if (depth === 0) {
      throw new XmlError(
        "XML_INTERNAL",
        { offset: 0, line: 1, column: 1 },
        "PathSelector: EndElement with empty stack (upstream parser should prevent this)",
      );
    }

    const handlers = this.stackHandlers[depth - 1];

    if (handlers && handlers.exit.length > 0) {
      const c = this.ctx(depth, name, span);
      const exit = handlers.exit;
      for (let i = 0; i < exit.length; i++) exit[i](c);
    }

    // If this frame had subtree capture, it must be the latest captureStack entry (LIFO by nesting).
    if (handlers?.captureSubtree) {
      const top = this.captureStack.pop();
      if (top !== handlers) {
        // This indicates misuse (events out of order) or a bug upstream. Fail fast.
        throw new XmlError(
          "XML_INTERNAL",
          { offset: 0, line: 1, column: 1 },
          "PathSelector: capture stack mismatch",
        );
      }
    }

    this.stackNames.pop();
    this.stackNodes.pop();
    this.stackHandlers.pop();
    this.stackCaptureDepth.pop();
  }

  private onText(text: string, span: Span): void {
    const depth = this.stackNames.length;
    if (depth === 0) return;

    const name = this.stackNames[depth - 1];
    const handlers = this.stackHandlers[depth - 1];
    const c = this.ctx(depth, name, span);

    // Exact path onText
    if (handlers && handlers.text.length > 0) {
      const t = handlers.text;
      for (let i = 0; i < t.length; i++) t[i](c, text);
    }

    // Subtree capture: deliver to all active captures (ancestors that opted in).
    // This is O(active captures), not O(depth).
    if (this.stackCaptureDepth[depth - 1] === 0) return;

    const captures = this.captureStack;
    for (let i = 0; i < captures.length; i++) {
      const hs = captures[i];
      if (hs.text.length === 0) continue;
      const tt = hs.text;
      for (let j = 0; j < tt.length; j++) tt[j](c, text);
    }
  }
}

/**
 * Higher-order factory: compile + instantiate selector + return handler.
 * This isolates composition from runtime hot path.
 */
export function createPathSelector(
  specs: readonly PathSpec[],
  pool?: XmlNamePool,
): {
  selector: PathSelector;
  onEvent: (evt: XmlEvent) => void;
  compiled: CompiledSelector;
} {
  const compiled = compileSelector(specs);
  const selector = new PathSelector(compiled, pool);
  return { selector, compiled, onEvent: (evt) => selector.onEvent(evt) };
}

/**
 * Convenience: compile a string path ("a/b/c") to NameId[] using a pool.
 * Kept here (adapter layer) to preserve strict decoupling of core selector from strings.
 */
export function compilePathString(
  path: string,
  pool: XmlNamePool,
): readonly NameId[] {
  const segs = path.split("/").filter((p) => p.length > 0);
  if (segs.length === 0)
    throw new XmlError(
      "XML_INVALID_SELECTOR",
      { offset: 0, line: 1, column: 1 },
      `compilePathString: invalid path '${path}'`,
    );
  const out: NameId[] = new Array(segs.length);
  for (let i = 0; i < segs.length; i++) out[i] = pool.intern(segs[i]);
  return out;
}
