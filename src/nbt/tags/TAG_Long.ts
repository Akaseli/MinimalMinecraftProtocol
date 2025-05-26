import { writeByte } from '../readers/byte';
import { readLong, writeLong } from '../readers/long';
import { writeString } from '../readers/string';
import { TAG_Tag } from './TAG_Tag';

export class TAG_Long extends TAG_Tag {
  declare value: bigint;

  static fromBuffer(bytes: Buffer): TAG_Long {
    const name = TAG_Tag.readName(bytes);

    const res = readLong(bytes, TAG_Tag._index);
    TAG_Tag._index = res.new_offset;

    return new TAG_Long(name, res.data);
  }

  toBuffer(): Buffer {
    return Buffer.concat([
      writeByte(4),
      writeString(this.name),
      writeLong(this.value),
    ]);
  }
}
