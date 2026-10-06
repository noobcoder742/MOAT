/** Joins pieces like ["print", "(", "\"Hi\"", ")"] into print("Hi") (CodeJoin in Theme.swift). */
export function codeJoin(pieces: string[]): string {
  let result = '';
  for (const piece of pieces) {
    const noSpaceBefore = [')', ':', ',', '(', ';'].includes(piece);
    const afterOpenBracket = result.endsWith('(');
    result += result === '' || noSpaceBefore || afterOpenBracket ? piece : ' ' + piece;
  }
  return result;
}

/** "$1,000" style money, as LoopGameConfig.money does with an en_US number formatter. */
export const money = (value: number) => '$' + Math.round(value).toLocaleString('en-US');
