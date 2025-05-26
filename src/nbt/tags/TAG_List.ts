import { TAG_Tag } from './TAG_Tag';
import {TAG_String} from './TAG_String';
import {TAG_Short} from './TAG_Short';
import {TAG_Int} from './TAG_Int';
import {TAG_Long} from './TAG_Long'
import {TAG_Float} from './TAG_Float'
import {TAG_Double} from './TAG_Double'
import {TAG_Compound} from './TAG_Compound'
import { TAG_Long_Array } from './TAG_Long_Array';
import { TAG_Int_Array } from './TAG_Int_Array';
import { TAG_Byte_Array } from './TAG_Byte_Array';
import { TAG_Byte } from './TAG_Byte';
import { readInt, writeInt } from '../readers/int';
import { readShort, writeShort } from '../readers/short';
import { readLong, writeLong } from '../readers/long';
import { readFloat, writeFloat } from '../readers/float';
import { readDouble, writeDouble } from '../readers/double';
import { readString, writeString } from '../readers/string';
import { writeByte } from '../readers/byte';

export class TAG_List extends TAG_Tag {
  declare value: Array<any>;
  type!: number;
  length!: number;

  constructor(name: string, value: Array<any>, type: number){
    super(name, value);

    this.type = type;
    this.length = value.length;
  }

  static fromBuffer(bytes: Buffer): TAG_List {
    const name = this.readName(bytes);

    const type = bytes[TAG_Tag._index];
    TAG_Tag._index += 1;

    const res = readInt(bytes, TAG_Tag._index);
    TAG_Tag._index = res.new_offset;


    var value = [];
    for (let i = 0; i < res.data; i++) {
      switch (type) {
        //BYTE
        case 1:
          value.push(bytes[TAG_Tag._index]);
          TAG_Tag._index += 1;
          break;
        //SHORT
        case 2:
          let res1 = readShort(bytes, TAG_Tag._index)
          value.push(res1.data)
          TAG_Tag._index = res1.new_offset;
          break
        //INT
        case 3:
          let res2 = readInt(bytes, TAG_Tag._index)
          value.push(res2.data)
          TAG_Tag._index = res2.new_offset;
          break;
        //LONG
        case 4:
          let res3 = readLong(bytes, TAG_Tag._index)
          value.push(res3.data)
          TAG_Tag._index = res3.new_offset;
          break;
        //FLOAT
        case 5:
          let res4 = readFloat(bytes, TAG_Tag._index)
          value.push(res4.data)
          TAG_Tag._index = res4.new_offset;
          break;
        //DOUBLE
        case 6:
          let res5 = readDouble(bytes, TAG_Tag._index)
          value.push(res5.data)
          TAG_Tag._index = res5.new_offset;
          break;
        //STRING
        case 8:
          let res6 = readString(bytes, (TAG_Tag._index))
          value.push(res6.data)
          TAG_Tag._index = res6.new_offset;
          break;
        //COMPOUND
        case 10:
          var cValue: Array<TAG_Tag> = [];

          //Cant remember what I was thinking years ago, probably can be removed / made more clean
          while (bytes[TAG_Tag._index] != 0) {
            switch (bytes[TAG_Tag._index]) {
              case 1:
                cValue.push(TAG_Byte.fromBuffer(bytes));
                break;
              case 2:
                cValue.push(TAG_Short.fromBuffer(bytes));
                break;
              case 3:
                cValue.push(TAG_Int.fromBuffer(bytes));
                break;
              case 4:
                cValue.push(TAG_Long.fromBuffer(bytes));
                break;
              case 5:
                cValue.push(TAG_Float.fromBuffer(bytes));
                break;
              case 6:
                cValue.push(TAG_Double.fromBuffer(bytes));
                break;
              case 7:
                cValue.push(TAG_Byte_Array.fromBuffer(bytes));
                break;
              case 8:
                cValue.push(TAG_String.fromBuffer(bytes));
                break;
              case 9:
                cValue.push(TAG_List.fromBuffer(bytes));
                break;
              case 10:
                cValue.push(TAG_Compound.fromBuffer(bytes));
                TAG_Tag._index += 1;
                break;
              case 11:
                cValue.push(TAG_Int_Array.fromBuffer(bytes));
                break;
              case 12:
                cValue.push(TAG_Long_Array.fromBuffer(bytes));
                break;        

              default:
                throw new Error("Unsupported tag with type " + bytes[TAG_Tag._index])
            }

          }
          TAG_Tag._index += 1;
          value.push(cValue);
          break;

        default:
          throw new Error("Unsupported tag with type " + type)
      }
    }

    return new TAG_List(name, value, type);
  }

  toBuffer(): Buffer {
      const data: Buffer[] = []


      this.value.forEach((val) => {
        switch(this.type) {
          case 1: 
            data.push(writeByte(val)); 
            break;
          case 2: 
            data.push(writeShort(val)); 
            break;
          case 3: 
            data.push(writeInt(val)); 
            break;
          case 4: 
            data.push(writeLong(val)); 
            break;
          case 5: 
            data.push(writeFloat(val)); 
            break;
          case 6: 
            data.push(writeDouble(val)); 
            break;
          case 8:
            data.push(writeString(val)); 
            break;
          case 10: 
            const result: Buffer[] = [];

            (val as TAG_Tag[]).forEach((tag_element: TAG_Tag) => {
                if(tag_element instanceof TAG_Byte){
                  result.push(tag_element.toBuffer()); 
                }
                else if(tag_element instanceof TAG_Short){
                  result.push(tag_element.toBuffer());
                }
                else if(tag_element instanceof TAG_Int){
                  result.push(tag_element.toBuffer());
                }
                else if(tag_element instanceof TAG_Long){
                  result.push(tag_element.toBuffer());
                }
                else if(tag_element instanceof TAG_Float){
                  result.push(tag_element.toBuffer());
                }
                else if(tag_element instanceof TAG_Double){
                  result.push(tag_element.toBuffer());
                }
                else if(tag_element instanceof TAG_Byte_Array){
                  result.push(tag_element.toBuffer());
                }
                else if(tag_element instanceof TAG_String){
                  result.push(tag_element.toBuffer());
               }
                else if(tag_element instanceof TAG_List){
                  result.push(tag_element.toBuffer());
               }
              else if(tag_element instanceof TAG_Compound){
                  result.push(tag_element.toBuffer());
               }
              else if(tag_element instanceof TAG_Int_Array){
                  result.push(tag_element.toBuffer());
               }
              else if(tag_element instanceof TAG_Long_Array){
                  result.push(tag_element.toBuffer());
               }
            })

            result.push(writeByte(0))
            
            data.push(...result)
          break;
          default: throw new Error("Unsupported tag with type " + this.type)
        }
      })
      return Buffer.concat([writeByte(9), writeString(this.name), writeByte(this.type), writeInt(this.length), ...data])
  }
}