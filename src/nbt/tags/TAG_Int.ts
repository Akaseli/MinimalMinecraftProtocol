import {TAG_Tag} from './TAG_Tag';
import * as reader from "../utilities/readers";

export class TAG_Int extends TAG_Tag{
  value: BigInt;

  constructor(bytes: Uint8Array){
    super(bytes);
    
    this.value = reader.readInt(bytes);
  }
}