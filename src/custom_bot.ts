import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

import { MinecraftBot } from ".";
import { refreshDiscord } from "./discord_refresh";
import { askUserForBox, notifyAboutBrokenContainer, notifyAboutMail, notifyAboutShop, notifyAboutShopWebhook, sendChatToChannel, StartDiscord } from "./discord";
import { NBT } from "./nbt/nbt";
import lang from "./data/lang.json";
import { TAG_Compound } from "./nbt/tags/TAG_Compound";
import { TAG_Tag } from "./nbt/tags/TAG_Tag";
import { ChatInputCommandInteraction } from "discord.js";
import { AddContainerEvent, GetAllBoxes, GetConnected, GetDiscord, GetOwners, LinkAccount, RemoveContainer, UpdateMailbox } from "./database";


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

let potentialContainers: Record<string, number[][]> = {};
let mailboxChanges: Record<string, Record<string, Record<string, number>>> = {};
let mailboxRequesters: string[] = []
let shopRequesters: string[] = []
let checkedLast: Date;

let isNew: boolean = false;

const debugMode = process.env.DEBUG === "true"
const hoursOffset = debugMode ? 0:0;

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
      case "mail": {

        console.log("== Mailbox lookup ==");

        if(linkedUsers.includes(uuidString)){
          potentialContainers[uuidString] = [];
          mailboxRequesters.push(uuidString);

          bot.sendCommand("ledger search action:item-insert after:300s source:" + username);
        }
        else{
          let command = "tellraw " + username + " {\"text\":\"Please link your account to PhoebotJr in discord by direct messaging PhoebotJr /connect\"}";

          bot.sendCommand(command)
        }
        
        break
      } 
      case "shop": {
        console.log("== Shop lookup ==");

        if(linkedUsers.includes(uuidString)){
          potentialContainers[uuidString] = [];
          shopRequesters.push(uuidString);

          bot.sendCommand("ledger search action:item-insert after:300s source:" + username);
        }
        else{
          let command = "tellraw " + username + " {\"text\":\"Please link your account to PhoebotJr in discord by direct messaging PhoebotJr /connect\"}";

          bot.sendCommand(command)
        }
        
        break
      }
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
  if(typeof(message) == "string"){
  }
  else{
    const isText = findTagWithName("text", message.value)

    if(isText){
      //Failed commands etc
    }
    else{
      const translation = findTagWithName("translate", message.value)
      ?.value as string;

      //Ledger data
      if(translation == "text.ledger.action_message"){
        const withList = findTagWithName("with", message.value);

        const username = findTagWithNameList("text", withList?.value[1])?.value as string;
        const uuid = Object.keys(bot.players).find(key => bot.players[key] == username)

        if(!uuid) return;

        const hoverEvent = findTagWithNameList("hover_event", withList?.value[3]);

        if(!hoverEvent) return;

        const item = findTagWithNameList("id", hoverEvent.value);
        let customName = undefined
        
        const itemComponents = findTagWithNameList("components", hoverEvent.value);

        if(itemComponents){
          customName = findTagWithNameList("minecraft:custom_name", itemComponents.value)?.value as string;
        }

        const commandTag = findTagWithNameList("click_event", withList?.value[4]);
        const command = (findTagWithNameList("command", commandTag?.value)?.value as string).split(" ")
        

        const dateComponent = findTagWithNameList("hover_event", withList?.value[0]);
        const dateString = findTagWithNameList("value", dateComponent?.value)?.value as string
        
        let date = new Date(dateString);

        //Minecraft mod gives data in non standard format in my localsetup
        if(debugMode && isNaN(date.getTime())){
          let parts = dateString.split(" ");

          let dateParts = parts[0].split(".").map(Number);
          let timeParts = parts[1].split(".").map(Number);

          date = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1], timeParts[2]);
        }
    
        date.setUTCHours(date.getUTCHours() + hoursOffset);

        isNew = checkedLast <= date;

        let x = parseInt(command[3]);
        let y = parseInt(command[4]);
        let z = parseInt(command[5]);

        //Item insert and Item remove
        const actionString = findTagWithNameList("translate", withList?.value[2])?.value as string;

        if(actionString == "text.ledger.action.item-insert"  || actionString == "text.ledger.action.item-remove"){
          const amountElement = findTagWithNameList("text", withList?.value[3])?.value as string;

          const amount: number = parseInt(amountElement, 10);
          const isItemInsert = actionString === "text.ledger.action.item-insert";
          
          //console.log(amount + " " + item["id"] + " from " + username + " is insert " + isItemInsert);
    
          //Basic container check insert
          if(isNew){
            if(!mailboxChanges[[x,y,z].join(",")]){
              mailboxChanges[[x,y,z].join(",")] = {}
            }
      
            if(!mailboxChanges[[x,y,z].join(",")][username]){
              mailboxChanges[[x,y,z].join(",")][username] = {}
            }
      
            if(!mailboxChanges[[x,y,z].join(",")][username][item?.value] ){
              mailboxChanges[[x,y,z].join(",")][username][item?.value] = 0 
            }

            if(isItemInsert){
              mailboxChanges[[x,y,z].join(",")][username][item?.value] += amount;
              LogAfterUUID(username, `${x},${y},${z}`, item?.value, amount);
            }
            else{
              mailboxChanges[[x,y,z].join(",")][username][item?.value] -= amount;
              LogAfterUUID(username, `${x},${y},${z}`, item?.value, -amount)
            }
          }
    
          //Only custom stuff
          if(item?.value == "minecraft:paper" && customName){
            //Named paper pieces exist here
            if(customName == "mail" || customName == "shop"){
              const isMail = customName == "mail" ? 1 : 0;

              //Parsing time since it was put, 5min limit
              const metadataWithList = findTagWithNameList("with", withList?.value[0]);

              const extraList = findTagWithNameList("extra", metadataWithList?.value[0]);

              const number = extraList?.value[0] as number;
              const unit = extraList?.value[1] as string;

              let valid = false;
    
              if(unit === "m" && number <=5){
                valid = true;
              }
    
              if(unit === "s"){
                valid = true;
              }
              
              if(valid){
                if(!potentialContainers[uuid]){
                  potentialContainers[uuid] = [];
                }
                potentialContainers[uuid].push([x, y, z, isMail]);
              }
              //Register to db linked to user or similar
              //Maybe lookup who placed the chest and according to that see if should be allowed
            }
          }

        }

        else if(actionString === "text.ledger.action.block-place" || actionString === "text.ledger.action.block-break"){
          let isBreak = actionString === "text.ledger.action.block-break"

          const blockNameHover = findTagWithNameList("hover_event", withList?.value[3]);
          const blockName = findTagWithNameList("value", blockNameHover?.value)?.value as string;
          
          if(isNew){
            AddContainerEvent(`${x},${y},${z}`, {type: "block_change", block: blockName, broken: isBreak});
          }

          if(isBreak && isNew){
            console.info("Container " + blockName + " was broken at " + x + " " + y + " " + z);

            if(!mailboxChanges[[x,y,z].join(",")]){
              mailboxChanges[[x,y,z].join(",")] = {}
            }
      
            if(!mailboxChanges[[x,y,z].join(",")]["block"]){
              mailboxChanges[[x,y,z].join(",")]["block"] = {}
            }
      
            if(!mailboxChanges[[x,y,z].join(",")]["block"]["broken"] ){
              mailboxChanges[[x,y,z].join(",")]["block"]["broken"] = 1
            }
          }
        } 
      }

      else if(translation == "text.ledger.footer.search"){
        for(const user in potentialContainers){
          if(potentialContainers[user].length > 0 && (mailboxRequesters.includes(user) || shopRequesters.includes(user))){
            let isMail = mailboxRequesters.includes(user);
            
            ProcessBoxes(user, potentialContainers[user], isMail)

            potentialContainers[user] = [];
            mailboxRequesters = mailboxRequesters.filter(req => req !== user);
            shopRequesters = shopRequesters.filter(req => req !== user);
          }
        }

        // Go to next pages 
        const withList = findTagWithName("with", message.value);

        const nextPageTag = findTagWithNameList("click_event", withList?.value[3])

        if(nextPageTag?.value && isNew){
          let nextPageCommand = findTagWithNameList("command", nextPageTag?.value)?.value as string

          if(nextPageCommand){
            nextPageCommand = nextPageCommand.replace("/", "");

            bot.sendCommand(nextPageCommand)
          }

        }

      }

      else{
        sendBigBrother(message);
      }
    }
  }

})

