import { readFloat } from '../readers/float';
import {TAG_Tag} from './TAG_Tag';

export class TAG_Float extends TAG_Tag{
  value: number;

  constructor(bytes: Buffer){
    super(bytes);

    const res = readFloat(bytes, TAG_Tag._index)
      
    this.value = res.data;
    TAG_Tag._index = res.new_offset;
  }
}