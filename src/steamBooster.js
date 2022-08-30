import steamClient from "steam-user";
import { createInterface } from "readline";

class Bot {
	static logEnabled = true;

	constructor(username, password, games) {
		this.username = username;
		this.password = password;
		this.games = games;
		this.blocked = false;
		this.isBotPlaying = false;

		if (this.username.length <= 0)
			throw Error("You can not use anonymous login!");

		this.client = new steamClient({ dataDirectory: "./steam-data" });

		this.listenForEvents();
		this.logIn();
	}

	logIn() {
		this.log(`Logging in..`);

		const credentials = {
			accountName: this.username,
			password: this.password,
		};

		this.client.logOn(credentials);
	}

	listenForEvents() {
		this.client.on("loggedOn", () => {
			this.log("Login successful!");

			this.client.setPersona(steamClient.EPersonaState.Online);

			//setTimeout(() => {
			//if (this.blocked === false) this.startGames();
			//}, 3 * 1000);
		});

		this.client.on("steamGuard", (_, callback) => {
			this.log("Steam is going to ask you for Steam Guard code.");

			const rl = createInterface({
				input: process.stdin,
				output: process.stdout,
			});

			rl.question(
				`Type Steam Guard code for account [${this.username}] now: `,
				code => {
					callback(code);
					rl.close();
				}
			);
		});

		//this.client.on("loginKey", key => {
		//	this.log(`Saving new authentication key: ${key}`);
		//});

		// TODO: find a way to not get kicked out of a session
		this.client.on("playingState", (blocked, appID) => {
			this.blocked = blocked;

			// Ignore if playing state was changed by this bot
			if (blocked === false && appID !== 0) return;

			this.log(`Playing status changed - [Blocked: ${blocked}, App: ${appID}]`);

			if (blocked === true) {
				this.stopGames();
			} else {
				this.startGames();
			}
		});

		this.client.on("error", err => {
			this.log(`Error: ${steamClient.EResult[err.eresult]}`);

			//if (steamClient.EResult[err.eresult] === "InvalidPassword")
		});
	}

	startGames() {
		this.log(`Starting games [${this.games.join(",")}]`);

		if (this.isBotPlaying)
			return this.log("Can't start games, bot is already playing.");

		this.client.gamesPlayed(this.games);
		this.isBotPlaying = true;
	}

	stopGames() {
		this.log(`Stopping games [${this.games.join(",")}]`);
		this.client.gamesPlayed([]);
		this.isBotPlaying = false;
	}

	log(message, isError = false) {
		if (!Bot.logEnabled) return;
		message = `Account: ${this.username} - ${message}`;
		return isError ? console.error(message) : console.log(message);
	}
}

export default Bot;
