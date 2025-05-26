import {TAG_Tag} from './TAG_Tag';
import {TAG_String} from './TAG_String';
import {TAG_Short} from './TAG_Short';
import {TAG_Int} from './TAG_Int';
import {TAG_Long} from './TAG_Long'
import {TAG_Float} from './TAG_Float'
import {TAG_Double} from './TAG_Double'
import {TAG_List} from './TAG_List'
import {TAG_Byte} from './TAG_Byte'
import {TAG_Byte_Array} from './TAG_Byte_Array'
import {TAG_Int_Array} from './TAG_Int_Array'
import {TAG_Long_Array} from './TAG_Long_Array'
import { writeString } from '../readers/string';
import { writeByte } from '../readers/byte';

export class TAG_Compound extends TAG_Tag{
  declare value: TAG_Tag[];

  static fromBuffer(bytes: Buffer, root = false): TAG_Compound {
    const name = TAG_Tag.readName(bytes, root)
    
    const value:TAG_Tag[] = [];
    
    while (bytes[TAG_Tag._index] != 0) {
      switch(bytes[TAG_Tag._index]){
        case 1:
          value.push(TAG_Byte.fromBuffer(bytes));
          break;
        case 2:
          value.push(TAG_Short.fromBuffer(bytes));
          break;
        case 3:
          value.push(TAG_Int.fromBuffer(bytes));
          break;
        case 4:
          value.push(TAG_Long.fromBuffer(bytes));
          break;
        case 5:
          value.push(TAG_Float.fromBuffer(bytes));
          break;
        case 6:
          value.push(TAG_Double.fromBuffer(bytes));
          break;
        case 7:
          value.push(TAG_Byte_Array.fromBuffer(bytes));
          break;
        case 8:
          value.push(TAG_String.fromBuffer(bytes));
          break;
        case 9:
          value.push(TAG_List.fromBuffer(bytes));
          break;
        case 10:
          value.push(TAG_Compound.fromBuffer(bytes));
          TAG_Tag._index += 1;
          break;
        case 11:
          value.push(TAG_Int_Array.fromBuffer(bytes));
          break;
        case 12:
          value.push(TAG_Long_Array.fromBuffer(bytes));
          break;        
        default:
          throw new Error("Missing case for " + bytes[TAG_Tag._index])
      }
      
    }
    
    return new TAG_Compound(name, value)
  }

  toBuffer(): Buffer {
    const values: Buffer[] = [];

    this.value.forEach(tag => {
      values.push(
        tag.toBuffer()
      )
    });

    return Buffer.concat([writeByte(10), writeString(this.name), ...values, writeByte(0)])
  }
}