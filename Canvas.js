const {createCanvas, loadImage} = require('canvas');
const Game = require('./Game');
const path = require('path');
const { CONSTANTS, events } = require('./util');

class Canvas {
	constructor(client, x, y, assetPath = 'assets'){
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
		this.theme='';
		events.on('worldupdate',(x,y)=>{
			return this.updateChunks(x,y);
		});
		events.on('secondElapsed',(game)=>{
			this.drawTimer(game);
			return this.updateCanvas(game);
		});
		events.on('themeChange',(theme)=>{
			if(theme===Game.THEME.LIGHT) this.theme='';
			if(theme===Game.THEME.DARK) this.theme='-dark';
		});

		this.debug = false;
		this.debugInterval = null;
	}

	static async create(client,x,y,assetPath='assets'){
		const canvas = new Canvas(client,x,y,assetPath);
		await canvas.init();
		return canvas;
	}

	async init(){
		this.clearCanvas();
		this.ctx.font = "28px Arial";
		this.ctx.imageSmoothingEnabled = false;
		this.ctx.fillText("loading...",0,0);
		await this.loadAssets();
	}

	async loadAssets() {
		const assets = [
			'tiles','numbers','numbers-id','buttons','buttons-disabled','buttons-selected','statuses','title','cmd','flag',
			'tiles-dark','numbers-dark','numbers-id-dark','buttons-dark','buttons-disabled-dark','buttons-selected-dark','statuses-dark','title-dark','cmd-dark','flag-dark'
		];
		for(const asset of assets) {
			// console.log(`loading asset ${asset}`);
			const img = await loadImage(path.join(__dirname, this.assets, `${asset}.png`));
			const canvas = createCanvas(img.width, img.height);
			const ctx = canvas.getContext('2d');
			ctx.drawImage(img,0,0);
			this.images[asset]=canvas;
			// console.log(this.images[asset]);
		}
	}

	clearCanvas(){
		let bgclr='#bbbbbb';
		let outclr='#999999';
		if(this.theme==='-dark'){
			bgclr='#5f5f5f';
			outclr='#5a5a5a';
		}
		this.ctx.fillStyle=bgclr;
		this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
		this.ctx.strokeStyle=outclr;
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
		const offY = Math.floor(((this.canvas.height-tile.game.height*9)+tile.game.height)/2)+this.canvas.height/8;
		// const offY = Math.floor(((this.canvas.height/2-(tile.game.height)*9)+tile.game.height))-8;

		tile.game.bOffX = this.ox+offX;
		tile.game.bOffY = this.oy+offY-1;

		tile.worldX = this.ox+offX+(x*8)+1;
		tile.worldY = this.oy+offY+(y*8)+1;

		this.ctx.drawImage(this.images['tiles'+this.theme],idx*8,row*8, 9, 9, offX+x*8, offY+y*8, 9, 9);
	}

	drawTimer(game){
		this.drawNumber(this.canvas.width-6,2,game.elapsedSeconds,'right');
		// const time = game.elapsedSeconds;
		// const str = time.toString().split('').reverse().join('');
		// const length = str.length;
		// for(let i=0;i<length;i++){
		// 	this.ctx.drawImage(this.images['numbers'],4*parseInt(str[i]),0,4,6,this.canvas.width-6-((length+2)*i),2,4,6);
		// }
	}

	drawFlagCount(game){
		this.drawNumber(game.bOffX-this.ox+(game.width*8)-10, game.bOffY-this.oy-6, game.mines-game.flagsPlaced,'right');
		this.ctx.drawImage(this.images['flag'+this.theme],game.bOffX-this.ox+(game.width*8)-5, game.bOffY-this.oy-6)
	}

	drawStatus(game){
		const img = this.images['statuses'+this.theme]
		let width=0;
		switch(game.state){
			case Game.STATE.IDLE:{
				width=55;
				break;
			}
			case Game.STATE.PLAYING:{
				width=70;
				break;
			}
			case Game.STATE.WIN:{
				width=61;
				break;
			}
			case Game.STATE.FAIL:{
				width=64;
				break;
			}
			case Game.STATE.QUIT:{
				width=55;
				break;
			}
		}
		this.ctx.drawImage(img,0,6*game.state,width,6,this.canvas.width-2-width,this.canvas.height-8,width,6);
	}

