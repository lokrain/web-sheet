import { parseEventsCollect } from "@/xml";
import type { XmlNamePool } from "@/xml/public/name-pool";

export type MusicXmlDiagnostic = {
  message: string;
  path?: string;
};

export type MusicXmlMapperOptions = {
  strict?: boolean;
};

export type MusicXmlDivisionsEvent = unknown;
export type MusicXmlTempoEvent = unknown;
export type MusicXmlTie = unknown;

export type MusicXmlPitch = unknown;
export type MusicXmlNote = unknown;
export type MusicXmlMeasure = unknown;
export type MusicXmlPart = unknown;

export type MusicXmlScorePartwise = unknown;

export type MusicXmlExtract = {
  score: MusicXmlScorePartwise;
  diagnostics: MusicXmlDiagnostic[];
};

export type MusicXmlScoreRoot =
  | Readonly<{ kind: "score-partwise" }>
  | Readonly<{ kind: "score-timewise" }>
  | Readonly<{ kind: "unknown"; name: string | null }>;

function toXmlString(input: unknown): string {
  if (typeof input === "string") return input;
  if (input instanceof Uint8Array) return new TextDecoder().decode(input);
  throw new Error("MusicXML input must be a string or Uint8Array");
}

function firstRootStart(
  pool: XmlNamePool,
  events: ReturnType<typeof parseEventsCollect>["events"],
) {
  for (const evt of events) {
    if (evt.kind !== "StartElement") continue;
    return { name: pool.toString(evt.name), evt };
  }
  return { name: null, evt: null } as const;
}

export function detectMusicXmlRoot(input: unknown): {
  root: MusicXmlScoreRoot;
  diagnostics: MusicXmlDiagnostic[];
} {
  const xml = toXmlString(input);
  const { pool, events } = parseEventsCollect(xml);
  const { name } = firstRootStart(pool, events);
  if (name === "score-partwise")
    return { root: { kind: "score-partwise" }, diagnostics: [] };
  if (name === "score-timewise")
    return { root: { kind: "score-timewise" }, diagnostics: [] };
  return {
    root: { kind: "unknown", name },
    diagnostics: [
      {
        message: name
          ? `Unexpected root element: ${name}`
          : "Missing root element",
      },
    ],
  };
}

export function mapMusicXmlScorePartwise(
  xmlInput: unknown,
  options?: MusicXmlMapperOptions,
): MusicXmlExtract {
  const strict = options?.strict ?? false;
  const detected = detectMusicXmlRoot(xmlInput);
  if (detected.root.kind !== "score-partwise") {
    if (strict) {
      throw new Error(
        detected.root.kind === "unknown"
          ? `MusicXML root is not score-partwise (found: ${detected.root.name ?? "<none>"})`
          : `MusicXML root is not score-partwise (found: ${detected.root.kind})`,
      );
    }
    const diags = [...detected.diagnostics];
    if (detected.root.kind === "score-timewise") {
      diags.push({
        message: "score-timewise is not supported by mapMusicXmlScorePartwise",
      });
    }
    return { score: undefined, diagnostics: diags };
  }
  return { score: undefined, diagnostics: [] };
}
