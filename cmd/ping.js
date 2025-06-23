module.exports = {
	data:{
		name: 'ping',
		description: 'test cmd',
		aliases: ['p'],
		usage: 'ping'
	}, async execute(client, json, args){
		client.tellPlayer(json.data.senderID, '<span style="color:#0f0">Pong!</span>');
	}
}