	drawActiveID(game) {
		const str = game.activePlayer === null ? "[---]" : `[${game.activePlayer}]`;
		this.drawNumber(Math.floor(this.canvas.width / 2), 64, str, 'center','numbers-id'+this.theme);
	}

	drawNumber(x, y, number, align = 'right', override=null) {
		const str = number.toString();
		const digitWidth = 4;
		const digitHeight = 6;
		const totalWidth = str.length * digitWidth;

		let startX;

		switch (align) {
			case 'left':
				startX = x;
				break;
			case 'center':
				startX = Math.floor(x - totalWidth / 2);
				break;
			case 'right':
			default:
				startX = x - totalWidth + digitWidth;
				break;
		}

		for (let i = 0; i < str.length; i++) {
			let char = str[i];
			let digit;
			if (char === '[') digit = 10;
			else if (char === ']') digit = 11;
			else if (char === '-') digit = 12;
			else digit = parseInt(char);

			if (isNaN(digit)) continue; // Skip invalid chars

			this.ctx.drawImage(
				this.images[override??'numbers'+this.theme],
				digit * digitWidth, 0,
				digitWidth, digitHeight,
				startX + i * digitWidth, y,
				digitWidth, digitHeight
			);
		}
	}

	drawStatic(){
		this.ctx.drawImage(this.images['title'+this.theme],Math.floor((this.canvas.width/2)-(this.images['title'+this.theme].width/2)),2);
		if(this.client.protocol==='v2') this.ctx.drawImage(this.images['cmd'+this.theme],2,this.canvas.height-this.images['cmd'+this.theme].height-2);
	}

	drawButton(button){
		let spritesheet = button.disabled ? this.images['buttons-disabled'+this.theme] : button.selected ? this.images['buttons-selected'+this.theme] : this.images['buttons'+this.theme];
		switch(button.id){
			case 'startbtn':{
				button.w=40;
				button.h=21;
				button.x=Math.floor((this.canvas.width/2)-(button.w/2));
				button.y=20;
				this.ctx.drawImage(spritesheet,0,0,button.w,button.h,button.x,button.y,button.w,button.h);
				break;
			}
			case 'quitbtn':{
				button.w=33;
				button.h=21;
				button.x=Math.floor((this.canvas.width/2)-(button.w/2));
				button.y=41;
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
				if(button.game.deathShown) break;
				button.w=47;
				button.h=21;
				button.x=2;
				button.y=44;
				this.ctx.drawImage(spritesheet,0,84,button.w,button.h,button.x,button.y,button.w,button.h);
				break;
			}
			case 'deathbtn':{
				if(!button.game.deathShown) break;
				button.w=70;
				button.h=21;
				button.x=2;
				button.y=44;
				this.ctx.drawImage(spritesheet,0,105,button.w,button.h,button.x,button.y,button.w,button.h);
				break;
			}
			case 'themelightbtn':{
				if(button.game.theme!==Game.THEME.LIGHT) break;
				button.w=56;
				button.x=2;
				button.h=6;
				button.y=this.canvas.height-button.h-2-(this.client.protocol==="v2"?7:0);
				this.ctx.drawImage(spritesheet,0,126,button.w,button.h,button.x,button.y,button.w,button.h);
				break;
			}
			case 'themedarkbtn':{
				if(button.game.theme!==Game.THEME.DARK) break;
				button.w=51;
				button.h=6;
				button.y=this.canvas.height-button.h-2-(this.client.protocol==="v2"?7:0);
				button.x=2;
				this.ctx.drawImage(spritesheet,0,126,button.w,button.h,button.x,button.y,button.w,button.h);
				break;
			}
		}
	}

