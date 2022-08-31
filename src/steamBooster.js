import SteamClient from "steam-user";
import { createInterface } from "readline";

class Bot {
	static logEnabled = true;

	constructor(username, password, games) {
		this.username = username;
		this.password = password;
		this.games = games;
		this.blocked = true;
		this.sid64 = "";
		this.isBotPlaying = false;

		if (this.username.trim().length <= 0) throw new Error("You can not use anonymous login!");
		if (this.password.length <= 0) throw new Error("Password is empty.");
		if (this.games.length <= 0) throw new Error("Games to boost were not specified.");

		this.client = new SteamClient({ dataDirectory: "./steam-data" });

		this.client.on("playingState", (blocked, appID) => {
			this.blocked = blocked;

			// Ignore if playing state was changed by this bot
			if (blocked === false && appID !== 0) return;

			this.log(`Playing state updated - [Blocked: ${blocked}, App: ${appID}]`);

			this.updateGames();
		});
	}

	login() {
		// todo, steam guard mobile
		return new Promise((resolve, reject) => {
			const credentials = {
				accountName: this.username,
				password: this.password,
			};

			const listeners = {
				loggedOn: ({ client_supplied_steamid: sid64 }) => {
					unlisten();

					this.log("Login successful!");
					this.sid64 = sid64;
					this.client.setPersona(SteamClient.EPersonaState.Online);

					resolve();
				},
				error: err => {
					unlisten();

					this.log(`Login failed - ${SteamClient.EResult[err.eresult]}`, true);

					reject(new Error("Steam Error"));
				},
				steamGuard: (_, callback) => {
					this.log("Steam is asking for Steam Guard code.");

					const rl = createInterface({
						input: process.stdin,
						output: process.stdout,
					});

					rl.question(`Steam Guard Code for [${this.username}]: `, code => {
						callback(code);
						rl.close();
					});
				},
			};

			const listen = () => {
				for (const listenerName in listeners)
					this.client.once(listenerName, listeners[listenerName]);
			};

			const unlisten = () => {
				for (const listenerName in listeners)
					this.client.off(listenerName, listeners[listenerName]);
			};

			this.log(`Logging in..`);

			listen();
			this.client.logOn(credentials);
		});
	}

	boost() {
		this.updateGames();

		const errorListener = async err => {
			if (SteamClient.EResult[err.eresult] === "LoggedInElsewhere") {
				this.log("Someone else is playing, I need to re-login..");
				this.client.removeListener("error", errorListener);
				await this.login();
				this.boost();
			} else {
				this.log(`Error: ${SteamClient.EResult[err.eresult]}`);
				console.log(err);
			}
		};

		this.client.on("error", errorListener);

		/* i didnt find a situation where we would need this listener yet,
		once it's found, we will implement this listener
		
		this.client.on("disconnected", (eresult, msg) => {
			console.log(eresult, msg);
			console.log(SteamClient.EResult[eresult]);
		});
		
		// ? this.client.logOff();
		*/
	}

	updateGames() {
		this.blocked === true ? this.stopGames() : this.startGames();
	}

	startGames() {
		if (this.isBotPlaying) return;

		this.log(`Starting games [${this.games.join(",")}]`);
		this.client.gamesPlayed(this.games);
		this.isBotPlaying = true;
	}

	stopGames() {
		if (!this.isBotPlaying) return;

		this.log(`Stopping games`);
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
