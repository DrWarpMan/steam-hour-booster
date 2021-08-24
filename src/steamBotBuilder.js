const steamClient = require("steam-user");
const prompts = require("prompts");
const fs = require("fs");

module.exports = (accounts, accountsFilePath) => {
	class Bot {
		constructor(accountName, password, games = [730], loginKey = "") {
			this.accountName = accountName;
			this.password = password;
			this.games = games;
			this.loginKey = loginKey;
			this.blocked = false;
			this.usedKey = false;

			if (this.accountName.length <= 0)
				throw Error("You can not use anonymous login!");

			this.client = new steamClient({
				dataDirectory: "./steam-data",
			});

			this.events();
			this.logIn();
		}

		logIn() {
			console.log(`[${this.accountName}] - Logging in..`);

			const details = {
				accountName: this.accountName,
				rememberPassword: true,
			};

			if (this.loginKey === "") {
				console.log(`[${this.accountName}] Using password for login!`);
				details.password = this.password;
			} else {
				console.log(`[${this.accountName}] Using login key for login!`);
				details.loginKey = this.loginKey;
				this.usedKey = true;
			}

			this.client.logOn(details);
		}

		events() {
			this.client.on("loggedOn", ({ client_supplied_steamid: sid64 }) => {
				console.log(`[${this.accountName}] (${sid64}) - login successful!`);

				this.usedKey = false;
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

				if (
					this.usedKey === true &&
					steamClient.EResult[err.eresult] === "InvalidPassword"
				) {
					`[${this.accountName}] - Invalid key, deleting!`;
					this.removeKey();
				}

				setTimeout(() => this.logIn(), 5000);
			});

			this.client.on("playingState", (blocked, playingApp) => {
				console.log(
					`[${this.accountName}] - Playing state: blocked: ${blocked} app: ${playingApp}`
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

			this.client.on("loginKey", key => {
				console.log(`[${this.accountName}] - Saving new login key: ${key}`);
				accounts[this.accountName].loginKey = key;
				fs.writeFileSync(accountsFilePath, JSON.stringify(accounts, null, 4));
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

		removeKey() {
			this.loginKey = "";
			delete accounts[this.accountName].loginKey;
			fs.writeFileSync(accountsFilePath, JSON.stringify(accounts, null, 4));
		}
	}

	return Bot;
};
