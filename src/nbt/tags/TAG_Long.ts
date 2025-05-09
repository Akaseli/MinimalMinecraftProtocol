import { readLong } from '../readers/long';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Long extends TAG_Tag{
  value: BigInt;

  constructor(bytes: Buffer){
    super(bytes);
    
    const res = readLong(bytes, TAG_Tag._index);
    this.value = res.data;
    TAG_Tag._index = res.new_offset;
  }
}