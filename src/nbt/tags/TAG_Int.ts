import { writeByte } from '../readers/byte';
import { readInt, writeInt } from '../readers/int';
import { writeString } from '../readers/string';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Int extends TAG_Tag{
  value!: number;

  constructor(name: string, value: number){
    super(name, value)
  }

  static fromBuffer(bytes: Buffer): TAG_Int {
    const name = TAG_Tag.readName(bytes);
    
    const res = readInt(bytes, TAG_Tag._index);
    TAG_Tag._index = res.new_offset;

    return new TAG_Int(name, res.data)
  }

  toBuffer(): Buffer {
      return Buffer.concat([writeByte(3), writeString(this.name), writeInt(this.value)])
  }
}