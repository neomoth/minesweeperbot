const Client = require('./Client');
const Canvas = require('./Canvas');
const Game = require('./Game');
const {loadCommands, handleCommand} = require("./commandHandler");
const {events} = require("./util");
require('dotenv').config();

(async()=>{
	const options = {
		worldX: 318,
		worldY: -610,
		defaultDifficulty: Game.DIFFICULTY.INTERMEDIATE,
	}

	const store = {
		game: null,
		canvas: null,
		difficulty: options.defaultDifficulty,
		cooldowns:{},
		genTimeout:(cb, ms)=>{
			const start = Date.now();
			const id = setTimeout(cb,ms);
			return{
				timeLeft: ()=>Math.max(0,ms-(Date.now()-start)),
				clear:()=>clearTimeout(id),
				id
			}
		},
		addCooldown:(id, type, ms)=>{
			if(!store.cooldowns[id]) this.cooldowns[id]={};
			store.cooldowns[id][type] = ms;
			store.cooldowns[id][`${type}_timer`] = store.genTimeout(()=>{
				store.cooldowns[id][`${type}_timer`] = null;
				store.cooldowns[id][type] = 0;
			},ms);
		},
		getCooldown:(id, type)=>{
			if(!store.cooldowns[id]) this.cooldowns[id]={};
			return store.cooldowns[id][type]??null;
		},
		onCooldown:(id, type)=>{
			if(!store.cooldowns[id]) store.cooldowns[id]={};
			return store.cooldowns[id][type]!==null?store.cooldowns[id][type]>0:false;
		},
		extendCooldown:(id, type, ms)=>{
			if(!store.cooldowns[id]) store.cooldowns[id]={};
			const timeLeft = store.cooldowns[id][`${type}_timer`].timeLeft();
			store.cooldowns[id][`${type}_timer`].clear();
			delete store.cooldowns[id][`${type}_timer`];
			store.cooldowns[id][`${type}_timer`] = store.genTimeout(()=>{
				store.cooldowns[id][`${type}_timer`] = null;
				store.cooldowns[id][type] = 0;
			},timeLeft+ms);
		},
		rmCooldown:(id, type)=>{
			if(!store.cooldowns[id]) store.cooldowns[id]={};
			store.cooldowns[id][type]=0;
		}
	}

	const client = new Client(options, {
		//world: 'thisisareallystupidtestworldteehee',
		adminlogin: process.env.ADMINPASS,
		reconnect: true,
		noLog: process.env.LOGGING !== "true",
		unsafe: true,
		// origin: 'https://pre.ourworldofpixels.com',
		// ws: 'wss://pre.ourworldofpixels.com',
		origin: process.env.ORIGIN,
		ws:process.env.WS,
		world:process.env.WORLD,
		chatProtocol: process.env.PROTOCOL,
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
		if(store.game.activePlayer!==null&&id!==store.game.activePlayer) return;
		const buttons = store.game.getButtonsAtPos(x,y);
		if(buttons.some(btn=>btn.id.includes('theme'))) {
			// if(store.onCooldown(id,"theme_button")){
			// 	store.extendCooldown(id,"theme_button", 200);
			// 	return;
			// }
			if(store.onCooldown(id,"theme_button")) return;
			store.addCooldown(id,"theme_button",800);
			if(await store.game.tryClickButton(x, y, id)) store.canvas.updateCanvas(store.game);
			return;
		}
		// if(store.onCooldown(id,"button")) {
		// 	store.extendCooldown(id,"button", 10);
		// 	return;
		// }
		if(store.onCooldown(id,"button")) return;
		store.addCooldown(id,"button",20);
		if(await store.game.tryClickButton(x, y, id)) store.canvas.updateCanvas(store.game);
	}

	async function checkTile(id,x,y,[r,g,b]){
		if(!store.game||id===client.bot.player.id) return;
		if(store.game.activePlayer!==null&&id!==store.game.activePlayer) return;
		const c = store.game.toTileCoords(x,y);
		if(!c) return;
		const tile = store.game.getTile(c[0],c[1]);
		if(store.onCooldown(id,`tile_${c[0]}_${c[1]}`)) return;
		console.log(`no cooldown on tile ${c[0]},${c[1]}`);
		if(!tile) return;
		if(r===0xFF&&g===0xFF&&b===0xFF && !tile.revealed) store.game.toggleFlagTile(c[0],c[1]);
		else if(tile.revealed) store.game.altRevealAdjacentTiles(c[0],c[1]);
		else store.game.revealTile(c[0],c[1]);
		store.addCooldown(id, `tile_${c[0]}_${c[1]}`,store.game.getPlayerConfig(id,'tileDelay'));
	}

	client.bot.on('chunk', async(x,y,chunk)=>{
		await client.updateChunk(x,y,chunk);
	});
})();