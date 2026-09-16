/** One tmux pane rectangle, in the window's character cells. */
export interface PaneRect {
  id: string
  left: number
  top: number
  width: number
  height: number
}

export interface WindowGeometry {
  width: number
  height: number
  panes: PaneRect[]
}

/**
 * Parse a tmux layout string (`checksum,WxH,X,Y…`) into pane rectangles.
 * Nested `{…}` is a horizontal split, `[…]` a vertical split. A bare integer
 * after `WxH,X,Y,` is the pane index (not the `%id`). Callers should join
 * these rectangles to `list-panes` by position when they need `%` ids.
 */
export function parseLayout(raw: string): WindowGeometry {
  const comma = raw.indexOf(',')
  if (comma < 0) throw new Error(`layout missing checksum: ${raw}`)
  const body = raw.slice(comma + 1)
  const { node, rest } = readNode(body, 0)
  if (rest !== body.length) throw new Error(`layout trailing junk at ${rest}: ${raw}`)
  const panes: PaneRect[] = []
  collect(node, panes)
  return { width: node.width, height: node.height, panes }
}

interface LayoutNode {
  left: number
  top: number
  width: number
  height: number
  paneIndex?: number
  children?: LayoutNode[]
}

function collect(node: LayoutNode, panes: PaneRect[]): void {
  if (node.paneIndex !== undefined) {
    panes.push({
      id: String(node.paneIndex),
      left: node.left,
      top: node.top,
      width: node.width,
      height: node.height,
    })
    return
  }
  for (const child of node.children ?? []) collect(child, panes)
}

function readNode(src: string, i: number): { node: LayoutNode; rest: number } {
  const { value: width, rest: a } = readInt(src, i)
  if (src[a] !== 'x') throw new Error(`expected WxH at ${a}`)
  const { value: height, rest: b } = readInt(src, a + 1)
  if (src[b] !== ',') throw new Error(`expected comma after WxH at ${b}`)
  const { value: left, rest: c } = readInt(src, b + 1)
  if (src[c] !== ',') throw new Error(`expected comma after X at ${c}`)
  const { value: top, rest: d } = readInt(src, c + 1)
  if (src[d] === '{') {
    const { children, rest } = readGroup(src, d + 1, '}')
    return { node: { width, height, left, top, children }, rest }
  }
  if (src[d] === '[') {
    const { children, rest } = readGroup(src, d + 1, ']')
    return { node: { width, height, left, top, children }, rest }
  }
  if (src[d] !== ',') throw new Error(`expected pane id at ${d}`)
  const { value: paneIndex, rest } = readInt(src, d + 1)
  return { node: { width, height, left, top, paneIndex }, rest }
}

function readGroup(src: string, i: number, close: '}' | ']'): { children: LayoutNode[]; rest: number } {
  const children: LayoutNode[] = []
  let pos = i
  while (pos < src.length && src[pos] !== close) {
    if (src[pos] === ',') pos += 1
    const got = readNode(src, pos)
    children.push(got.node)
    pos = got.rest
  }
  if (src[pos] !== close) throw new Error(`unclosed group at ${i}`)
  return { children, rest: pos + 1 }
}

function readInt(src: string, i: number): { value: number; rest: number } {
  let pos = i
  if (src[pos] === '-') pos += 1
  const start = pos
  while (pos < src.length && src[pos]! >= '0' && src[pos]! <= '9') pos += 1
  if (pos === start) throw new Error(`expected integer at ${i}`)
  return { value: Number(src.slice(i, pos)), rest: pos }
}

/** Scale pane cells into CSS percentages of the window. */
export function paneStyle(window: { width: number; height: number }, pane: PaneRect): {
  left: string
  top: string
  width: string
  height: string
} {
  const w = Math.max(window.width, 1)
  const h = Math.max(window.height, 1)
  return {
    left: `${(100 * pane.left) / w}%`,
    top: `${(100 * pane.top) / h}%`,
    width: `${(100 * pane.width) / w}%`,
    height: `${(100 * pane.height) / h}%`,
  }
}
