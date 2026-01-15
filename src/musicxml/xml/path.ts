import type { NameId, XmlEvent } from "@/xml";
import type { XmlNamePool } from "@/xml/public/name-pool";

export type MusicXmlPathSegment = Readonly<{
  name: NameId;
  index: number;
}>;

export type MusicXmlPath = readonly MusicXmlPathSegment[];

type Frame = {
  name: NameId;
  index: number;
  childIndexByName: Map<NameId, number>;
};

export type MusicXmlPathTracker = Readonly<{
  write: (evt: XmlEvent) => void;
  path: () => MusicXmlPath;
}>;

export function createMusicXmlPathTracker(): MusicXmlPathTracker {
  const stack: Frame[] = [];

  function currentPath(): MusicXmlPath {
    return stack.map((f) => ({ name: f.name, index: f.index }));
  }

  function nextIndex(name: NameId): number {
    const parent = stack.at(-1);
    if (!parent) return 0;
    const current = parent.childIndexByName.get(name) ?? 0;
    parent.childIndexByName.set(name, current + 1);
    return current;
  }

  return {
    write: (evt) => {
      if (evt.kind === "StartElement") {
        stack.push({
          name: evt.name,
          index: nextIndex(evt.name),
          childIndexByName: new Map(),
        });
        return;
      }
      if (evt.kind === "EndElement") {
        stack.pop();
      }
    },
    path: () => currentPath(),
  };
}

export function musicXmlPathToString(
  pool: XmlNamePool,
  path: MusicXmlPath,
): string {
  return path
    .map((seg) => {
      const name = pool.toString(seg.name);
      return `${name}[${seg.index}]`;
    })
    .join("/");
}
