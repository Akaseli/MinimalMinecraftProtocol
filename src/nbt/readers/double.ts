export function readDouble(buff: Buffer,offset: number): { data: number; new_offset: number } {
  const value = buff.readDoubleBE(offset);

  return { data: value, new_offset: offset + 8 };
}
