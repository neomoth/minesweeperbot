const Client = require('./Client');
const Canvas = require('./Canvas');
const Game = require('./Game');
const {loadCommands, handleCommand} = require("./commandHandler");
const {events} = require("./util");
require('dotenv').config();

(async()=>{
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
		origin: process.env.ORIGIN,
		ws:process.env.WS,
		world:process.env.WORLD,
	});

	await loadCommands();

	client.bot.on('id', async(id)=>{
		client.bot.world.move(options.worldX,options.worldY);
		// await client.ready;
	});

	events.on('chunksLoaded',async()=>{
		if(store.game&&store.canvas){
			if(!(store.game.activePlayer in client.bot.players)) return;
			setTimeout(()=>{
				store.game.quit();
				store.canvas.updateCanvas(store.game);
			},150);
		}
		if(!store.game) store.game = new Game(store.difficulty);
		if(!store.canvas) store.canvas = await Canvas.create(client,options.worldX,options.worldY);
		store.canvas.updateCanvas(store.game);
	});

	client.bot.on('disconnect', async(player)=>{
		if(parseInt(player.id)!==store.game.activePlayer) return;
		store.game.quit();
		store.canvas.updateCanvas(store.game);
	});

	client.bot.on('jsonMessage',async(msg)=>{
		// console.log(msg.type);
		if(msg.type==='whisperReceived') handleCommand(client, store.game, msg);
	});

	client.bot.on('pixel', async(id,x,y,[r,g,b])=>{
		if(id===client.bot.player.id)return;
		await checkButton(id,x,y,[r,g,b]);
		await checkTile(id,x,y,[r,g,b]);
		store.canvas.updateCanvas(store.game);
		await client.updatePixel(id,x,y,[r,g,b]);
	});

	async function checkButton(id,x,y,[r,g,b]){
		if(!store.game||id===client.bot.player.id) return;
		if(await store.game.tryClickButton(x, y, id)) store.canvas.updateCanvas(store.game);
	}

	async function checkTile(id,x,y,[r,g,b]){
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
})();