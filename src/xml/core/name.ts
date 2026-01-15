export function isXmlNameStart(c: number): boolean {
  return (
    (c >= 65 && c <= 90) || // A-Z
    (c >= 97 && c <= 122) || // a-z
    c === 95 || // _
    c === 58 // :
  );
}

export function isXmlNameChar(c: number): boolean {
  return (
    isXmlNameStart(c) ||
    (c >= 48 && c <= 57) || // 0-9
    c === 45 || // -
    c === 46 // .
  );
}
