import type { XmlNamePool } from "@/xml/public/name-pool";
import type { XmlEvent } from "@/xml/public/types";

export function getEventSignature(evt: XmlEvent, pool: XmlNamePool): string {
  switch (evt.kind) {
    case "StartElement": {
      const name = pool.toString(evt.name);
      const attrs = evt.attrs
        .map((attr) => `${pool.toString(attr.name)}=${attr.value}`)
        .join(",");
      return `Start:${name}:${attrs}:${evt.selfClosing}`;
    }
    case "EndElement":
      return `End:${pool.toString(evt.name)}`;
    case "Text":
      return `Text:${evt.value}`;
    case "Comment":
      return "Comment";
    case "ProcessingInstruction":
      return "ProcessingInstruction";
    default:
      return `Unknown:${String((evt as { kind?: unknown }).kind ?? "(missing kind)")}`;
  }
}
