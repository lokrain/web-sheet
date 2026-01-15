import { XmlNamePool as XmlNamePoolImpl } from "@/xml/core/name-pool";
import type { NameId } from "@/xml/core/types";

export type XmlNamePool = Readonly<{
  intern: (name: string) => NameId;
  toString: (id: NameId) => string;
  tryToString: (id: NameId) => string | null;
}>;

export function createNamePool(): XmlNamePool {
  return new XmlNamePoolImpl();
}
