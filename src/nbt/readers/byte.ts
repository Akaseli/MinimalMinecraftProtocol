export function readByte(
  buff: Buffer,
  offset: number
): { data: number; new_offset: number } {
  const value = buff.subarray(offset, offset+1).at(0) ?? 0;

  return {data: value, new_offset: offset + 1}
}