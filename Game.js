const fs = require('node:fs');
const path = require('node:path');
const { events } = require('./util');

class Button{
	constructor(game, id, callbacks){
		this.id = id;
		this.game = game;
		//xywh set by canvas
		this.x = 0;
		this.y = 0;
		this.w = 0;
		this.h = 0;
		this.selected = false;
		this.disabled = false;
		this.passthrough = false;
		this.ignore = false;
		this.type=0;
		if(callbacks.onClick) this.onClick = (id)=> callbacks.onClick(this, id);
		if(callbacks.onFail) this.onFail = ()=> callbacks.onFail(this);
		if(callbacks.onStart) this.onStart = ()=> callbacks.onStart(this);
		if(callbacks.onWin) this.onWin = ()=> callbacks.onWin(this);
		if(callbacks.onEnd) this.onEnd = ()=> callbacks.onEnd(this);
		if(callbacks.onInit) this.onInit = ()=> callbacks.onInit(this);
		if(callbacks.onQuit) this.onQuit = ()=> callbacks.onQuit(this);
	}
}

class Game{
	offX=0;
	offY=0;
	selectedDifficultyButton=null;
	deathShown=false;
	static DIFFICULTY = {
		BEGINNER:0,
		INTERMEDIATE:1,
		EXPERT:2,
		SUICIDAL:3,
	}
	static STATE = {
		IDLE:0,
		PLAYING:1,
		WIN:2,
		FAIL:3,
		QUIT:4,
	}
	static THEME = {
		LIGHT:0,
		DARK:1,
	}
	constructor(difficulty){
		this.difficulty = difficulty;
		this.theme = Game.THEME.LIGHT;
		this.generateButtons();
		this.buttons.forEach(btn=>{
			if(btn.onInit) btn.onInit();
		});
		// for use once uvias implemented and can remember usernames
		// const p = path.join(__dirname,'playerconf.json');
		// if(fs.existsSync(p)) this.playerConf = JSON.parse(p);
		// else this.playerConf = {};
		this.playerConf = {};

		this.init();
	}

	init(){
		switch(this.difficulty){
			case Game.DIFFICULTY.BEGINNER:{
				this.width=9;
				this.height=9;
				this.mines=10;
				break;
			}
			case Game.DIFFICULTY.INTERMEDIATE:{
				this.width=16;
				this.height=16;
				this.mines=40;
				break;
			}
			case Game.DIFFICULTY.EXPERT:{
				this.width=30;
				this.height=16;
				this.mines=99;
				break;
			}
			case Game.DIFFICULTY.SUICIDAL:{
				this.width=34;
				this.height=16;
				this.mines=240;
				break;
			}
		}
		this.firstClick = true;
		this.state = Game.STATE.IDLE;
		this.flagsPlaced=0;
		this.timer = null;
		this.elapsedSeconds = 0;
		this.generateBoard();
		this.activePlayer=null;
	}

