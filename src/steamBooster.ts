import SteamClient from "steam-user";
import { FileSystemCache } from "file-system-cache";
import { resolve } from "path";

const STEAM_DATA_PATH = resolve("steam-data");
const KEYS_CACHE = new FileSystemCache({
	basePath: resolve(STEAM_DATA_PATH, "login-keys/"),
	ns: "keys",
});

class SteamBooster {
	account: account;
	sid64: string;
	blocked: boolean;
	isBotPlaying: boolean;
	client: SteamClient;

	static logEnabled: boolean = true;

	constructor(account: account) {
		this.account = account;
		this.sid64 = "";
		this.blocked = true;
		this.isBotPlaying = false;

		if (this.account.username.trim().length <= 0) throw new Error("Username empty!");
		if (this.account.password.length <= 0) throw new Error("Password is empty!");
		if (this.account.games.length <= 0) throw new Error("Games are empty!");

		this.client = new SteamClient({ dataDirectory: STEAM_DATA_PATH });

		this.client.on("playingState", (blocked, playingApp) => {
			this.blocked = blocked;

			// Ignore if playing state was changed by this instance
			if (blocked === false && playingApp !== 0) return;

			this.log(`Playing state updated - [Blocked: ${blocked}, App: ${playingApp}]`);

			this.updateGames();
		});

		this.client.on("disconnected", (eresult, msg) => {
			switch (eresult) {
				case SteamClient.EResult.NoConnection:
				case SteamClient.EResult.ServiceUnavailable:
					const RECONNECT_IN_MINUTES = 3;

					this.log(
						`No connection/service unavailable - trying to reconnect in ${RECONNECT_IN_MINUTES} minutes..`
					);

					setTimeout(async () => {
						try {
							await this.login();
							this.updateGames();
						} catch (err: any) {
							this.log(`Couldn't restart booster for this account, reason: ${err.message}`, true);
						}
					}, RECONNECT_IN_MINUTES * 60 * 1000);

					break;
				default:
					this.log(`Disconnect event - unhandled error`);
					console.log(`ID ${eresult} Message ${msg}`);
			}
		});

		this.client.on("loginKey", (key: string) => {
			KEYS_CACHE.set(this.account.username, key);
		});
	}

	login() {
		return new Promise((resolve, reject) => {
			interface credentials {
				accountName: string;
				rememberPassword?: boolean;
				/** if you use password, set loginKey to undefined */
				password: string | undefined;
				/** if you use loginKey, set password to undefined */
				loginKey: string | undefined;
			}

			const loginKey = KEYS_CACHE.getSync(this.account.username, undefined);

			const credentials = {
				accountName: this.account.username,
				rememberPassword: true,
				password: loginKey === undefined ? this.account.password : undefined,
				loginKey,
			};

			const listeners = {
				loggedOn: (details: any) => {
					this.client.removeListener("error", listeners["error"]);

					this.log("Login successful!");
					this.sid64 = details.client_supplied_steamid;
					this.client.setPersona(SteamClient.EPersonaState.Online);

					this.log(`Link to profile: http://steamcommunity.com/profiles/${this.sid64}`);

					this.checkErrors();

					resolve(this.sid64);
				},
				error: async (error: any) => {
					this.client.removeListener("loggedOn", listeners["loggedOn"]);

					if (loginKey && error.eresult === SteamClient.EResult.InvalidPassword) {
						this.log(`Login key expired, trying again with password instead.`, true);
						KEYS_CACHE.setSync(this.account.username, undefined);
						resolve(await this.login());
					} else {
						this.log(`Login failed - ${SteamClient.EResult[error.eresult]}`, true);
						reject(new Error("Steam Error"));
					}
				},
			};

			this.client.once("loggedOn", listeners["loggedOn"]);
			this.client.once("error", listeners["error"]);

			this.log("Logging in..");

			this.client.logOn(credentials);
		});
	}

	checkErrors(): void {
		this.client.once("error", async err => {
			switch (err.eresult) {
				case SteamClient.EResult.LoggedInElsewhere:
					// relogin, if someone else just started playing which resulted in kicking bot session
					this.log("Someone else is playing, I need to re-login..");

					try {
						await this.login();
						this.updateGames();
					} catch (err: any) {
						this.log(`Couldn't restart booster for this account, reason: ${err.message}`, true);
					}
					break;

				default:
					this.log(`Error event - unhandled error`);
					console.log(`ID ${err.eresult} Message ${SteamClient.EResult[err.eresult]}`);
			}
		});
	}

	updateGames(): void {
		this.blocked === true ? this.stopGames() : this.startGames();
	}

	startGames(): void {
		if (this.isBotPlaying === true) return;

		this.log(`Starting games [${this.account.games.join(",")}]`);
		this.client.gamesPlayed(this.account.games);
		this.isBotPlaying = true;
	}

	stopGames(): void {
		if (!this.isBotPlaying) return;

		this.log(`Stopping games`);
		this.client.gamesPlayed([]);
		this.isBotPlaying = false;
	}

	log(message: string, isError: boolean = false): void {
		if (SteamBooster.logEnabled === false) return;
		message = `Account: ${this.account.username} - ${message}`;

		if (isError === true) {
			console.error(message);
		} else {
			console.log(message);
		}
	}
}

export default SteamBooster;
