const EventEmitter = require('node:events');

let events = new EventEmitter();

const CONSTANTS = {
	WIDTH:289,
	HEIGHT:208,
	CHUNKBITS:16*16*3,
}
module.exports = { CONSTANTS, events };