	generateButtons(){
		this.buttons = [
			new Button(this,'startbtn',{
				onClick:(btn,id)=>{
					if(btn.disabled||btn.selected) return;
					btn.selected=true;
					btn.game.buttons.find(b=>b.id==='expertbtn').clicks=0;
					if(btn.game.state!==Game.STATE.IDLE) btn.game.init();
					this.start(id);
				},
				onEnd:(btn)=>{
					btn.selected = false;
				}
			}),
			new Button(this,'quitbtn',{
				onInit:(btn)=>{
					btn.disabled=true;
				},
				onStart:(btn)=>{
					btn.disabled=false;
				},
				onClick:(btn)=>{
					if(btn.disabled) return;
					this.quit();
				},
				onEnd:(btn)=>{
					btn.disabled=true;
				}
			}),
			new Button(this,'beginnerbtn',{
				onClick:(btn)=>{
					if(btn.game.state===Game.STATE.PLAYING) return;
					if(btn.disabled||btn.selected) return;
					btn.selected=true;
					if(btn.game.selectedDifficultyButton) btn.game.selectedDifficultyButton.selected = false;
					btn.game.selectedDifficultyButton = btn;
					btn.game.difficulty=Game.DIFFICULTY.BEGINNER;
					btn.game.init();
					btn.game.deselectOtherButtons(btn);
					if(this.deathShown) this.deathShown = false;
				},
				onInit:(btn)=>{
					btn.type = 1;
					if(btn.game.difficulty!==Game.DIFFICULTY.BEGINNER) return;
					btn.selected=true;
					btn.game.selectedDifficultyButton=btn;
				},
				onStart:(btn)=>{
					if(!btn.selected) btn.disabled = true;
				},
				onEnd:(btn)=>{
					btn.disabled = false;
				}
			}, Game.DIFFICULTY.BEGINNER),
			new Button(this,'intermediatebtn',{
				onClick:(btn)=>{
					if(btn.game.state===Game.STATE.PLAYING) return;
					if(btn.disabled||btn.selected) return;
					btn.selected=true;
					if(btn.game.selectedDifficultyButton) btn.game.selectedDifficultyButton.selected = false;
					btn.game.selectedDifficultyButton = btn;
					btn.game.difficulty=Game.DIFFICULTY.INTERMEDIATE;
					btn.game.init();
					btn.game.deselectOtherButtons(btn);
					if(this.deathShown) this.deathShown = false;
				},
				onInit:(btn)=>{
					btn.type = 1;
					if(btn.game.difficulty!==Game.DIFFICULTY.INTERMEDIATE) return;
					btn.selected=true;
					btn.game.selectedDifficultyButton=btn;
				},
				onStart:(btn)=>{
					if(!btn.selected) btn.disabled = true;
				},
				onEnd:(btn)=>{
					btn.disabled = false;
				}
			}, Game.DIFFICULTY.INTERMEDIATE),
			new Button(this,'expertbtn',{
				onClick:(btn)=>{
					if(btn.game.state===Game.STATE.PLAYING) return;
					if(this.deathShown) return;
					btn.clicks++;
					btn.clickTime=Date.now();
					if(btn.clicks===10){
						btn.clicks=0;
						this.deathShown=true;
						btn.game.selectedDifficultyButton=btn;
						btn.game.difficulty=Game.DIFFICULTY.SUICIDAL;
						btn.selected=false;
						btn.game.deselectOtherButtons(btn);
						btn.game.buttons.find(b=>b.id==='deathbtn').selected=true;
						btn.game.init();
						return;
					}
					if(btn.game.state===Game.STATE.PLAYING) return;
					if(btn.disabled||btn.selected) return;
					btn.selected=true;
					if(btn.game.selectedDifficultyButton) btn.game.selectedDifficultyButton.selected = false;
					btn.game.selectedDifficultyButton = btn;
					btn.game.difficulty=Game.DIFFICULTY.EXPERT;
					btn.game.init();
					if(this.deathShown) this.deathShown = false;
				},
				onInit:(btn)=>{
					btn.type = 1;
					btn.clicks=0;
					btn.clickTime=Date.now();
					btn.clickInterval = setInterval(()=>{
						if(Date.now()-btn.clickTime<500) return;
						if(btn.clicks>0) btn.clicks--;
					},850);
					if(btn.game.difficulty!==Game.DIFFICULTY.EXPERT) return;
					btn.selected=true;
					btn.game.selectedDifficultyButton=btn;
				},
				onStart:(btn)=>{
					if(!btn.selected) btn.disabled = true;
				},
				onEnd:(btn)=>{
					btn.disabled = false;
				}
			}, Game.DIFFICULTY.EXPERT),
			new Button(this,'deathbtn',{
				onClick:(btn)=>{
					if(!this.deathShown) return;
					if(btn.game.state===Game.STATE.PLAYING) return;
					if(btn.disabled||btn.selected) return;
					btn.selected=true;
					if(btn.game.selectedDifficultyButton) btn.game.selectedDifficultyButton.selected = false;
					btn.game.selectedDifficultyButton = btn;
					btn.game.difficulty=Game.DIFFICULTY.SUICIDAL;
					btn.game.init();
					btn.game.deselectOtherButtons(btn);
				},
				onInit:(btn)=>{
					btn.type = 1;
					if(btn.game.difficulty!==Game.DIFFICULTY.SUICIDAL) return;
					btn.selected=true;
					btn.game.selectedDifficultyButton=btn;
				},
				onStart:(btn)=>{
					if(!btn.selected) btn.disabled = true;
				},
				onEnd:(btn)=>{
					btn.disabled = false;
				}
			}),
			new Button(this, 'themelightbtn',{
				onInit:(btn)=>{
					btn.theme=Game.THEME.LIGHT;
				},
				onClick:(btn)=>{
					if(btn.game.theme!==btn.theme) return;
					btn.game.nextTheme();
					// btn.game.buttons.forEach(button=>{
					// 	if(button.id!==btn.id&&button.id.includes('theme')){
					// 		if()
					// 	}
					// });
				}
			}),
			new Button(this, 'themedarkbtn', {
				onInit:(btn)=>{
					btn.theme=Game.THEME.DARK;
				},
				onClick:(btn)=>{
					// console.log(btn.game.theme);
					if(btn.game.theme!==btn.theme) return;
					btn.game.nextTheme();
				}
			}),
		];
	}

