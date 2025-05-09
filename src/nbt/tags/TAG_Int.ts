import { readInt } from '../readers/int';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Int extends TAG_Tag{
  value: number;

  constructor(bytes: Buffer){
    super(bytes);
    
    const res = readInt(bytes, TAG_Tag._index);
    this.value = res.data;
    TAG_Tag._index = res.new_offset;
  }
}