import { XmlError } from "@/xml/core/error";
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
      throw new XmlError(
        "XML_NAME_ID_OUT_OF_RANGE",
        { offset: 0, line: 1, column: 1 },
        `NameId out of range: ${id as unknown as number}`,
      );
    return s;
  }

  public tryToString(id: NameId): string | null {
    const s = this.#strings[id as unknown as number];
    return s ?? null;
  }
}
