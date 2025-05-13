import { writeByte } from '../readers/byte';
import { readInt, writeInt } from '../readers/int';
import { readLong, writeLong } from '../readers/long';
import { writeString } from '../readers/string';
import {TAG_Tag} from './TAG_Tag';
export class TAG_Long_Array extends TAG_Tag{
  value: bigint[];
  length: number;

  constructor(bytes: Buffer){
    super(bytes);
    
    const res = readInt(bytes, TAG_Tag._index);
    this.length = res.data;
    TAG_Tag._index = res.new_offset;

    var value = [];
    for (let i = 0; i < this.length; i++) {
      const res1 = readLong(bytes, TAG_Tag._index)
      
      value.push(res1.data);
      TAG_Tag._index = res1.new_offset;
    }

    this.value = value;
  }

    toBuffer(): Buffer {
      let values: Buffer[] = [];
  
      this.value.forEach((num) => {
        values.push(writeLong(num))
      })
  
      return Buffer.concat([writeByte(12), writeString(this.name), writeInt(this.length), ...values])
    }
}