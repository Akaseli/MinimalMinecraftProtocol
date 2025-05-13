import {TAG_Compound} from './tags/TAG_Compound';
import { TAG_Tag } from './tags/TAG_Tag';

//Every root of NBT *should* be a tag compound
export class NBT extends TAG_Compound{

  constructor(bytes: Buffer, root = false) {
    //Reset reading
    TAG_Tag._index = 0;
    super(bytes, root);
  }
  
}