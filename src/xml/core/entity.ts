import type { XmlPosition } from "@/xml/core/error";
import { XmlParseError } from "@/xml/core/error";
import { advancePosition } from "@/xml/internal/position";

export type XmlEntityResolver = (name: string) => string | null;

export function decodeXmlEntities(
  text: string,
  basePosition: XmlPosition,
  resolver?: XmlEntityResolver,
): string {
  const firstAmp = text.indexOf("&");
  if (firstAmp === -1) return text;

  const parts: string[] = [];
  let last = 0;

  for (let i = firstAmp; i < text.length; i++) {
    if (text.charCodeAt(i) !== 38) continue; // '&'
    parts.push(text.slice(last, i));

    const semi = text.indexOf(";", i + 1);
    if (semi === -1) {
      throw new XmlParseError(
        "XML_ENTITY_UNTERMINATED",
        advancePosition(basePosition, text, i),
        "Unterminated entity",
      );
    }

    const body = text.slice(i + 1, semi);
    parts.push(
      decodeEntityBody(body, advancePosition(basePosition, text, i), resolver),
    );

    i = semi;
    last = semi + 1;
  }

  parts.push(text.slice(last));
  return parts.join("");
}

function decodeEntityBody(
  body: string,
  at: XmlPosition,
  resolver?: XmlEntityResolver,
): string {
  switch (body) {
    case "lt":
      return "<";
    case "gt":
      return ">";
    case "amp":
      return "&";
    case "quot":
      return '"';
    case "apos":
      return "'";
    default: {
      if (body.startsWith("#x")) {
        const cp = Number.parseInt(body.slice(2), 16);
        if (!isValidCodePoint(cp)) {
          throw new XmlParseError(
            "XML_ENTITY_BAD",
            at,
            `Bad hex entity: &${body};`,
          );
        }
        return String.fromCodePoint(cp);
      }
      if (body.startsWith("#")) {
        const cp = Number.parseInt(body.slice(1), 10);
        if (!isValidCodePoint(cp)) {
          throw new XmlParseError(
            "XML_ENTITY_BAD",
            at,
            `Bad dec entity: &${body};`,
          );
        }
        return String.fromCodePoint(cp);
      }

      if (resolver) {
        const resolved = resolver(body);
        if (resolved !== null) return resolved;
      }

      // No DTD => reject unknown named entities deterministically
      throw new XmlParseError(
        "XML_ENTITY_UNKNOWN",
        at,
        `Unknown entity: &${body};`,
      );
    }
  }
}

function isValidCodePoint(cp: number): boolean {
  return (
    Number.isInteger(cp) &&
    cp >= 0 &&
    cp <= 0x10ffff &&
    !(cp >= 0xd800 && cp <= 0xdfff)
  );
}
