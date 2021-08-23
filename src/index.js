const steamClient = require("steam-user");
const accounts = require("./../login.js");
const pDefer = require("p-defer");
const prompts = require("prompts");

const bots = [];

class Bot {
	constructor(accountName, password, games = [730]) {
		this.accountName = accountName;
		this.password = password;
		this.games = games;
		this.blocked = false;
		this.loginSuccessful = pDefer();
		this.forceLoginStart = false;

		if (this.accountName.length <= 0)
			throw Error("You can not use anonymous login!");

		this.client = new steamClient({
			dataDirectory: "./steam-data",
		});

		this.events();
	}

	start() {
		if (this.blocked === false) this.startPlaying();
	}

	async logIn() {
		console.log(`[${this.accountName}] - Logging in..`);

		this.client.logOn({
			accountName: this.accountName,
			password: this.password,
		});

		return this.loginSuccessful.promise;
	}

	events() {
		this.client.on("loggedOn", ({ client_supplied_steamid: sid64 }) => {
			console.log(`[${this.accountName}] (${sid64}) - login successful!`);

			this.client.setPersona(steamClient.EPersonaState.Online); // update status - online

			if (this.forceLoginStart === true) {
				this.forceLoginStart = false;
				this.start();
			}

			this.loginSuccessful.resolve();
		});

		this.client.on("error", err => {
			//console.log(err);

			if (steamClient.EResult[err.eresult] === "LoggedInElsewhere") {
				console.log(
					`[${this.accountName}] - Someone else started playing, reconnecting..`
				);

				this.forceLoginStart = true;
				this.logIn();
				return;
			}

			console.log(
				`[${this.accountName}] - Error: ${steamClient.EResult[err.eresult]}`
			);
		});

		this.client.on("playingState", (blocked, playingApp) => {
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

		/*
		this.client.on("steamGuard", () => {
			throw new Error("Steam Guard not supported.");
		});
		*/
	}

	startPlaying() {
		console.log(`[${this.accountName}] - No one is playing. Starting games.`);
		return this.client.gamesPlayed(this.games);
	}

	stopPlaying() {
		console.log(
			`[${this.accountName}] - Someone else is playing, quiting any games.`
		);
		return this.client.gamesPlayed([]);
	}
}

(async () => {
	for (const { accountName, password } of accounts) {
		const bot = new Bot(accountName, password);
		await bot.logIn();
		bots.push(bot);
	}

	setTimeout(() => {
		for (const bot of bots) bot.start();
	}, 1 * 1000);
})();
