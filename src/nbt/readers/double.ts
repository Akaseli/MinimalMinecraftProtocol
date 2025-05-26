export function readDouble(
  buff: Buffer,
  offset: number,
): { data: number; new_offset: number } {
  const value = buff.readDoubleBE(offset);

  return { data: value, new_offset: offset + 8 };
}

export function writeDouble(data: number): Buffer {
  const buffer = Buffer.alloc(8);

  buffer.writeDoubleBE(data, 0);

  return buffer;
}
