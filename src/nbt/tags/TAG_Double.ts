import { writeByte } from '../readers/byte';
import { readDouble, writeDouble } from '../readers/double';
import { writeString } from '../readers/string';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Double extends TAG_Tag{
  declare value: number;

  static fromBuffer(bytes: Buffer): TAG_Double {
    const name = TAG_Tag.readName(bytes);
    
    const res = readDouble(bytes, TAG_Tag._index);
    TAG_Tag._index = res.new_offset;

    return new TAG_Double(name, res.data)
  }

  toBuffer(): Buffer {
      return Buffer.concat([writeByte(6), writeString(this.name), writeDouble(this.value)])
  }
}