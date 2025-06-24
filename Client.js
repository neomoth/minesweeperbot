const OJS = require('nm-owop-js');
const { CONSTANTS, events } = require('./util.js');

class Client{
	botChunks = new Set();
	chunks = new Map();
	#resolveReady = null;
	#pixelQueue = [];
	#chunkQueue = [];
	#debounce = null;
	constructor(pgopts, clopts){
		clopts = {
			...clopts,
			headers:{
				'User-Agent': 'OWOPJS-Minesweeper/1.0',
				'bot-identifier': 'minesweeper',
				'bot-secret': process.env.SECRET,
			}
		}
		this.bot = new OJS.Client(clopts);
		this.ready = new Promise(res=>{
			this.#resolveReady = res;
		});
		this.bot.on('id', async(id)=>{
			await this.initChunks(pgopts);
			// this.#resolveReady();

			this.interval = setInterval(()=>{
				if(this.#pixelQueue.length > 0){
					const [x,y,clr] = this.#pixelQueue.shift();
					this.bot.world.setPixel(x,y,clr,true);
				}
				if(this.#chunkQueue.length > 0){
					const [x,y,data] = this.#chunkQueue.shift();
					const key = `${x},${y}`;
					this.botChunks.add(key);
					this.bot.world.setChunk(x,y,data);
				}
				// console.log(this.#pixelQueue.length);
			}, 5);
		});

		this.bot.on('close', ()=>{
			clearInterval(this.interval);
		});
	}

	async initChunks(options){
		console.log("initializing chunks");
		const chs = 16;
		const scx = Math.floor(options.worldX/chs);
		const scy = Math.floor(options.worldY/chs);
		const ecx = Math.floor((options.worldX+CONSTANTS.WIDTH-1)/chs);
		const ecy = Math.floor((options.worldY+CONSTANTS.HEIGHT-1)/chs);

		const requests = [];
		for(let cy=scy;cy<=ecy;cy++){
			for(let cx=scx;cx<=ecx;cx++){
				console.log(`requesting chunk (${cx},${cy}).`);
				requests.push(this.loadChunkData(cx,cy));
			}
		}

		await Promise.all(requests);
		events.emit('chunksLoaded');
	}

	async loadChunkData(cx,cy){
		try{
			const chunk = await this.bot.world.requestChunk(cx,cy);
			if(!this.chunks.has(cy)) this.chunks.set(cy, new Map());
			this.chunks.get(cy).set(cx, chunk?.slice()||new Uint8Array(CONSTANTS.CHUNKBITS).fill(0xFF));
		}catch(e){
			console.error(`failed to load chunk (${cx},${cy}). `, e);
			if(!this.chunks.has(cy)) this.chunks.set(cy, new Map());
			this.chunks.get(cy).set(cx, new Uint8Array(CONSTANTS.CHUNKBITS).fill(0xFF));
		}
	}

	async updatePixel(id, x,y,[r,g,b]){
		const chs = 16;
		const cx = Math.floor(x/chs);
		const cy = Math.floor(y/chs);

		const chunk = this.chunks.get(cy)?.get(cx);
		if(!chunk) return;

		const localX = x - cx * chs;
		const localY = y - cy * chs;
		const idx = (localY * chs + localX) * 3;

		chunk[idx] = r;
		chunk[idx+1] = g;
		chunk[idx+2] = b;
		if(id!==this.bot.player.id) events.emit('worldupdate',cx,cy);
	}

	async updateChunk(x,y,data){
		const row = this.chunks.get(y);
		if(!row?.has(x)) return;
		row.set(x,data.slice());

		const key = `${x},${y}`;
		if(this.botChunks.has(key)) return this.botChunks.delete(key);

		events.emit('worldupdate',x,y);
	}

	queuePixel(x,y,clr){
		this.#pixelQueue.push([x,y,clr]);
	}

	queueChunk(x,y,data){
		this.#chunkQueue.push([x,y,data]);
	}

	tellPlayer(id, message){
		this.bot.chat.send(`/tellraw ${id} ${message}`);
	}
}
module.exports = Client;