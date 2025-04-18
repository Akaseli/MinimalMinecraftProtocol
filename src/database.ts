import { MentionableSelectMenuInteraction } from "discord.js";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`,
})

type DatabaseResponse = {
  status: boolean, 
  error: string
}

type Container = {
  id: string,
  owner: string,
  type: number,
  coordinates: string,
  contact: number,
  lastchecked: number
}

export async function IsConnected(minecraftUUID: string, discordId: string): Promise<boolean> {

  const result = await pool.query("SELECT * FROM users WHERE mcaccount = $1 OR discordid = $2", [minecraftUUID, discordId]);
 
  return (result.rowCount ?? 0) > 0;
}

export async function GetConnected(): Promise<string[]>{
  let resArray:string[] = []

  const result = await pool.query("SELECT mcaccount FROM users");
  
  result.rows.forEach(row => {
    resArray.push(row.mcaccount);
  });

  return resArray;
}

export async function GetDiscord(uuid:string): Promise<string> {
  const result = await pool.query("SELECT discordid FROM users WHERE mcaccount = $1", [uuid]);

  return result.rows[0].discordid;
}

export async function GetMinecraft(dId:string): Promise<string> {
  const result = await pool.query("SELECT mcaccount FROM users WHERE discordid = $1", [dId]);

  if(result.rowCount ?? 0 > 0 ){
    return result.rows[0]?.mcaccount;
  }
  else{
    return "<error>"
  }
  
}



export async function ClaimContainer(uuid: string, coordinates: string, type: number): Promise<DatabaseResponse>{
  const result = await pool.query("INSERT INTO containers (owner, coordinates, type) VALUES ($1, $2, $3) ON CONFLICT (coordinates) DO NOTHING", [uuid, coordinates, type]);
  if(result.rowCount ?? 0 > 0){
    return {status: true, error: ""}
  }
  //Something not quite right then
  else{
    const owner = await pool.query("SELECT owner FROM containers WHERE coordinates = $1", [coordinates]);

    if(owner.rowCount ?? 0 > 0){
      const existingOwner = owner.rows[0].owner;
      
      if(existingOwner == uuid){
        return {status: false, error: "You already own this container at **[" + coordinates.replace(",", ", ") + "]**."}
      }
      else{
        return {status: false, error: "This container at  **[" + coordinates.replace(",", ", ") + "]** is already owned by a player."}
      }
    }
  }
  return { status: false, error: "Something went wrong so bad I can't even tell you what." };
}

export async function UpdateMailbox(timestamp: number, coordinates: string){
  const reponse = await pool.query("UPDATE containers SET last_checked = to_timestamp($1) WHERE coordinates = $2", [timestamp, coordinates])
}

export async function GetAllBoxes(): Promise<Container[]>{
  const result = await pool.query("SELECT * FROM containers");

  const boxes: Container[] = result.rows.map(row => ({
    id: row.owner + row.coordinates,
    owner: row.owner,
    type: row.type,
    contact: row.contact_type,
    coordinates: row.coordinates,
    lastchecked: row.last_checked
  }))

  return boxes;
}

export async function GetOwners(coordinates: string): Promise<string[]>{
  const result = await pool.query(`SELECT ARRAY[ (SELECT owner FROM containers WHERE coordinates = $1) ] || COALESCE((SELECT array_agg("user")::uuid[] FROM shared_ownership WHERE coordinates = $1), '{}') AS owners`, [coordinates])

  if(result.rowCount ?? 0 > 0){
    return result.rows[0]["owners"];
  }
  else{
    return []
  }
} 


export async function AddContainerEvent(coordinates: string, event: any){
  const result = await pool.query("INSERT INTO container_events(coordinates, event) VALUES ($1, $2)", [coordinates, event])
}

export async function RemoveContainer(coordinates: string) {
  const result = await pool.query("DELETE FROM containers WHERE coordinates = $1", [coordinates])
}

export async function GetWebhookUrl(coordinates: string): Promise<string>{
  const result = await pool.query("SELECT * FROM contact WHERE coordinates = $1", [coordinates]);
  if (result.rowCount ?? 0 > 0){
    return result.rows[0]["webhook_url"];
  }
  else{
    return "";
  }
}

//Should probably be async to properly tell the user if it fails
export function LinkAccount(minecraftUUID: string, discordId: string){
  pool.query("INSERT INTO users(mcaccount, discordid) VALUES ($1, $2)", [minecraftUUID, discordId], (err, result) => {
    if(err){
      throw err;
    }

    console.log("Linked account " + minecraftUUID + " to " + discordId);
  })
}