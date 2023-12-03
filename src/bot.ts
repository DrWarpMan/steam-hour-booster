import Steam from "steam-user";
import { TokenStorage } from "./token-storage";

export const TOKEN_STORAGE_DIRECTORY =
	Bun.env["TOKEN_STORAGE_DIRECTORY"] ?? "./token-storage";

const ts = new TokenStorage(TOKEN_STORAGE_DIRECTORY);

export const STEAM_DATA_DIRECTORY =
	Bun.env["STEAM_DATA_DIRECTORY"] ?? "./steam-data";

type LoginDetails = Parameters<Steam["logOn"]>[0];

export class Bot {
	#username: string;
	#password: string;
	#games: number[];
	#steam: Steam;

	#getRefreshToken(): Promise<string | null> {
		return ts.getToken(this.#username);
	}

	#setRefreshToken(refreshToken: string): Promise<void> {
		return ts.setToken(this.#username, refreshToken);
	}

	constructor(username: string, password: string, games: number[]) {
		this.#username = username.toLowerCase();
		this.#password = password;
		this.#games = games;

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

		this.#steam.on("error", (err) => {
			this.#log(`Error: ${err.message}`);
		});

		// @ts-expect-error missing type
		this.#steam.on("refreshToken", (refreshToken) => {
			this.#log(`New refresh token: ${refreshToken}`);

			this.#setRefreshToken(refreshToken);
		});
	}

	async login(): Promise<void> {
		const p = new Promise<void>((resolve, reject) => {
			this.#steam.once("loggedOn", () => {
				resolve();
			});

			this.#steam.once("error", (err) => {
				reject(err);
			});
		});

		const details = await this.#createLoginDetails();
		
		this.#steam.logOn(details);

		return p;
	}

	async #createLoginDetails(): Promise<LoginDetails> {
		const details = {
			renewRefreshTokens: true,
		};

		const token = await this.#getRefreshToken();

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

	async start(): Promise<void> {
		console.info("starting");
	}
}
