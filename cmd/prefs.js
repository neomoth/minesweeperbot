const {usageString} = require("../commandHandler");
const {confDefaults, confKeys} = require("../Game");

function no(cmd,client,json){
	return client.tellPlayer(json.data.senderID, usageString(cmd))
}

module.exports = {
	data:{
		name:'preferences',
		description:'choose settings for your minesweeper game!',
		usage:'config [&lt;option> &lt;value>]',
		aliases:['prefs'],
	}, async execute(client, game, json, args){
		try{
			if(!args.length) {
				return client.tellPlayer(
					json.data.senderID,
					`Here's your minesweeper settings:\n${Object.entries(game.genPlayerConfig(json.data.senderID)).map(([k, v]) => `${k}: ${v}`).join('\n')}`
				);
			}
			if(args.length<2) return no(this,client,json);
			if(!Object.keys(confDefaults).includes(args[0])) {
				client.tellPlayer(json.data.senderID, 'invalid preference key');
				return no(this,client,json);
			}

			if(args[1].toLowerCase()==="true") args[1] = true;
			else if(args[1].toLowerCase()==="false") args[1] = false;
			else if(!isNaN(args[1])) args[1] = parseInt(args[1]);
			else args[1] = args.slice(1).join('\n');

			if(typeof args[1]!==confKeys[args[0]]){
				client.tellPlayer(json.data.senderID, `pref ${args[0]} requires value of type ${confKeys[args[0]]}.`);
				return no(this,client,json);
			}
			game.setPlayerConfig(json.data.senderID, args[0], args[1]);
			client.tellPlayer(json.data.senderID, `<span style="color:#0f0">set ${args[0]} to ${args[1]}</span>`);
		} catch(err){
			console.error('error happened in prefs.js: ',err);
		}
	}
}