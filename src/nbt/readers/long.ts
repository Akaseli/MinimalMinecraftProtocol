export function writeLong(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64LE(value);

  return buffer;
}

export function readLong(buff: Buffer, offset: number, le = false): { data: bigint; new_offset: number } {
  let value = 0n;

  if(le){
    value = buff.readBigInt64LE(offset);
  }
  else{
     value = buff.readBigInt64BE(offset);
  }

  return { data: value, new_offset: offset + 8 };
}