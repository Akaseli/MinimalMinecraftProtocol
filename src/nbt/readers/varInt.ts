const SEGMENT_BITS = 0x7f;
const CONTINUE_BIT = 0x80;

export function writeVarInt(value: number): Buffer {
  const bytes: number[] = [];
  do {
    let temp = value & 0b01111111;
    value >>>= 7;
    if (value !== 0) temp |= 0b10000000;
    bytes.push(temp);
  } while (value !== 0);
  return Buffer.from(bytes);
}

export function readVarInt(buff: Buffer, offset: number): { data: number; new_offset: number } {
  let value = 0;
  let position = offset;
  let currentByte;
  let read = 0;

  while (true) {
    currentByte = buff.readUInt8(position);
    position++;

    value |= (currentByte & SEGMENT_BITS) << read;

    if ((currentByte & CONTINUE_BIT) == 0) {
      break;
    }
    read += 7;

    if (read >= 32) {
      throw new Error("VarInt is too big");
    }
  }
  
  return { data: value, new_offset: position };
}