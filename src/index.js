const steamClient = require("steam-user");
const credentials = require("./../login.js");

const client = new steamClient({
	autoRelogin: true,
});

let _blocked = false; // globalizing playingState blocked variable

// log in

if (credentials.accountName.length <= 0)
	throw Error("You can not use anonymous login!");

client.logOn(credentials);

client.on("loggedOn", _ => {
	console.info("Login successful!");
	client.setPersona(steamClient.EPersonaState.Online); // update status - online

	setTimeout(() => {
		if (_blocked === false) playGames();
	}, 1000);
});

client.on("error", err => {
	//console.log(err);

	if (steamClient.EResult[err.eresult] === "LoggedInElsewhere") {
		client.logOn(credentials);
		console.warn("Someone else started playing, reconnecting..");
		return;
	}

	console.error(`Error: ${steamClient.EResult[err.eresult]}`);
});

client.on("playingState", (blocked, playingApp) => {
	_blocked = blocked; // globalizing blocked variable

	// ignore this client (myself)
	if (blocked === false && playingApp !== 0) return;

	if (blocked === true) stopGames();
	else playGames();
});

function playGames() {
	const games = [730];
	console.info("No one is playing. Starting games.");
	return client.gamesPlayed(games);
}

function stopGames() {
	console.warn("Someone else is playing, quiting any games.");
	return client.gamesPlayed([]);
}