	deselectOtherButtons(button){
		this.buttons.forEach(btn=>{
			if(btn.id!==button.id&&btn.type===1&&btn.selected) btn.selected=false;
		});
		if(button.id!=='expertbtn')button.game.buttons.find(b=>b.id==='expertbtn').clicks=0;
	}

	nextTheme(){
		// console.log(this.theme)
		if(++this.theme>=Object.keys(Game.THEME).length) this.theme = 0;
		// console.log(this.theme)
		this.buttons.forEach(button=>{
			if(button.id.includes('theme')){
				button.ignore=button.theme!==this.theme;
			}
		});
		events.emit('themeChange',this.theme);
	}

	generateBoard(){
		this.board = Array(this.height).fill(null).map(()=>
			Array(this.width).fill(null).map(()=>({
				hasMine:false,
				revealed:false,
				flagged:false,
				adjacentMines:0,
				game:this,
				wasKillTile:false, // was this the tile responsible for failure?
			}))
		);

		for(let iy=0;iy<this.height;iy++) {
			for (let ix = 0; ix < this.width; ix++) {
				this.board[iy][ix].y = iy;
				this.board[iy][ix].x = ix;
			}
		}
	}

	placeMines(fx,fy){
		const safeZone = new Set();
		const zoneRadius = 1;
		if(this.getPlayerConfig(this.activePlayer,'safeZone')){
			for(let dy=-zoneRadius;dy<=zoneRadius;dy++){
				for(let dx=-zoneRadius;dx<=zoneRadius;dx++){
					const nx = fx+dx;
					const ny = fy+dy;
					if(nx >= 0 && nx < this.width && ny >= 0 && ny < this.height){
						safeZone.add(`${nx},${ny}`);
					}
				}
			}
		} else safeZone.add(`${fx},${fy}`);
		let minesPlaced = 0;
		while(minesPlaced<this.mines){
			const x = Math.floor(Math.random()*this.width);
			const y = Math.floor(Math.random()*this.height);
			const key = `${x},${y}`;

			if(safeZone.has(key)) continue;
			if(this.board[y][x].hasMine) continue;
			this.board[y][x].hasMine = true;
			minesPlaced++;
		}

		for(let y=0;y<this.height;y++){
			for(let x=0;x<this.width;x++){
				if(this.board[y][x].hasMine) continue;
				this.board[y][x].adjacentMines = this.countMines(x,y);
			}
		}
	}

