import { MinecraftBot } from '../..';
import { readDouble } from '../../nbt/readers/double';
import { readVarInt } from '../../nbt/readers/varInt';
import { readVarLong } from '../../nbt/readers/varLong';
import { Packet } from '../packet';

export interface PlayInitializeBorder {
  x: number;
  y: number;
  currentDiameter: number;
  newDiameter: number;
  speed: bigint;
  warningBlocks: number;
  warningTime: number;
}

export class PlayInitializeBorderPacket
  implements Packet, PlayInitializeBorder
{
  public x!: number;
  public y!: number;
  public newDiameter!: number;
  public currentDiameter!: number;

  public speed!: bigint;

  public warningBlocks!: number;
  public warningTime!: number;

  read(buffer: Buffer, offset: number): void {
    //World border
    const packetX = readDouble(buffer, offset);
    const packetY = readDouble(buffer, packetX.new_offset);

    const packetCurrentDia = readDouble(buffer, packetY.new_offset);
    const packetNewDia = readDouble(buffer, packetCurrentDia.new_offset);

    const packetSpeed = readVarLong(buffer, packetNewDia.new_offset);

    const packetPortalTeleportBoundary = readVarInt(
      buffer,
      packetSpeed.new_offset,
    );
    const packetWarningBlocks = readVarInt(
      buffer,
      packetPortalTeleportBoundary.new_offset,
    );
    const packetWarningTime = readVarInt(
      buffer,
      packetWarningBlocks.new_offset,
    );

    this.x = packetX.data;
    this.y = packetY.data;

    this.currentDiameter = packetCurrentDia.data;
    this.newDiameter = packetNewDia.data;

    this.speed = packetSpeed.data;
    this.warningBlocks = packetWarningBlocks.data;
    this.warningTime = packetWarningTime.data;
  }

  handle(bot: MinecraftBot): void {
    bot.emit('world_border', this.x, this.y, this.currentDiameter, this);
  }
}
