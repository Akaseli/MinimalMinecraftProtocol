import {TAG_Tag} from './TAG_Tag';
import * as reader from "../utilities/readers";

export class TAG_Float extends TAG_Tag{
  value: number;

  constructor(bytes: Uint8Array){
    super(bytes);
    
    this.value = reader.readFloat(bytes);
  }
}