import { writeByte } from '../readers/byte';
import { readInt, writeInt } from '../readers/int';
import { writeString } from '../readers/string';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Int_Array extends TAG_Tag{
  value: number[];
  length: number;

  constructor(bytes: Buffer){
    super(bytes);
    
    const res = readInt(bytes, TAG_Tag._index);
    this.length= res.data;
    TAG_Tag._index = res.new_offset;

    let value = [];
    for (let i = 0; i < this.length; i++) {
      const val = readInt(bytes, TAG_Tag._index)

      value.push(val.data);
      TAG_Tag._index = val.new_offset
    }

    this.value = value;
  }

  toBuffer(): Buffer {
    let values: Buffer[] = [];

    this.value.forEach((num) => {
      values.push(writeInt(num))
    })

    return Buffer.concat([writeByte(11), writeString(this.name), writeInt(this.length), ...values])
  }
}