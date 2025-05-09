export function readBoolean(buff: Buffer, offset: number): { data: boolean; new_offset: number } {
  let read = 0;

  let bool = buff.readUint8(offset);
  read += 1;

  return { data: bool === 0x01, new_offset: offset + read };
}

export function writeBoolean(bool: boolean): Buffer {
  let data: Buffer;
  if (bool) {
    data = Buffer.from([1]);
  } else {
    data = Buffer.from([0]);
  }

  return data;
}
