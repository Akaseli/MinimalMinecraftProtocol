import {TAG_Tag} from './TAG_Tag';
import * as reader from "../utilities/readers";

export class TAG_String extends TAG_Tag{
  value: string;

  constructor(bytes: Uint8Array){
    super(bytes);
    
    this.value = reader.readString(bytes);
  }
}