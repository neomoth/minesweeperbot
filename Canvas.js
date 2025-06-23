const {createCanvas, loadImage} = require('canvas');
const Game = require('./Game');
const path = require('path');
const { CONSTANTS, events } = require('./util');

class Canvas {
	constructor(client, x, y, assetPath = './assets'){
		this.client = client;
		this.assets = assetPath;
		this.tileSize = 9;
		this.images = {};
		this.ox = x;
		this.oy = y;
		this.ocx = Math.floor(x/16);
		this.ocy = Math.floor(y/16);

		this.canvas = createCanvas(CONSTANTS.WIDTH,CONSTANTS.HEIGHT);
		this.buffer = createCanvas(CONSTANTS.WIDTH,CONSTANTS.HEIGHT);
		this.btx = this.buffer.getContext('2d');
		this.ctx = this.canvas.getContext('2d');

		this.images = {};
		events.on('worldupdate',(x,y)=>{
			return this.updateChunks(x,y);
		});
	}

	static async create(client,x,y,assetPath='./assets'){
		const canvas = new Canvas(client,x,y,assetPath);
		await canvas.init();
		return canvas;
	}

	async init(){
		await this.loadAssets();
		this.clearCanvas();
		this.drawTitle();
	}

	async loadAssets() {
		const assets = ['tiles','numbers','numbers-id','buttons','buttons-disabled','buttons-selected','statuses','title'];
		for(const asset of assets) {
			console.log(`loading asset ${asset}`);
			const img = await loadImage(path.join(this.assets, `${asset}.png`));
			const canvas = createCanvas(img.width, img.height);
			const ctx = canvas.getContext('2d');
			ctx.drawImage(img,0,0);
			this.images[asset]=canvas;
			console.log(this.images[asset]);
		}
	}

	clearCanvas(){
		this.ctx.fillStyle='#bbbbbb';
		this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
		this.ctx.strokeStyle='#999999';
		this.ctx.strokeRect(0,0,this.canvas.width,this.canvas.height);
		this.btx.drawImage(this.canvas,0,0);
	}

	drawTile(x,y,tile){
		let row = 0;
		let idx = 0;
		if(tile.revealed){
			if(tile.hasMine){
				if(tile.game.state===Game.STATE.FAIL&&tile.wasKillTile) idx=4;
				else idx=2;
			}
			else{
				row=1;
				idx=tile.adjacentMines;
			}
		}
		else if(tile.flagged){
			if(tile.game.state===Game.STATE.FAIL&&!tile.hasMine) idx=3;
			else idx=1;
		}
		else idx=0;

		const offX = Math.floor(((this.canvas.width-tile.game.width*9)+tile.game.width)/2);
		const offY = Math.floor(((this.canvas.height-tile.game.width*9)+tile.game.height))-8;

		tile.game.bOffX = this.ox+offX;
		tile.game.bOffY = this.oy+offY;

		tile.worldX = this.ox+offX+(x*8)+1;
		tile.worldY = this.oy+offY+(y*8)+1;

		this.ctx.drawImage(this.images['tiles'],idx*8,row*8, 9, 9, offX+x*8, offY+y*8, 9, 9);
	}

	drawTitle(){
		this.ctx.drawImage(this.images['title'],Math.floor((this.canvas.width/2)-(this.images['title'].width/2)),2);
	}

	drawButton(button){
		let spritesheet = button.disabled ? this.images['buttons-disabled'] : button.selected ? this.images['buttons-selected'] : this.images['buttons'];
		switch(button.id){
			case 'startbtn':{
				button.w=40;
				button.h=21;
				button.x=Math.floor((this.canvas.width/2)-(button.w/2));
				button.y=25;
				this.ctx.drawImage(spritesheet,0,0,button.w,button.h,button.x,button.y,button.w,button.h);
				break;
			}
			case 'quitbtn':{
				button.w=33;
				button.h=21;
				button.x=Math.floor((this.canvas.width/2)-(button.w/2));
				button.y=45;
				this.ctx.drawImage(spritesheet,0,21,button.w,button.h,button.x,button.y,button.w,button.h);
				break;
			}
			case 'beginnerbtn':{
				button.w=62;
				button.h=21;
				button.x=2;
				button.y=2;
				this.ctx.drawImage(spritesheet,0,42,button.w,button.h,button.x,button.y,button.w,button.h);
				break;
			}
			case 'intermediatebtn':{
				button.w=90;
				button.h=21;
				button.x=2;
				button.y=23;
				this.ctx.drawImage(spritesheet,0,63,button.w,button.h,button.x,button.y,button.w,button.h);
				break;
			}
			case 'expertbtn':{
				button.w=47;
				button.h=21;
				button.x=2;
				button.y=44;
				this.ctx.drawImage(spritesheet,0,84,button.w,button.h,button.x,button.y,button.w,button.h);
				break;
			}
		}
	}