async function main() {
  refreshDiscord();
  StartDiscord();

  await SetupData();

  bot.connect();

  setInterval(StartContainerCheck, 60*1000);
}

async function SetupData() {
  const uuids = await GetConnected();;

  uuids.forEach(id => {
    let idWithoutDash = id.replace(/-/g, "")
    linkedUsers.push(idWithoutDash)
  });
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
  } 
  else {
    const translation = findTagWithName("translate", data.value)
      ?.value as string;

    if(translation){
       //These to server-chat
      if ( translation === "multiplayer.player.joined" || translation === "multiplayer.player.left") {
        const formatted = handleTranslation(data.value.value);

        if (process.env.PUBLICDISCORD) {
          sendChatToChannel(process.env.PUBLICDISCORD, formatted);
        }
      }
      //These to big-brother
      else if (translation.startsWith("death.") || translation.startsWith("chat.type.advancement")
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

async function ProcessBoxes(uuid: string, candidates: number[][], isMail: boolean){
  let discordId = await GetDiscord(uuid);
  let type = isMail ? 1 : 0

  const seen = new Set<string>();
  //Filter out the duplictes
  candidates = candidates.filter(
    box => {
      const string = JSON.stringify(box);

      const matchesType = box[3] == type

      if(seen.has(string) || !matchesType){
        return false;
      }
      else{
        seen.add(string);
        return true;
      }
    }
  )


  if(candidates.length > 0){
    askUserForBox(discordId, candidates, uuid, isMail);
  }

}


async function StartContainerCheck(){
  if(!bot.connected) return;

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  let boxes = await GetAllBoxes();
  
  console.log("Starting checking " + boxes.length + " containers")

  for(const box of boxes){
    await UpdateMailbox(Date.now() / 1000, box.coordinates)    

    //Clear any previous data
    mailboxChanges[box.coordinates] = {};
    checkedLast = new Date(box.lastchecked);

    bot.sendCommand("ledger inspect " + box.coordinates.replace(/,/g, " "))

    await delay(500);

    let changes = mailboxChanges[box.coordinates]

    if(!changes["block"]){
      let totalByUUid: Record<string, number> = {};

      for(const player of Object.keys(changes)){
        //@ts-ignore
        let uuid = (await (await fetch("https://api.mojang.com/users/profiles/minecraft/" + player)).json()).id ?? "other";
        let formatted_uuid = uuid.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
        
        totalByUUid[formatted_uuid] = 0

        for (const item of Object.keys(changes[player])){
          //db log here
          totalByUUid[formatted_uuid] += Math.abs(changes[player][item])
        }
      }
      
      let owners:string[] = []

      if(Object.keys(changes).length > 0){
        owners = await GetOwners(box.coordinates);
      }
      
      if(!debugMode){
        owners.forEach(owner => {
          totalByUUid[owner] = 0
        });  
       
      }
  
      let sendDiscord = false;
  
      for(const uuid in totalByUUid){
        if(totalByUUid[uuid] != 0){
          sendDiscord = true;
          break;
        }
      }
      
      if(sendDiscord){
        let discordId = await GetDiscord(box.owner);
        console.log("Noticed changes!")
        console.log(JSON.stringify(totalByUUid));
        console.log(changes)
        
        if(box.type == 1){
          AddContainerEvent(box.coordinates, {type: "mail_notification", to: discordId});
          notifyAboutMail(discordId, box.coordinates.replace(/,/g, ", "));
        } 
        else{
          if(box.contact == 2){
            AddContainerEvent(box.coordinates, {type: "shop_notification", to: "webhook"});
            notifyAboutShopWebhook(box.coordinates.replace(/,/g, ", "), changes);
          }
          else{
            AddContainerEvent(box.coordinates, {type: "shop_notification", to: discordId});
            notifyAboutShop(discordId, box.coordinates.replace(/,/g, ", "), changes);
          }
        }

        
      }
    }
    else{
      let discordId = await GetDiscord(box.owner);
      let typestring = box.type == 1 ? "mailbox" : "shop"
      notifyAboutBrokenContainer(discordId, box.coordinates.replace(/,/g, ", "), typestring)
      AddContainerEvent(box.coordinates, {type: "remove_container"});
      RemoveContainer(box.coordinates)
    }
  };
}

async function LogAfterUUID(mcName: string, coordinates: string, itemName: string, amount: number){
  //@ts-ignore
  let uuid = (await (await fetch("https://api.mojang.com/users/profiles/minecraft/" + mcName)).json()).id;

  AddContainerEvent(coordinates, {type: "item_insert", by: uuid, item: itemName, amount: amount});
}


export function HandleShopTranslation(key: string): string{
  let res = "";

  if("block." + key in lang){
    res = (lang as Record<string, string>)["block." + key];
    return res;
  }
  else if("item." + key in lang){
    res = (lang as Record<string, string>)["item." + key];
    return res;
  }
  else{
    console.log("MISSING KEY " + key)
    return ""
  }
}

main();
