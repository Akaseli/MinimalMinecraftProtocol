export function writeShort(value: number): Buffer {
  const buffer = Buffer.alloc(2);

  buffer.writeInt16BE(value);

  return buffer;
}

export function readShort(
  buff: Buffer,
  offset: number,
): { data: number; new_offset: number } {
  const value = buff.readInt16BE(offset);

  return { data: value, new_offset: offset + 2 };
}

export function writeUnsignedShort(value: number): Buffer {
  const buffer = Buffer.alloc(2);

  buffer.writeUInt16BE(value);

  return buffer;
}

export function readUnsignedShort(
  buff: Buffer,
  offset: number,
): { data: number; new_offset: number } {
  const value = buff.readUInt16BE(offset);

  return { data: value, new_offset: offset + 2 };
}
