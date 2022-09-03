import SteamClient from "steam-user";
import { FileSystemCache } from "file-system-cache";

const STEAM_DATA_PATH = "./steam-data";

class Bot {
	static KEY_CACHE = new FileSystemCache({
		basePath: `${STEAM_DATA_PATH}/login-keys`,
		ns: "keys",
	});

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

		this.client = new SteamClient({ dataDirectory: STEAM_DATA_PATH });

		this.client.on("playingState", (blocked, appID) => {
			this.blocked = blocked;

			// Ignore if playing state was changed by this bot
			if (blocked === false && appID !== 0) return;

			this.log(`Playing state updated - [Blocked: ${blocked}, App: ${appID}]`);

			this.updateGames();
		});

		this.client.on("disconnected", (eresult, msg) => {
			console.log(eresult, msg);
			console.log(SteamClient.EResult[eresult]);
		});

		this.client.on("loginKey", key => Bot.KEY_CACHE.set(this.username, key));
	}

	login() {
		return new Promise((resolve, reject) => {
			const credentials = {
				accountName: this.username,
				rememberPassword: true,
			};

			const loginKey = Bot.KEY_CACHE.getSync(this.username, "");

			if (loginKey === "") {
				credentials.password = this.password;
			} else {
				credentials.loginKey = loginKey;
			}

			const listeners = {
				loggedOn: ({ client_supplied_steamid: sid64 }) => {
					unlisten();

					this.log("Login successful!");
					this.sid64 = sid64;
					this.client.setPersona(SteamClient.EPersonaState.Online);

					this.log(`Link to profile: http://steamcommunity.com/profiles/${this.sid64}`);

					this.checkErrors();

					resolve(sid64);
				},
				error: err => {
					unlisten();

					if (loginKey !== "" && SteamClient.EResult[err.eresult] === "InvalidPassword") {
						this.log(`Login key expired, trying again with password instead.`, true);
						Bot.KEY_CACHE.setSync(this.username, "");
						resolve(this.login());
					} else {
						this.log(`Login failed - ${SteamClient.EResult[err.eresult]}`, true);
						reject(new Error("Steam Error"));
					}
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

	checkErrors() {
		const errorListener = async err => {
			/* relogin, if kicked out of session */
			if (SteamClient.EResult[err.eresult] === "LoggedInElsewhere") {
				this.log("Someone else is playing, I need to re-login..");
				this.client.removeListener("error", errorListener);
				await this.login();
				this.updateGames();
			} /* just crash if any other error occurs */ else {
				this.log(`Error: ${SteamClient.EResult[err.eresult]}`);
				console.log(err);
			}
		};

		/*
		const disconnectListener = (eresult, msg) => {
			console.log(eresult, msg);
			console.log(SteamClient.EResult[eresult]);
		};
		
		this.client.on("disconnected", disconnectListener);*/
		this.client.on("error", errorListener);
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
