import Steam from "steam-user";
import type { TokenStorage } from "./token-storage";

export const STEAM_DATA_DIRECTORY =
	Bun.env["STEAM_DATA_DIRECTORY"] ?? "./steam-data";

type LoginDetails = Parameters<Steam["logOn"]>[0];

export class Bot {
	#username: string;
	#password: string;
	#games: number[];
	#steam: Steam;
	#tokenStorage?: TokenStorage;

	constructor(username: string, password: string, games: number[], tokenStorage?: TokenStorage) {
		this.#username = username.toLowerCase();
		this.#password = password;
		this.#games = games;

		if(tokenStorage) {
			this.#tokenStorage = tokenStorage;
		}

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
		this.#steam.on("refreshToken", (refreshToken: unknown) => {
			if(typeof refreshToken !== "string") {
				throw new Error("refreshToken is not a string");
			}

			this.#log(`New refresh token: ${refreshToken}`);
			this.#tokenStorage?.setToken(this.#username, refreshToken);
		});
	}

	async login(): Promise<void> {
		let afterLogin: () => void;
		let afterError: (err: unknown) => void;

		const p = new Promise<void>((resolve, reject) => {
			afterLogin = () => {
				resolve();
			}

			afterError = async (err) => {
				reject(err);
			}

			this.#steam.once("loggedOn", afterLogin);
			this.#steam.once("error", afterError);
		}).finally(() => {
			this.#steam.removeListener("loggedOn", afterLogin);
			this.#steam.removeListener("error", afterError);
		});

		const details = await this.#createLoginDetails();

		this.#steam.logOn(details);

		return p;
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

	async start(): Promise<void> {
		console.info("starting");
	}
}
