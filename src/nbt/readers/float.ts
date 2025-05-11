export function readFloat(buff: Buffer, offset: number): { data: number; new_offset: number } {
  const data = buff.readFloatBE(offset);

  return {data: data, new_offset: offset + 4};
}

export function writeFloat(data: number): Buffer {
  const buffer = Buffer.alloc(4); 

  buffer.writeFloatBE(data, 0);

  return buffer;
}