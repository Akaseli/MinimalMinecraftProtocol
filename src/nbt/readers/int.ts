export function writeInt(value: number, le = false): Buffer {
  const buffer = Buffer.alloc(4);

  if (le) {
    buffer.writeInt32LE(value);
  } else {
    buffer.writeInt32BE(value);
  }

  return buffer;
}

export function readInt(
  buff: Buffer,
  offset: number,
  le = false,
): { data: number; new_offset: number } {
  let value = 0;

  if (le) {
    value = buff.readInt32LE(offset);
  } else {
    value = buff.readInt32BE(offset);
  }

  return { data: value, new_offset: offset + 4 };
}
