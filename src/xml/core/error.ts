export type XmlPosition = Readonly<{
  offset: number;
  line: number;
  column: number;
}>;

export class XmlError extends Error {
  public readonly code: string;
  public readonly position: XmlPosition;
  public readonly context?: string;

  constructor(
    code: string,
    position: XmlPosition,
    message: string,
    context?: string,
  ) {
    super(message);
    this.name = "XmlError";
    this.code = code;
    this.position = position;
    this.context = context;
  }

  public get offset(): number {
    return this.position.offset;
  }
}

export class XmlParseError extends XmlError {
  constructor(
    code: string,
    position: XmlPosition,
    message: string,
    context?: string,
  ) {
    super(code, position, message, context);
    this.name = "XmlParseError";
  }
}
