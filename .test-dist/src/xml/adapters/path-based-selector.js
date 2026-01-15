"use strict";
// Path-based selector (src/xml/adapters/path-based-selector.ts)
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathSelector = void 0;
exports.compileSelector = compileSelector;
exports.createPathSelector = createPathSelector;
exports.compilePathString = compilePathString;
function makeNameToString(pool) {
    if (!pool)
        return (id) => `#${id}`;
    return (id) => pool.toString(id);
}
/** Pure: merge handler spec into existing set. */
function mergeHandlers(existing, spec) {
    const enter = existing?.enter ?? [];
    const exit = existing?.exit ?? [];
    const text = existing?.text ?? [];
    const captureSubtree = (existing?.captureSubtree ?? false) || (spec.textCaptureSubtree ?? false);
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
function upsertEdge(edges, key, child) {
    for (let i = 0; i < edges.length; i++) {
        const [k] = edges[i];
        if (k === key) {
            const next = edges.slice();
            next[i] = [key, child];
            return next;
        }
    }
    return [...edges, [key, child]];
}
/**
 * Pure: build a TrieNode with an optional Map fallback if fanout exceeds threshold.
 */
function finalizeNode(edges, handlers) {
    // threshold chosen to keep linear scan faster than Map for typical small fanout
    const THRESHOLD = 12;
    if (edges.length <= THRESHOLD) {
        return { edges, edgesMap: null, handlers };
    }
    const m = new Map();
    for (let i = 0; i < edges.length; i++)
        m.set(edges[i][0], edges[i][1]);
    return { edges, edgesMap: m, handlers };
}
function emptyNode() {
    return { edges: [], edgesMap: null, handlers: null };
}
/**
 * Pure: compile a set of PathSpecs into an immutable trie.
 * This is the only step that allocates arrays proportionally to rule count.
 */
function compileSelector(specs) {
    let root = emptyNode();
    // Persistent trie build: rebuild path nodes immutably.
    for (let s = 0; s < specs.length; s++) {
        const spec = specs[s];
        if (spec.path.length === 0)
            throw new Error("compileSelector: empty path is invalid");
        // Stack of nodes along the path for persistent rebuild.
        const pathNodes = new Array(spec.path.length + 1);
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
        const newLeaf = finalizeNode(leaf.edges, mergeHandlers(leaf.handlers, spec));
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
function findChild(node, name) {
    if (node.edgesMap) {
        return node.edgesMap.get(name) ?? null;
    }
    // small vector scan
    const edges = node.edges;
    for (let i = 0; i < edges.length; i++) {
        const [k, v] = edges[i];
        if (k === name)
            return v;
    }
    return null;
}
/**
 * Runtime selector: stateful for performance.
 * Consumes XmlEvent stream and dispatches handlers.
 */
class PathSelector {
    compiled;
    pool;
    nameToString;
    stack = [];
    /**
     * Active subtree-capture handler stack:
     * Each entry is the handler set that requested subtree text capture at a certain depth.
     * We keep this as a stack aligned to element nesting; push on enter, pop on exit in O(1).
     */
    captureStack = [];
    constructor(compiled, pool) {
        this.compiled = compiled;
        this.pool = pool;
        this.nameToString = makeNameToString(pool);
    }
    onEvent(evt) {
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
                const _never = evt;
                void _never;
            }
        }
    }
    ctx(depth, name, span) {
        return {
            depth,
            name,
            span,
            pool: this.pool,
            nameToString: this.nameToString,
        };
    }
    onStart(name, attrs, selfClosing, span) {
        const depth = this.stack.length + 1;
        const parentFrame = depth === 1 ? null : this.stack[depth - 2];
        const parentNode = parentFrame?.node ?? this.compiled.root;
        const node = parentNode ? findChild(parentNode, name) : null;
        const handlers = node?.handlers ?? null;
        const prevCaptureDepth = parentFrame?.activeCaptureDepth ?? 0;
        let activeCaptureDepth = prevCaptureDepth;
        // If this exact node wants subtree capture, push it onto captureStack and increment depth counter.
        if (handlers && handlers.captureSubtree) {
            this.captureStack.push(handlers);
            activeCaptureDepth = prevCaptureDepth + 1;
        }
        this.stack.push({ currentName: name, node, handlers, activeCaptureDepth });
        if (handlers && handlers.enter.length > 0) {
            const c = this.ctx(depth, name, span);
            const enter = handlers.enter;
            for (let i = 0; i < enter.length; i++)
                enter[i](c, attrs, selfClosing);
        }
        // Self-closing: emit exit immediately (mirrors stream parser behavior)
        if (selfClosing)
            this.onEnd(name, span);
    }
    onEnd(name, span) {
        const depth = this.stack.length;
        if (depth === 0) {
            throw new Error("PathSelector: EndElement with empty stack (upstream parser should prevent this)");
        }
        const frame = this.stack[depth - 1];
        const handlers = frame.handlers;
        if (handlers && handlers.exit.length > 0) {
            const c = this.ctx(depth, name, span);
            const exit = handlers.exit;
            for (let i = 0; i < exit.length; i++)
                exit[i](c);
        }
        // If this frame had subtree capture, it must be the latest captureStack entry (LIFO by nesting).
        if (handlers && handlers.captureSubtree) {
            const top = this.captureStack.pop();
            if (top !== handlers) {
                // This indicates misuse (events out of order) or a bug upstream. Fail fast.
                throw new Error("PathSelector: capture stack mismatch");
            }
        }
        this.stack.pop();
    }
    onText(text, span) {
        const depth = this.stack.length;
        if (depth === 0)
            return;
        const frame = this.stack[depth - 1];
        const c = this.ctx(depth, frame.currentName, span);
        // Exact path onText
        if (frame.handlers && frame.handlers.text.length > 0) {
            const t = frame.handlers.text;
            for (let i = 0; i < t.length; i++)
                t[i](c, text);
        }
        // Subtree capture: deliver to all active captures (ancestors that opted in).
        // This is O(active captures), not O(depth).
        if (frame.activeCaptureDepth === 0)
            return;
        const captures = this.captureStack;
        for (let i = 0; i < captures.length; i++) {
            const hs = captures[i];
            if (hs.text.length === 0)
                continue;
            const tt = hs.text;
            for (let j = 0; j < tt.length; j++)
                tt[j](c, text);
        }
    }
}
exports.PathSelector = PathSelector;
/**
 * Higher-order factory: compile + instantiate selector + return handler.
 * This isolates composition from runtime hot path.
 */
function createPathSelector(specs, pool) {
    const compiled = compileSelector(specs);
    const selector = new PathSelector(compiled, pool);
    return { selector, compiled, onEvent: (evt) => selector.onEvent(evt) };
}
/**
 * Convenience: compile a string path ("a/b/c") to NameId[] using a pool.
 * Kept here (adapter layer) to preserve strict decoupling of core selector from strings.
 */
function compilePathString(path, pool) {
    const segs = path.split("/").filter((p) => p.length > 0);
    if (segs.length === 0)
        throw new Error(`compilePathString: invalid path '${path}'`);
    const out = new Array(segs.length);
    for (let i = 0; i < segs.length; i++)
        out[i] = pool.intern(segs[i]);
    return out;
}
