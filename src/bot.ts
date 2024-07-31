import pRetry from "p-retry";
import Steam from "steam-user";
import type { TokenStorage } from "./token-storage";

export const STEAM_DATA_DIRECTORY =
	Bun.env["STEAM_DATA_DIRECTORY"] ?? "./steam-data";

type LoginDetails = Parameters<Steam["logOn"]>[0];

export class Bot {
	#username: string;
	#password: string;
	#games: number[];
	#online: boolean;
	#steam: Steam;
	#tokenStorage: TokenStorage | null;
	#pauseErrors = false;
	#blocked = false;

	constructor(
		username: string,
		password: string,
		games: number[],
		tokenStorage: TokenStorage | null = null,
		online = false,
	) {
		this.#username = username.toLowerCase();
		this.#password = password;
		this.#games = games;
		this.#online = online;
		this.#tokenStorage = tokenStorage;

		this.#steam = new Steam({
			autoRelogin: false,
			dataDirectory: STEAM_DATA_DIRECTORY,
		});

		this.#setup();
	}

	#log(msg: string): void {
		console.info(`[${this.#username}] ${msg}`);
	}

	#setup(): void {
		this.#steam.on("loggedOn", () => {
			this.#log("Logged in.");
		});

		this.#steam.on("disconnected", (eresult, msg) => {
			console.log("[DEBUG] event: disconnected", eresult, msg);
		});

		this.#steam.on("error", (err) => {
			if (this.#pauseErrors) {
				return;
			}

			this.#log(`Error: ${err.message}`);

			this.#handleError(err);
		});

		this.#steam.on("playingState", (blocked, playingApp) => {
			this.#blocked = blocked;

			// If we're not blocked & we are already playing something
			if (!blocked && playingApp !== 0) {
				return;
			}

			this.#log(`Playing state changed: ${blocked} (App ID: ${playingApp})`);

			this.#play();
		});

		this.#steam.on("steamGuard", async (_, callback) => {
			const code = prompt(`[${this.#username}] Steam Guard code:`);

			if (!code) {
				console.error("No Steam Guard code provided, exiting.");
				process.exit(0);
			}

			callback(code);
		});

		this.#steam.on("refreshToken", (refreshToken) => {
			this.#log("New refresh token received.");
			this.#tokenStorage?.setToken(this.#username, refreshToken);
		});
	}

	async login(): Promise<void> {
		this.#log("Logging in...");

		try {
			let afterLogin: () => void;
			let afterError: (err: unknown) => void;

			const p = new Promise<void>((resolve, reject) => {
				afterLogin = () => {
					resolve();
				};

				afterError = async (err) => {
					reject(err);
				};

				this.#steam.once("loggedOn", afterLogin);
				this.#steam.once("error", afterError);
			}).finally(() => {
				this.#steam.removeListener("loggedOn", afterLogin);
				this.#steam.removeListener("error", afterError);
			});

			const details = await this.#createLoginDetails();

			this.#pauseErrors = true;

			this.#steam.logOn(details);

			await p;

			if (this.#online) {
				this.#steam.setPersona(Steam.EPersonaState.Online);
			}
		} finally {
			this.#pauseErrors = false;
		}
	}

	async logout(): Promise<void> {
		this.#log("Logging out...");

		let afterLogout: () => void;

		const p = new Promise<void>((resolve) => {
			afterLogout = () => {
				resolve();
			};

			this.#steam.once("disconnected", afterLogout);
		}).finally(() => {
			this.#steam.removeListener("disconnected", afterLogout);
		});

		this.#steam.logOff();

		await p;
	}

	async #createLoginDetails(): Promise<LoginDetails> {
		const details = {
			renewRefreshTokens: true,
		};

		const token = await this.#tokenStorage?.getToken(this.#username);

		if (token) {
			return {
				refreshToken: token,
				...details,
			};
		}

		return {
			accountName: this.#username,
			password: this.#password,
			...details,
		};
	}

	#play() {
		if (this.#blocked) {
			this.#steam.gamesPlayed([]);
			this.#log("Stopped playing.");
		} else {
			this.#steam.gamesPlayed(this.#games);
			this.#log(`Playing ${this.#games.length} games.`);
		}
	}

	async #handleError(err: Error & { eresult: Steam.EResult }): Promise<void> {
		console.error(err);

		try {
			await this.logout();

			await pRetry(() => this.login(), {
				retries: 20,
				factor: 2,
				minTimeout: 10 * 1000,
			});

			this.#log("Re-login successful.");
		} catch (err) {
			console.error(err);

			this.#log("Could not re-login after multiple attempts, logging off.");
			this.#steam.logOff();
		}
	}
}
