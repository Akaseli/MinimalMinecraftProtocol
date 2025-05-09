import { readInt } from '../readers/int';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Int_Array extends TAG_Tag{
  value: number[];
  lenght: number;

  constructor(bytes: Buffer){
    super(bytes);
    
    const res = readInt(bytes, TAG_Tag._index);
    this.lenght= res.data;
    TAG_Tag._index = res.new_offset;

    var value = [];
    for (let i = 0; i < this.lenght; i++) {
      const val = readInt(bytes, TAG_Tag._index)

      value.push(val.data);
      TAG_Tag._index = val.new_offset
    }

    this.value = value;
  }
}