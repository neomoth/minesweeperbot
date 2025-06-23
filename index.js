const Client = require('./Client');
const Canvas = require('./Canvas');
const Game = require('./Game');
const {loadCommands, handleCommand} = require("./commandHandler");
require('dotenv').config();

const options = {
	worldX: 728,
	worldY: 119,
	defaultDifficulty: Game.DIFFICULTY.INTERMEDIATE,
}

const store = {
	game: null,
	canvas: null,
	difficulty: options.defaultDifficulty,
}

const client = new Client(options, {
	//world: 'thisisareallystupidtestworldteehee',
	adminlogin: process.env.ADMINPASS,
	reconnect: true,
	unsafe: true,
	// origin: 'https://pre.ourworldofpixels.com',
	// ws: 'wss://pre.ourworldofpixels.com',
	origin: 'https://localhost:8080',
	ws:'ws://localhost:13374?chat=v2'
});

client.bot.on('id', async(id)=>{
	client.bot.world.move(options.worldX,options.worldY);
	console.log("waiting for bot to request all chunks");
	await client.ready;
	await loadCommands();
	console.log("initializing game");
	store.game = new Game(store.difficulty);
	store.canvas = await Canvas.create(client,options.worldX,options.worldY);
	store.canvas.updateCanvas(store.game);
});

client.bot.on('jsonMessage',async(msg)=>{
	console.log(msg.type);
	if(msg.type==='whisperReceived') handleCommand(client, msg);
});

client.bot.on('pixel', async(id,x,y,[r,g,b])=>{
	if(id===client.bot.player.id)return;
	await client.updatePixel(id,x,y,[r,g,b]);
	await checkButton(id,x,y,[r,g,b]);
	await checkTile(id,x,y,[r,g,b]);
	store.canvas.updateCanvas(store.game);
});

async function checkTile(id,x,y,[r,g,b]){
	if(!store.game||id===client.bot.player.id) return;
	if(await store.game.tryClickButton(x, y)) store.canvas.updateCanvas(store.game);
}

async function checkButton(id,x,y,[r,g,b]){
	if(!store.game||id===client.bot.player.id) return;
	const c = store.game.toTileCoords(x,y);
	if(!c) return;
	const tile = store.game.getTile(c[0],c[1]);
	if(!tile) return;
	if(r===0xFF&&g===0xFF&&b===0xFF) store.game.toggleFlagTile(c[0],c[1]);
	else if(tile.revealed) store.game.altRevealAdjacentTiles(c[0],c[1]);
	else store.game.revealTile(c[0],c[1]);
}

client.bot.on('chunk', async(x,y,chunk)=>{
	await client.updateChunk(x,y,chunk);
});