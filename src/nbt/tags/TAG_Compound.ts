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

export class TAG_Compound extends TAG_Tag{
  value: Array<TAG_Tag>;

  constructor(bytes: Uint8Array, root = false){
    super(bytes, root);
    
    var value:Array<TAG_Tag> = [];
    
    while (bytes[TAG_Tag._index] != 0) {
      switch(bytes[TAG_Tag._index]){
        case 0:
          TAG_Tag._index += 1;
          break;
        case 1:
          value.push(new TAG_Byte(bytes));
          break;
        case 2:
          value.push(new TAG_Short(bytes));
          break;
        case 3:
          value.push(new TAG_Int(bytes));
          break;
        case 4:
          value.push(new TAG_Long(bytes));
          break;
        case 5:
          value.push(new TAG_Float(bytes));
          break;
        case 6:
          value.push(new TAG_Double(bytes));
          break;
        case 7:
          value.push(new TAG_Byte_Array(bytes));
          break;
        case 8:
          value.push(new TAG_String(bytes));
          break;
        case 9:
          value.push(new TAG_List(bytes));
          break;
        case 10:
          value.push(new TAG_Compound(bytes));
          TAG_Tag._index += 1;
          break;
        case 11:
          value.push(new TAG_Int_Array(bytes));
          break;
        case 12:
          value.push(new TAG_Long_Array(bytes));
          break;        
        default:
          console.log("Missing case for " + bytes[TAG_Tag._index])
          TAG_Tag._index = bytes.length -1
      }
      
    }
    
  
    this.value = value;
  }
}