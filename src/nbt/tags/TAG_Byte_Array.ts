import { writeByte } from '../readers/byte';
import { readInt, writeInt } from '../readers/int';
import { writeString } from '../readers/string';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Byte_Array extends TAG_Tag{
  value!: number[];
  lenght!: number;

  constructor(name: string, value: number[]){
    super(name, value);
    this.lenght = value.length;
  }

  static fromBuffer(bytes: Buffer): TAG_Byte_Array {
    const name = TAG_Tag.readName(bytes);
    
    const res = readInt(bytes, TAG_Tag._index);
    
    TAG_Tag._index = res.new_offset;

    var value = [];
    for (let i = 0; i < res.data; i++) {
      value.push(bytes[TAG_Tag._index]);
      TAG_Tag._index += 1;
    }

    return new TAG_Byte_Array(name, value)
  }

  toBuffer(): Buffer {
      return Buffer.concat([writeByte(7), writeString(this.name), writeInt(this.lenght), Buffer.from(this.value)])
  }
}