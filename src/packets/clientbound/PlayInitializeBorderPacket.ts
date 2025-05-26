import { MinecraftBot } from "../..";
import { readDouble } from "../../nbt/readers/double";
import { readVarInt } from "../../nbt/readers/varInt";
import { readVarLong } from "../../nbt/readers/varLong";
import { Packet } from "../packet";

export class PlayInitializeBorderPacket implements Packet{
  private x!: number;
  private y!: number;
  private currentDiameter!: number;

  private warningBlocks!: number;
  private warningTime!: number;

  read(buffer: Buffer, offset: number): void {
    //World border
    const packetX = readDouble(buffer, offset);
    const packetY = readDouble(buffer, packetX.new_offset);

    const packetCurrentDia = readDouble(buffer, packetY.new_offset);
    const packetNewDia = readDouble(buffer, packetCurrentDia.new_offset);

    const packetSpeed = readVarLong(buffer, packetNewDia.new_offset);
    
    const packetPortalTeleportBoundary = readVarInt(buffer, packetSpeed.new_offset);
    const packetWarningBlocks = readVarInt(buffer, packetPortalTeleportBoundary.new_offset);
    const packetWarningTime = readVarInt(buffer, packetWarningBlocks.new_offset);

    this.x = packetX.data;
    this.y = packetY.data;

    this.currentDiameter = packetCurrentDia.data;

    this.warningBlocks = packetWarningBlocks.data;
    this.warningTime = packetWarningTime.data;
  }

  handle(bot: MinecraftBot): void {
    bot.emit("world_border", this.x, this.y, this.currentDiameter)
  }
}