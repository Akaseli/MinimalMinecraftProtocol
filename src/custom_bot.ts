import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

import { MinecraftBot } from ".";
import { refreshDiscord } from "./discord_refresh";
import { sendChatToChannel, StartDiscord } from "./discord";
import { NBT } from "./nbt/nbt";
import lang from "./data/lang.json";
import { TAG_Compound } from "./nbt/tags/TAG_Compound";
import { TAG_Tag } from "./nbt/tags/TAG_Tag";
import { ChatInputCommandInteraction } from "discord.js";
import { GetConnected, LinkAccount } from "./database";


interface ConnectionRequest {
  interaction: ChatInputCommandInteraction,
  time: number,
  username: string
}

if(!process.env.LOGIN_NAME || !process.env.LOGIN_TOKEN || !process.env.SERVER_ADDRESS || !process.env.SERVER_PORT){
  throw("Please fillout the .evn file.")
}

export const bot = new MinecraftBot(process.env.LOGIN_NAME, process.env.LOGIN_TOKEN, process.env.SERVER_ADDRESS, Number.parseInt(process.env.SERVER_PORT))

let disconnects = 0;
let maxDisconnects = 20;
let delay = 20;

let connectionRequests: Map<string, ConnectionRequest> = new Map();
let linkedUsers:string[] = [];

bot.on("connected", () => {
  disconnects = 0;
  bot.sendCommand("gamemode spectator");
})

bot.on("disconnected", handleDisconnect)

bot.on("whisper", (senderName: NBT | string, message: string, uuid: Buffer) => {
  if(typeof(senderName) == "string"){
    //Shouldnt be
  }
  else{
    const username = findTagWithName("text", senderName.value)
      ?.value as string;
    
    const uuidString = uuid.toString("hex")

    switch(message){
      default:
        if(connectionRequests.has(message)){
          const req = connectionRequests.get(message);
          
          if(!req) return;
          
          let requestAgeMs =  Date.now() - req.time;
          //5 Min max request age
          if(requestAgeMs / 1000 < 300 && req.username === username){
            req.interaction.followUp("Successfully linked to a Minecraft account `" + username + "`!")
            
            linkedUsers.push(uuidString);
            LinkAccount(uuidString, req.interaction.user.id);
          }
          else{
            console.log("Invalid connection attempt, " + username + " tried to link with code for " + req.username + "!");
          }

          connectionRequests.delete(message);
        }
        break;
    }
  }
})

bot.on("player_chat", (senderName: NBT | string, message: string) => {
  sendServerChat(senderName, message)
})

bot.on("system_chat", (message: NBT | string, isActionbar: boolean) => {
  sendBigBrother(message)
})

async function main() {
  refreshDiscord();
  StartDiscord();

  await SetupData();

  bot.connect()
}

async function SetupData() {
  linkedUsers = await GetConnected();
}

export function AddConnectionRequest(code: string, interaction:ChatInputCommandInteraction, username: string){
  connectionRequests.set(code, {interaction: interaction, time: Date.now(), username: username});
}

function handleDisconnect(){
  disconnects += 1;

  if (disconnects <= maxDisconnects) {
    console.log(
      `Trying to reconnect in ${delay} seconds... (${disconnects}/${maxDisconnects})`
    );
    setTimeout(() => {bot.connect()}, 1000 * delay);
  } else {
    console.log(
      "Stopping after failing to connect in" + disconnects + " tries."
    );
  }
}

function sendServerChat(sender: NBT | string, message: string) {
  let displayName = "error";

  if (typeof sender == "string") {
    displayName = sender;
  } else {
    const name = findTagWithName("text", sender.value);
    displayName = name?.value;
  }

  if (process.env.PUBLICDISCORD) {
    sendChatToChannel(
      process.env.PUBLICDISCORD,
      "<" + displayName + "> " + message
    );
  }
}

function sendBigBrother(data: NBT | string) {
  if (typeof data == "string") {
    console.log("String System Message");
  } else {
    const translation = findTagWithName("translate", data.value)
      ?.value as string;

    //These to server-chat
    if (
      translation === "multiplayer.player.joined" ||
      translation === "multiplayer.player.left"
    ) {
      const formatted = handleTranslation(data.value.value);

      if (process.env.PUBLICDISCORD) {
        sendChatToChannel(process.env.PUBLICDISCORD, formatted);
      }
    }
    //These to big-brother
    else if (
      translation.startsWith("death.") ||
      translation.startsWith("chat.type.advancement")
    ) {
      const formatted = handleTranslation(data.value.value);
      if (process.env.PUBLICDISCORD2) {
        sendChatToChannel(process.env.PUBLICDISCORD2, formatted);
      }
    } else {
      console.log("Skipping " + translation);
    }
  }  
}

function findTagWithName(name: string, tag: TAG_Compound): TAG_Tag | undefined {
  for (const item of tag.value) {
    if (item.name == name) {
      return item;
    }
  }
}

function findTagWithNameList(
  name: string,
  tag: TAG_Tag[]
): TAG_Tag | undefined {
  for (const item of tag) {
    if (item.name == name) {
      return item;
    }
  }
}

function handleTranslation(data: TAG_Tag[]): string {
  let text = findTagWithNameList("text", data);

  if (text) {
    return text.value;
  }

  let current = findTagWithNameList("translate", data)?.value as string;

  //Needs translateing -> Translate
  if (!current.includes("%s")) {
    if (current in lang) {
      current = (lang as Record<string, string>)[current];
    } else {
      console.info("MISSING KEY " + current);
      return "";
    }
  }

  current = current.replace(/%1\$s/g, "%s");

  let fillCount = current.split("%s").length - 1;

  for (let i = 0; i < fillCount; i++) {
    current = current.replace("%s", handleTranslation(data[0].value[i]));
  }

  return current;
}


main();
