/** Decode tmux control-mode %output payloads (non-printables as octal \xxx). */
export function decodeControlOutput(escaped: string): string {
  let out = ''
  for (let i = 0; i < escaped.length; i++) {
    const ch = escaped[i]
    if (ch === '\\' && i + 3 < escaped.length) {
      const a = escaped[i + 1]
      const b = escaped[i + 2]
      const c = escaped[i + 3]
      if (isOctal(a) && isOctal(b) && isOctal(c)) {
        out += String.fromCharCode(Number.parseInt(a + b + c, 8))
        i += 3
        continue
      }
    }
    out += ch
  }
  return out
}

function isOctal(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '7'
}
