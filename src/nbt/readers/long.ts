export function writeLong(value: bigint, le = false): Buffer {
  const buffer = Buffer.alloc(8);

  if (le) {
    buffer.writeBigInt64LE(value);
  } else {
    buffer.writeBigInt64BE(value);
  }

  return buffer;
}

export function readLong(
  buff: Buffer,
  offset: number,
  le = false,
): { data: bigint; new_offset: number } {
  let value = 0n;

  if (le) {
    value = buff.readBigInt64LE(offset);
  } else {
    value = buff.readBigInt64BE(offset);
  }

  return { data: value, new_offset: offset + 8 };
}

export function writeULong(value: bigint, le = false): Buffer {
  const buffer = Buffer.alloc(8);

  if (le) {
    buffer.writeBigUInt64LE(value);
  } else {
    buffer.writeBigUInt64BE(value);
  }

  return buffer;
}

export function readULong(
  buff: Buffer,
  offset: number,
  le = false,
): { data: bigint; new_offset: number } {
  let value = 0n;

  if (le) {
    value = buff.readBigUInt64LE(offset);
  } else {
    value = buff.readBigUInt64BE(offset);
  }

  return { data: value, new_offset: offset + 8 };
}
