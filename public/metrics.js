// Estimate input text only; Azure's final SSML billing meter is authoritative.
export function estimateTextCharacters(text) {
  let total = 0;
  for (const point of text) total += /\p{Script=Han}/u.test(point) ? 2 : 1;
  return total;
}
export function estimateMinutes(text, rate = 0) {
  const han = (text.match(/\p{Script=Han}/gu) || []).length;
  const words = (text.replace(/\p{Script=Han}/gu, ' ').match(/[\p{L}\p{N}]+/gu) || []).length;
  return (han / 250 + words / 140) / (1 + rate / 100);
}
