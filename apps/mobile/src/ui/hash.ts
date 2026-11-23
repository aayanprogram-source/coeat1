/** A small stable number from a string, used to pick the same tint for the same person or place every time. */
export function hashOf(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i += 1) n += text.charCodeAt(i);
  return n;
}
