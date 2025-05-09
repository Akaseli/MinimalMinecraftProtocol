import { readInt } from '../readers/int';
import { readLong } from '../readers/long';
import {TAG_Tag} from './TAG_Tag';
export class TAG_Long_Array extends TAG_Tag{
  value: BigInt[];
  lenght: number;

  constructor(bytes: Buffer){
    super(bytes);
    
    const res = readInt(bytes, TAG_Tag._index);
    this.lenght = res.data;
    TAG_Tag._index = res.new_offset;

    var value = [];
    for (let i = 0; i < this.lenght; i++) {
      const res1 = readLong(bytes, TAG_Tag._index)
      
      value.push(res1.data);
      TAG_Tag._index = res1.new_offset;
    }

    this.value = value;
  }
}