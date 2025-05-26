import {TAG_Compound} from './tags/TAG_Compound';
import { TAG_Tag } from './tags/TAG_Tag';

//Every root of NBT *should* be a tag compound
export class NBT extends TAG_Compound{
  static fromBuffer(bytes: Buffer, root?: boolean): NBT {
      TAG_Tag._index = 0
      return (TAG_Compound.fromBuffer(bytes, root) as NBT)
  }
}