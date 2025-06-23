class Button{
	constructor(game, id, callbacks, associatedDifficulty=null){
		this.id = id;
		this.game = game;
		//xywh set by canvas
		this.x = 0;
		this.y = 0;
		this.w = 0;
		this.h = 0;
		this.selected = false;
		this.disabled = false;
		this.associatedDifficulty = associatedDifficulty;
		if(callbacks.onClick) this.onClick = ()=> callbacks.onClick(this);
		if(callbacks.onFail) this.onFail = ()=> callbacks.onFail(this);
		if(callbacks.onStart) this.onStart = ()=> callbacks.onStart(this);
		if(callbacks.onWin) this.onWin = ()=> callbacks.onWin(this);
	}
}

class Game{
	offX=0;
	offY=0;
	selectedDifficultyButton=null;
	static DIFFICULTY = {
		BEGINNER:0,
		INTERMEDIATE:1,
		EXPERT:2,
		SUICIDAL:3,
	}
	static STATE = {
		IDLE:0,
		PLAYING:1,
		QUIT:2,
		WIN:3,
		FAIL:4,
	}
	constructor(difficulty){
		this.difficulty = difficulty;
		this.generateButtons();
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
				this.width=30;
				this.height=16;
				this.mines=240;
				break;
			}
		}
		this.state = 'idle';
		this.startTime=0;
		this.flagsPlaced=0;
		this.generateBoard();
	}

	generateButtons(){
		this.buttons = [
			new Button(this,'startbtn',{
				onClick:(btn)=>{
					if(btn.disabled||btn.selected) return;
					btn.selected=true;

					if(btn.game.state!==Game.STATE.IDLE) btn.game.generateBoard();

					btn.game.state=Game.STATE.PLAYING;
				},
				onFail:(btn)=>{
					btn.selected=false;
				},
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
				}
			}, Game.DIFFICULTY.INTERMEDIATE),
			new Button(this,'expertbtn',{
				onClick:(btn)=>{
					if(btn.game.state===Game.STATE.PLAYING) return;
					if(btn.disabled||btn.selected) return;
					btn.selected=true;
					if(btn.game.selectedDifficultyButton) btn.game.selectedDifficultyButton.selected = false;
					btn.game.selectedDifficultyButton = btn;
					btn.game.difficulty=Game.DIFFICULTY.EXPERT;
					btn.game.init();
				}
			}, Game.DIFFICULTY.EXPERT),
			new Button(this,'hellbtn',{
				onClick:(btn)=>{
					if(btn.game.state===Game.STATE.PLAYING) return;
					if(btn.disabled||btn.selected) return;
					btn.selected=true;
					if(btn.game.selectedDifficultyButton) btn.game.selectedDifficultyButton.selected = false;
					btn.game.selectedDifficultyButton = btn;
					btn.game.difficulty=Game.DIFFICULTY.BEGINNER;
					btn.game.init();
				}
			}, Game.DIFFICULTY.SUICIDAL),
		];
		this.selectedDifficultyButton = this.buttons.find(obj=>obj.associatedDifficulty===this.difficulty);
		if(this.selectedDifficultyButton) this.selectedDifficultyButton.selected = true;
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

		for(let iy=0;iy<this.height;iy++){
			for(let ix=0;ix<this.width;ix++){
				this.board[iy][ix].y = iy;
				this.board[iy][ix].x = ix;
			}
		}

		let minesPlaced = 0;
		while(minesPlaced<this.mines){
			const x = Math.floor(Math.random()*this.width);
			const y = Math.floor(Math.random()*this.height);

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
		if(this.state===Game.STATE.IDLE){
			this.state=Game.STATE.PLAYING;
			this.startTime = Date.now();
		}

		if(this.state!==Game.STATE.PLAYING) return;
		if(x<0||x>=this.width||y<0||y>=this.height) return;

		if(this.board[y][x].flagged||this.board[y][x].revealed) return;

		this.board[y][x].revealed=true;

		if(this.board[y][x].hasMine) {
			this.board[y][x].wasKillTile=true;
			this.fail();
			return;
		}

		if(this.board[y][x].adjacentMines===0) this.revealAdjacentTiles(x,y);

		if(this.checkWin()) this.state=Game.STATE.WIN;
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

		this.board[y][x].flagged = !this.board[y][x].flagged;
		this.flagsPlaced+=this.board[y][x].flagged?1:-1;
	}

	checkWin(){
		for(let y=0;y<this.height;y++){
			for(let x=0;x<this.width;x++){
				if(!this.board[y][x].hasMine&&!this.board[y][x].revealed) return false;
			}
		}
		return true;
	}

	revealMines(){
		for(let y=0;y<this.height;y++){
			for(let x=0;x<this.width;x++){
				if(this.board[y][x].hasMine){
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

	async tryClickButton(cx,cy){
		for(const button of this.buttons){
			let x = cx-this.offX;
			let y = cy-this.offY;
			let w = (button.x+button.w);
			let h = (button.y+button.h);
			if(x<button.x||y<button.y||x>=w-1||y>=h-1)continue;
			button.onClick();
			return true;
		}
		return false;
	}

	fail(){
		this.state=Game.STATE.FAIL;
		this.revealMines();
		for(const button of this.buttons) if(button.onFail) button.onFail();
	}
}
module.exports = Game;