	updateCanvas(game){
		game.offX=this.ox;
		game.offY=this.oy;
		for(let y = 0;y<game.board.length;y++){
			for(let x=0;x<game.board[y].length;x++){
				this.drawTile(x,y,game.getTile(x,y));
			}
		}
		for(let button of game.buttons){
			this.drawButton(button);
		}
		return this.updateWorld();
	}

	updatePixel(x,y){
		const cx = x-this.ox;
		const cy = y-this.oy;

		if(cx<0||cy<0||cx>=this.canvas.width||cy>=this.canvas.height) return;

		const clr = this.ctx.getImageData(cx,cy,1,1).data;
		this.client.bot.world.setPixel(x,y,[clr[0],clr[1],clr[2]],true);
	}

	async updateChunks(cx,cy){
		console.log(`[updateChunks] Worldupdate triggered chunk (${cx},${cy})`);
		if(!this.client.chunks.get(cy)?.get(cx)) return;
		const width = this.canvas.width;
		const height = this.canvas.height;
		const idat = this.ctx.getImageData(0,0,width,height).data;

		// console.log("yeppers ",cx,cy);
		await this.processChunk(cx,cy,idat,width,height);
	}

	async updateWorld(){
		console.log(`[updateWorld] Full canvas update triggered`);
		const width = this.canvas.width;
		const height = this.canvas.height;
		const chs = 16;

		const scx = Math.floor(this.ox/chs);
		const ecx = Math.floor((this.ox + width - 1) / chs);
		const scy = Math.floor(this.oy / chs);
		const ecy = Math.floor((this.oy + height - 1) / chs);

		const idat = this.ctx.getImageData(0,0,width,height).data;

		const chunks = [];

		for (let cy = scy; cy <= ecy; cy++) {
			for (let cx = scx; cx <= ecx; cx++) {
				if(!this.client.chunks.get(cy)?.get(cx)) continue;

				chunks.push(this.processChunk(cx, cy, idat, width, height));
			}
		}

		await Promise.all(chunks);
	}

	async processChunk(cx,cy,idat,width,height){
		// console.log([processChunk] Processing chunk (${cx},${cy}));
		const chs=16;
		const existingChunk = this.client.chunks.get(cy)?.get(cx);
		const cd = existingChunk?.slice() || new Uint8Array(CONSTANTS.CHUNKBITS).fill(0xFF);

		const wx = cx*chs;
		const wy = cy*chs;

		const canvasSX = Math.max(0, wx - this.ox);
		const canvasSY = Math.max(0, wy - this.oy);
		const canvasEX = Math.min(width, wx + chs - this.ox);
		const canvasEY = Math.min(height, wy + chs - this.oy);

		let pixelUpdates = [];
		let chunkModified = false;

		for(let y = canvasSY;y<canvasEY;y++){
			for (let x=canvasSX;x<canvasEX;x++){
				const chunkX=(this.ox+x)-wx;
				const chunkY=(this.oy+y)-wy;
				const chunkPos=(chunkY*chs+chunkX)*3;
				const canvasPos=(y*width+x)*4;

				const r=idat[canvasPos];
				const g=idat[canvasPos+1];
				const b=idat[canvasPos+2];

				// console.log("update: ", Date.now());
				// console.log(r,g,b);
				// console.log(cd[chunkPos],cd[chunkPos+1],cd[chunkPos+2]);

				if(cd[chunkPos]!==r||cd[chunkPos+1]!==g||cd[chunkPos+2]!==b){
					// console.log(Mismatch at ${this.ox + x},${this.oy + y});
					// console.log(Canvas: ${r},${g},${b} | Chunk: ${cd[chunkPos]},${cd[chunkPos+1]},${cd[chunkPos+2]});
					cd[chunkPos]=r;
					cd[chunkPos+1]=g;
					cd[chunkPos+2]=b;
					pixelUpdates.push([this.ox+x,this.oy+y,[r,g,b]]);
					chunkModified = true;
				}
			}
		}

		if(chunkModified){
			this.client.chunks.get(cy)?.set(cx,cd);
			if(pixelUpdates.length>=64||pixelUpdates.length>=(canvasEX-canvasSX)*(canvasEY-canvasSY)*0.75){
				this.client.bot.world.setChunk(cx,cy,cd);
				// this.client.queueChunk(cx,cy,cd);
			}
			else{
				const pixelPromises = pixelUpdates.map(async ([px, py, clr]) => {
					this.client.bot.world.setPixel(px, py, clr);
					// this.client.queuePixel(px,py,clr);
				});
				return Promise.all(pixelPromises);
			}
		}
	}
}
module.exports = Canvas;