	countMines(x,y){
		let count = 0;
		for(let dy=-1;dy<=1;dy++){
			for(let dx=-1;dx<=1;dx++){
				if(dx===0&&dy===0)continue;
				const nx=x+dx;
				const ny=y+dy;
				if(nx>=0&&nx<this.width&&ny>=0&&ny<this.height&&this.board[ny][nx].hasMine) count++;
			}
		}
		return count;
	}

	revealTile(x,y){
		if(this.state!==Game.STATE.PLAYING) return;
		if(x<0||x>=this.width||y<0||y>=this.height) return;
		if(this.board[y][x].flagged||this.board[y][x].revealed) return;

		if(this.firstClick){
			this.firstClick = false;
			this.state=Game.STATE.PLAYING;
			this.placeMines(x,y);
		}

		this.board[y][x].revealed=true;

		if(this.board[y][x].hasMine) {
			this.board[y][x].wasKillTile=true;
			this.fail();
			return;
		}

		if(this.board[y][x].adjacentMines===0) this.revealAdjacentTiles(x,y);

		if(this.checkWin()) {
			this.win()
		}
	}

	flagAllMines(){
		for(let y=0;y<this.board.length;y++){
			for(let x=0;x<this.board[y].length;x++){
				if(this.board[y][x].hasMine&&!this.board[y][x].revealed) {
					if(this.board[y][x].flagged) continue;
					this.board[y][x].flagged=true;
					this.flagsPlaced++;
				}
			}
		}
	}

	altRevealAdjacentTiles(x,y){
		let flagged = 0;
		const tilesToReveal = [];
		for(let dy=-1;dy<=1;dy++){
			for(let dx=-1;dx<=1;dx++){
				if(dx===0&&dy===0)continue;
				const nx=x+dx;
				const ny=y+dy;
				if(nx<0||nx>=this.width||ny<0||ny>=this.height) continue;
				if(this.board[ny][nx].flagged){
					flagged++;
					continue;
				}
				tilesToReveal.push([nx,ny]);
			}
		}
		if(flagged>this.board[y][x].adjacentMines) return;
		if(flagged<this.board[y][x].adjacentMines) return;
		for(const t of tilesToReveal) this.revealTile(t[0],t[1]);
	}

	revealAdjacentTiles(x,y){
		for(let dy=-1;dy<=1;dy++){
			for(let dx=-1;dx<=1;dx++){
				if(dx===0&&dy===0)continue;
				const nx=x+dx;
				const ny=y+dy;
				if(nx>=0&&nx<this.width&&ny>=0&&ny<this.height&&!this.board[ny][nx].hasMine) this.revealTile(nx,ny);
			}
		}
	}

	toggleFlagTile(x,y){
		if(this.state!==Game.STATE.PLAYING) return;
		if(x<0||x>this.width||y<0||y>this.height) return;
		if(this.board[y][x].revealed) return;
		if(this.flagsPlaced===this.mines&&!this.board[y][x].flagged) return;

		this.board[y][x].flagged = !this.board[y][x].flagged;
		this.flagsPlaced+=this.board[y][x].flagged?1:-1;
		if(this.checkWin()) {
			this.win()
		}
	}

	checkWin(){
		for(let y = 0; y < this.height; y++){
			for(let x = 0; x < this.width; x++){
				const tile = this.board[y][x];

				if (!tile.hasMine && !tile.revealed) return false;
			}
		}

		if (this.getPlayerConfig(this.activePlayer, 'mustFlagAllMines')) {
			for(let y = 0; y < this.height; y++){
				for(let x = 0; x < this.width; x++){
					const tile = this.board[y][x];
					if (tile.hasMine && !tile.flagged) return false;
				}
			}
		}

		return true;
	}

	revealMines(){
		for(let y=0;y<this.height;y++){
			for(let x=0;x<this.width;x++){
				if(this.board[y][x].hasMine&&!this.board[y][x].flagged){
					this.board[y][x].revealed=true;
				}
			}
		}
	}

