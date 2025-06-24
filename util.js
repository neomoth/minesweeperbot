const EventEmitter = require('node:events');

let events = new EventEmitter();

const CONSTANTS = {
	WIDTH:299,
	HEIGHT:218,
	CHUNKBITS:16*16*3,
}

const RANK = {
	NONE:0,
	USER:1,
	MODERATOR:2,
	ADMIN:3,
}
module.exports = { CONSTANTS, events, RANK };
