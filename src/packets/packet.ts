import { MinecraftBot } from '..';

export interface Packet {
  read(bot: MinecraftBot, buffer: Buffer, offset: number): void;
  handle(bot: MinecraftBot): void;
}

export interface ServerboundPacket {
  toBuffer(bot: MinecraftBot): Buffer;
}

export interface PacketVersionModule {
  clientboundPackets: Record<string, new () => Packet>;
  serverboundPackets: Record<string, number>;
  protocolVersion: number;
}
