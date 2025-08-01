import pRetry from "p-retry";
import Steam, { EConnectionProtocol } from "steam-user";
import { convertRelativePath } from "./path";
import type { TokenStorage } from "./token-storage";

type LoginDetails = Parameters<Steam["logOn"]>[0];

// To mitigate the following issue: https://github.com/DrWarpMan/steam-hour-booster/issues/9
const LOGIN_TIMEOUT = 10 * 60 * 1000;

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
		dataDirectory: string,
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
			dataDirectory: convertRelativePath(dataDirectory),
			protocol: EConnectionProtocol.TCP,
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

		const details = await this.#createLoginDetails();

		this.#log("Prepared login credentials.");

		const { promise, resolve, reject } = Promise.withResolvers();

		const loggedOnCallback = () => resolve();
		const errorCallback = (err: unknown) => reject(err);
		const loginTimeout = setTimeout(
			() => reject(new Error("Login timed out.")),
			LOGIN_TIMEOUT,
		);

		const cleanup = () => {
			// Cleanup the callbacks & re-enable global error handling after the promise gets settled

			clearTimeout(loginTimeout);
			this.#steam.removeListener("loggedOn", loggedOnCallback);
			this.#steam.removeListener("error", errorCallback);
			this.#pauseErrors = false;
		};

		// Temporarily disable global error handling
		this.#pauseErrors = true;

		// Register the login callbacks
		this.#steam.once("loggedOn", loggedOnCallback);
		this.#steam.once("error", errorCallback);

		// Start login process
		try {
			this.#steam.logOn(details);
			
			await promise;
		} finally {
			cleanup();
		}

		if (this.#online) {
			this.#steam.setPersona(Steam.EPersonaState.Online);
		}
	}

	async logout(): Promise<void> {
		this.#log("Logging out...");

		const { promise, resolve } = Promise.withResolvers();

		this.#steam.once("disconnected", () => resolve());

		this.#steam.logOff();

		await promise;
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
