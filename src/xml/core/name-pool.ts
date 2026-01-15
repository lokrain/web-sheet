import type { NameId } from "@/xml/core/types";

export class XmlNamePool {
  readonly #byString = new Map<string, NameId>();
  readonly #strings: string[] = [];

  public intern(name: string): NameId {
    const existing = this.#byString.get(name);
    if (existing !== undefined) return existing;

    const id = this.#strings.length as NameId;
    this.#strings.push(name);
    this.#byString.set(name, id);
    return id;
  }

  public toString(id: NameId): string {
    const s = this.#strings[id as unknown as number];
    if (s === undefined)
      throw new Error(`NameId out of range: ${id as unknown as number}`);
    return s;
  }
}
