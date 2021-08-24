import steamClient from "steam-user";
import prompts from "prompts";

class Bot {
	constructor(accountName, password, games) {
		this.accountName = accountName;
		this.password = password;
		this.games = games;
		this.blocked = false;

		if (this.accountName.length <= 0)
			throw Error("You can not use anonymous login!");

		this.client = new steamClient({
			dataDirectory: "./steam-data",
		});

		this.events();
	}

	logIn() {
		console.log(`[${this.accountName}] - Logging in..`);

		this.client.logOn({
			accountName: this.accountName,
			password: this.password,
		});
	}

	events() {
		this.client.on("loggedOn", ({ client_supplied_steamid: sid64 }) => {
			console.log(`[${this.accountName}] (${sid64}) - login successful!`);
			this.client.setPersona(steamClient.EPersonaState.Online);
			setTimeout(() => {
				if (this.blocked === false) this.startPlaying();
			}, 1000);
		});

		this.client.on("error", err => {
			// console.log(err)

			console.log(
				`[${this.accountName}] - Error: ${steamClient.EResult[err.eresult]}`
			);

			setTimeout(() => this.logIn(), 5000);
		});

		this.client.on("playingState", (blocked, playingApp) => {
			console.log(
				`[${this.accountName}] - Playing state: ${blocked} ${playingApp}`
			);

			this.blocked = blocked; // globalizing blocked variable

			// ignore this client (bot)
			if (blocked === false && playingApp !== 0) return;

			if (blocked === true) this.stopPlaying();
			else this.startPlaying();
		});

		this.client.on("steamGuard", async (_, callback) => {
			const { code } = await prompts({
				type: "text",
				name: "code",
				message: `[${this.accountName}] - Please, type your Steam guard code:`,
			});

			callback(code);
		});
	}

	startPlaying() {
		console.log(`[${this.accountName}] - Starting games.`);
		return this.client.gamesPlayed(this.games);
	}

	stopPlaying() {
		console.log(`[${this.accountName}] - Quiting any games.`);
		return this.client.gamesPlayed([]);
	}
}

export default Bot;
