export function readByte(
  buff: Buffer,
  offset: number,
): { data: number; new_offset: number } {
  const value = buff.readInt8(offset);

  return { data: value, new_offset: offset + 1 };
}

export function writeByte(data: number): Buffer {
  const buffer = Buffer.alloc(1);
  buffer.writeInt8(data);

  return buffer;
}
