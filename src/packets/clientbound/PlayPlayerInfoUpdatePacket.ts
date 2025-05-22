import { MinecraftBot } from "../..";
import { readBoolean } from "../../nbt/readers/boolean";
import { readByte } from "../../nbt/readers/byte";
import { readLong } from "../../nbt/readers/long";
import { readProtocolString } from "../../nbt/readers/string";
import { readTextComponent } from "../../nbt/readers/text_component";
import { readUUID } from "../../nbt/readers/uuid";
import { readVarInt } from "../../nbt/readers/varInt";
import { Packet } from "../packet";

type ActionData = {
  joiningUsername?: string
}

type PlayerInfoUpdate = {
  [uuid: string]: ActionData
}

//https://minecraft.wiki/w/Java_Edition_protocol/Packets#Player_Info_Update
export class PlayPlayerInfoUpdatePacket implements Packet {
  //Currently only for UUID -> Username for joined players
  private receivedData: PlayerInfoUpdate = {};

  read(buffer: Buffer, offset: number): void {
    const actions = readByte(buffer, offset);

    const playersLength = readVarInt(buffer, actions.new_offset)
    let playersLengthOffset = playersLength.new_offset
    
    for(let playerIndex = 0; playerIndex < playersLength.data; playerIndex++){
        const playerUUID = readUUID(buffer, playersLengthOffset);
        let playerUUIDString = playerUUID.data.toString("hex")
        
        let actionOffset = playerUUID.new_offset;
        
        if(actions.data & 1){
          //We have player, and the info should be first in the packet
          const joiningUsername = readProtocolString(buffer, actionOffset);
          
          this.receivedData[playerUUIDString] = {joiningUsername: joiningUsername.data};

          //Property
          const propertySize = readVarInt(buffer, joiningUsername.new_offset);

          let pIoffset = propertySize.new_offset;
          for(let pI = 0; pI < propertySize.data; pI++){
            const sName = readProtocolString(buffer, pIoffset)
            const sValue = readProtocolString(buffer, sName.new_offset)

            const sSignatureExists = readBoolean(buffer, sValue.new_offset)

            if(sSignatureExists.data){
              const sSignature = readProtocolString(buffer, sSignatureExists.new_offset)
              pIoffset = sSignature.new_offset;
            }
            else{
              pIoffset = sSignatureExists.new_offset;
            }
          }

          actionOffset = pIoffset
        }

        if(actions.data & 2){
          const initChatPresent = readBoolean(buffer, actionOffset)

          if(initChatPresent.data){
            const sessionId = readUUID(buffer, initChatPresent.new_offset)
            
            const expiringTiem = readLong(buffer, sessionId.new_offset, true)
            
            const epkeyLenght = readVarInt(buffer, expiringTiem.new_offset)
            
            const pkeysigLength = readVarInt(buffer, epkeyLenght.new_offset + epkeyLenght.data)

            actionOffset = pkeysigLength.new_offset + pkeysigLength.data
          }
          else{
            actionOffset = initChatPresent.new_offset
          }
        }

        if(actions.data & 4){
          const gameMode = readVarInt(buffer, actionOffset)

          actionOffset = gameMode.new_offset
        }

        if(actions.data & 8){
          //Probably should not list players having this enabled.
          const listed = readBoolean(buffer, actionOffset)

          actionOffset = listed.new_offset
        }

        if(actions.data & 16){
          const ping = readVarInt(buffer, actionOffset)

          actionOffset = ping.new_offset
        }

        if(actions.data & 32){
          //Display name
          const hasDisplayName = readBoolean(buffer, actionOffset)
          if(hasDisplayName.data){
            const displayName = readTextComponent(buffer, hasDisplayName.new_offset)
            actionOffset = displayName.offset
          }
          else{
            actionOffset = hasDisplayName.new_offset
          }
        }

        if(actions.data & 64){
          //Tab list priority or similar
          const priority = readVarInt(buffer, actionOffset)

          actionOffset = priority.new_offset
        }

        if(actions.data & 128){
          const hat = readBoolean(buffer, actionOffset)

          actionOffset = hat.new_offset
        }

        playersLengthOffset = actionOffset
    }
          
  }

  handle(bot: MinecraftBot): void {
    for(const uuid in this.receivedData){
      const data = this.receivedData[uuid];

      if(data.joiningUsername){
        bot.players[uuid] = data.joiningUsername;
      }
    }
  }
}