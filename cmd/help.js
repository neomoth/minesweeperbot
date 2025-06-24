const { RANK } = require('../util');
const { commands } = require('../commandHandler');

module.exports = {
	data: {
		name: 'help',
		description: 'Lists all available commands',
		usage: 'help [command]',
		aliases: ['h','?'],
		minRank: RANK.NONE,
		hidden: false,
	},
	async execute(client, game, json, args){
		if(!args.length){
			let commandsList = [];
			for(const [name, command] of commands){
				if(command.data.hidden) continue;
				if(command.data.disabled) continue;
				if(command.data.minRank>client.rank) continue;
				commandsList.push(name);
			}
			commandsList = commandsList.sort();

			client.tellPlayer(
				json.data.senderID,
				`Available commands: ${commandsList.join(', ')}.\n\nType /minesweeper help [command] for more info about a command.`
			);
			return;
		}
		let cmd = commands.get(args[0].toLowerCase());
		if(!cmd||cmd.data.hidden||cmd.data.minRank>client.rank){
			client.tellPlayer(json.data.senderID, `Unknown command: ${args[0]}.`);
			return;
		}
		let aliases = '[None]';
		if(cmd.data.aliases) if(cmd.data.aliases.length) aliases = cmd.data.aliases.join(', ');
		else aliases = '[None]';
		client.tellPlayer(
			json.data.senderID,
			`${cmd.data.name} - ${cmd.data.description}\nUsage: /${cmd.data.usage}\nAliases: ${aliases}`
		);
	}
}