	updateCanvas(game){
		game.offX=this.ox;
		game.offY=this.oy;
		this.clearCanvas();
		this.drawStatic();
		for(let y = 0;y<game.board.length;y++){
			for(let x=0;x<game.board[y].length;x++){
				this.drawTile(x,y,game.getTile(x,y));
			}
		}
		for(let button of game.buttons){
			this.drawButton(button);
		}
		this.drawTimer(game);
		this.drawFlagCount(game);
		this.drawStatus(game);
		this.drawActiveID(game);
		if(this.debug){
			if(this.debugInterval===null) this.debugInterval = setInterval(()=>{this.updateCanvas(game)}, 10);
			this.drawDebug(game);
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
		//console.log(`[updateChunks] Worldupdate triggered chunk (${cx},${cy})`);
		if(!this.client.chunks.get(cy)?.get(cx)) return;
		const width = this.canvas.width;
		const height = this.canvas.height;
		const idat = this.ctx.getImageData(0,0,width,height).data;

		// console.log("yeppers ",cx,cy);
		await this.processChunk(cx,cy,idat,width,height);
	}

	async updateWorld(){
		//console.log(`[updateWorld] Full canvas update triggered`);
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
					this.client.bot.world.setPixel(px, py, clr, true);
					// this.client.queuePixel(px,py,clr);
				});
				return Promise.all(pixelPromises);
			}
		}
	}

	drawDebug(game){
		if(this.debug){
			// rgb are 0-255 pretty please
			const pixel = (x,y,[r,g,b])=>{
				r = r.toString(16).padStart(2, '0');
				g = g.toString(16).padStart(2, '0');
				b = b.toString(16).padStart(2, '0');
				this.ctx.fillStyle = `#${r}${g}${b}`;
				this.ctx.fillRect(x,y,1,1);
			}

			const px = this.canvas.width-108;
			const py = 34;

			const ctv = (a,b,c,v)=>{
				if(b===c)return 0;
				return Math.round(((a-b)/(c-b))*v);
			}

			const gstate =
				game.state===Game.STATE.IDLE ? [0xFF,0x77,0x00] :
					game.state===Game.STATE.PLAYING ? [0xFF,0xFF,0x00] :
						game.state===Game.STATE.QUIT ? [0xA5,0x12,0x83] :
							game.state===Game.STATE.WIN ? [0x33,0xFF,0x66] : [0xFF,0x00,0x00]; //last state fail

			/*
			* this.selected = false;
			* this.disabled = false;
			* this.passthrough = false;
			* this.ignore = false;
			*/
			const btnstates = [];
			const clrs = {
				selected: {
					true: [0x00,0xFF,0x00],
					false: [0xFF,0x00,0x00],
				},
				disabled: {
					true: [0xFF,0x00,0x33],
					false: [0x44,0x44,0x44],
				},
				passthrough: {
					true: [0x88,0x88,0x00],
					false: [0x44,0x44,0x44],
				},
				ignore:{
					true: [0x00,0xFF,0xFF],
					false: [0x44,0x44,0x44],
				},
			}
			game.buttons.forEach(btn=>{
				btnstates.push({
					selected: clrs.selected[btn.selected.toString()],
					disabled: clrs.disabled[btn.disabled.toString()],
					passthrough: clrs.passthrough[btn.passthrough.toString()],
					ignore: clrs.ignore[btn.passthrough.toString()],
					clicks: btn.clicks!==undefined ? [0x44,ctv(btn.clicks,0,10,0xFF),0x44] : null,
					button: btn,
				});
			});
			pixel(px,py-1,gstate);
			for(let i=0;i<btnstates.length;i++){
				pixel(px+i,py,btnstates[i].selected);
				pixel(px+i,py+1,btnstates[i].disabled);
				pixel(px+i,py+2,btnstates[i].passthrough);
				pixel(px+i,py+3,btnstates[i].ignore);
				if(btnstates[i].clicks!==null){
					for(let j=0;j<10;j++){
						// console.log(btnstates[i].clicks>=j, btnstates[i].clicks, j);
						pixel(px+j,py+5,btnstates[i].button.clicks>j?btnstates[i].clicks:[0x44,0x44,0x44]);
					}
				}
			}
		}
	}
}
module.exports = Canvas;