export class XmlParseError extends Error {
  public readonly code: string;
  public readonly offset: number;

  constructor(code: string, offset: number, message: string) {
    super(message);
    this.name = "XmlParseError";
    this.code = code;
    this.offset = offset;
  }
}
