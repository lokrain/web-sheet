# XML module (src/xml)

## Supported XML subset

This parser targets a pragmatic, safe subset of XML intended for data-oriented documents.

### Supported

- Elements, attributes, and text content
- Entity decoding for built-in and numeric entities
- Comments and processing instructions (spans only, no content)
- Fragment mode (multiple roots) when `requireSingleRoot: false`

### Intentionally not supported

- DTD/DOCTYPE and general markup declarations
- CDATA sections
- Namespace processing beyond allowing `:` in names
- Full Unicode XML Name validation (ASCII-focused)

## Safety and limits

- Hard DTD rejection
- Configurable limits (`maxDepth`, `maxTokens`)
- Guarded factories for spans/attrs/tokens