	getTile(x,y){
		if(x<0||x>this.width||y<0||y>this.height) return null;
		return this.board[y][x];
	}

	toTileCoords(cx,cy){
		const ts=7;
		const gs=1;
		const ox=this.bOffX+1;
		const oy=this.bOffY+1;
		const effs = ts+gs;

		const rx=cx-ox;
		const ry=cy-oy;

		if(rx<0||ry<0) return null;

		const tc=Math.floor(rx/effs);
		const tr=Math.floor(ry/effs);

		const itx=rx%effs<ts;
		const ity=ry%effs<ts;

		if(itx&&ity&&tc>=0&&tc<this.width&&tr>=0&&tr<this.height) return [tc,tr];
		return null;
	}

	#btncheck(button, cx, cy){
		if(button.ignore) return false;
		let x = cx-this.offX;
		let y = cy-this.offY;
		let w = (button.x+button.w);
		let h = (button.y+button.h);
		return !(x < button.x || y < button.y || x >= w - 1 || y >= h - 1);
	}

	getButtonAtPos(cx,cy){
		for(const button of this.buttons){
			if(this.#btncheck(button,cx,cy)) return button;
		}
		return null;
	}

	getButtonsAtPos(cx,cy){
		const clicked = [];
		this.buttons.forEach(button=>{
			if(this.#btncheck(button,cx,cy)) clicked.push(button);
		});
		return clicked;
	}

	async tryClickButton(cx,cy,id){
		if(this.activePlayer!==null&&id!==this.activePlayer) return;
		let success = false;
		for(const button of this.buttons){
			if(!this.#btncheck(button,cx,cy)) continue;
			button.onClick(id);
			if(button.passthrough){
				success = true;
				continue;
			}
			return true;
		}
		return success;
	}

	fail(){
		this.state=Game.STATE.FAIL;
		this.revealMines();
		this.buttons.forEach(btn=>{
			if(btn.onFail) btn.onFail();
		});
		this.end();
	}

	start(id){
		this.state=Game.STATE.PLAYING;

		this.buttons.forEach(btn=>{
			if(btn.onStart) btn.onStart();
		});

		this.activePlayer=id;
		this.timer = setInterval(()=>{
			this.elapsedSeconds++;
			events.emit('secondElapsed', this);
		},1000);
	}

	quit(){
		this.buttons.forEach(btn=>{
			if(btn.onQuit) btn.onQuit();
		});
		this.state=Game.STATE.QUIT;
		this.end();
	}

	end(){
		this.buttons.forEach(btn=>{
			if(btn.onEnd) btn.onEnd();
		});
		clearInterval(this.timer);
		this.timer = null;
		this.activePlayer=null;
	}

	win(){
		this.buttons.forEach(btn=>{
			if(btn.onWin) btn.onWin();
		});
		this.flagAllMines();
		this.state=Game.STATE.WIN;
		this.end();
	}

	//number,string,boolean,object,Array.isArray(x)
	static confKeys = {
		safeZone: 'boolean',
		mustFlagAllMines: 'boolean',
		tileDelay: 'number',
	}

	static confDefaults = {
		safeZone: true,
		mustFlagAllMines: false,
		tileDelay: 450,
	}

	setPlayerConfig(id,key,val){
		this.genPlayerConfig(id);
		if(!Object.keys(Game.confKeys).includes(key)) return false;
		if(typeof val !== Game.confKeys[key]) return false;
		this.playerConf[id][key]=val;
		return true;
	}

	genPlayerConfig(id){
		if(!this.playerConf[id])this.playerConf[id]={...Game.confDefaults}
		return this.playerConf[id];
	}

	getPlayerConfig(id,key){
		this.genPlayerConfig(id);
		if(!Object.keys(Game.confKeys).includes(key)) return null;
		return this.playerConf[id][key];
	}
}
module.exports = Game;