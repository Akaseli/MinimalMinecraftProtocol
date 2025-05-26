const SEGMENT_BITS = 0x7f;
const CONTINUE_BIT = 0x80;

export function writeVarLong(value: bigint): Buffer {
  const bytes: number[] = [];
  let unsignedValue = value < 0n ? value + (1n << 64n) : value;

  do {
    let temp = Number(unsignedValue & 0x7fn);
    unsignedValue >>= 7n;
    if (unsignedValue !== 0n) temp |= CONTINUE_BIT;
    bytes.push(temp);
  } while (unsignedValue !== 0n);

  return Buffer.from(bytes);
}

export function readVarLong(
  buff: Buffer,
  offset: number,
): { data: bigint; new_offset: number } {
  let value = 0n;
  let position = offset;
  let currentByte;
  let read = 0n;

  while (true) {
    currentByte = buff.readUint8(position);
    position++;

    value |= BigInt(currentByte & SEGMENT_BITS) << read;

    if ((currentByte & CONTINUE_BIT) === 0) {
      break;
    }

    read += 7n;

    if (read >= 64n) {
      throw new Error('VarLong is too big');
    }
  }

  if (value >= 1n << 63n) {
    value -= 1n << 64n;
  }

  return { data: value, new_offset: position };
}
