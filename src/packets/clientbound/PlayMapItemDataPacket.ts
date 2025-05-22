import { MinecraftBot } from "../..";
import { readBoolean } from "../../nbt/readers/boolean";
import { readByte } from "../../nbt/readers/byte";
import { readTextComponent } from "../../nbt/readers/text_component";
import { readVarInt } from "../../nbt/readers/varInt";
import { Packet } from "../packet";

export class PlayMapItemDataPacket implements Packet{
  private columns: number | undefined;
  private rows!: number;
  private mapId!: number;
  private scale!: number;
  private mapData!: Buffer;


  read(buffer: Buffer, offset: number): void {
    const packetMapId = readVarInt(buffer, offset)
    const packetScale = readByte(buffer, packetMapId.new_offset)
    const packetLocked = readBoolean(buffer, packetScale.new_offset)

    const packetHasIcons = readBoolean(buffer, packetLocked.new_offset)
    let iconOffset = packetHasIcons.new_offset

    if(packetHasIcons.data){
      const packetIconCount = readVarInt(buffer, iconOffset)
      iconOffset = packetIconCount.new_offset

      for(let i = 0; i<packetIconCount.data; i++){
        const iconType = readVarInt(buffer, iconOffset)
        const x = readByte(buffer, iconType.new_offset)
        const y = readByte(buffer, x.new_offset)
        const direction = readByte(buffer, y.new_offset)

        const hasName = readBoolean(buffer, direction.new_offset)
        if(hasName.data){
          const displayName = readTextComponent(buffer, hasName.new_offset)
          iconOffset = displayName.offset
        } 
        else{
          iconOffset = hasName.new_offset
        }
      }
    }

    const packetColumns = readByte(buffer, iconOffset)
    if(packetColumns.data > 0){
      const packetRows = readByte(buffer, packetColumns.new_offset)
      const packetXOffset = readByte(buffer, packetRows.new_offset)
      const packetZOffset = readByte(buffer, packetXOffset.new_offset)

      const packetDataLength = readVarInt(buffer, packetZOffset.new_offset)
      
      const packetMapData =  buffer.slice(packetDataLength.new_offset, packetDataLength.new_offset + packetDataLength.data)

      this.columns = packetColumns.data;
      this.rows = packetRows.data;
      this.mapId = packetMapId.data;
      this.scale = packetScale.data;
      this.mapData = packetMapData;
    }
   
  }

  handle(bot: MinecraftBot): void {
    if(this.columns){
      bot.emit("map", this.columns, this.rows, this.mapId, this.scale, this.mapData)
    }
  }

}