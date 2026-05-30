import readline from "node:readline";
import pRetry, { AbortError } from "p-retry";
import Steam, { EConnectionProtocol } from "steam-user";
import { LocalIdlerManager, isLocalSteamRunning } from "./local-idler";
import { convertRelativePath } from "./path";
import type { TokenStorage } from "./token-storage";

const askSteamGuardCodeAsync = (username: string): Promise<string> => {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(`[${username}] Steam Guard code: `, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
};

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
	#customStatusConfig: string | boolean | undefined;
	#customStatus: string | null = null;
	#resolvingStatus = false;
	#localIdler: LocalIdlerManager | null = null;
	#localMode = false;

	constructor(
		username: string,
		password: string,
		games: number[],
		dataDirectory: string,
		tokenStorage: TokenStorage | null = null,
		online = false,
		customStatus: string | boolean | undefined = undefined,
	) {
		this.#username = username.toLowerCase();
		this.#password = password;
		this.#games = games;
		this.#online = online;
		this.#tokenStorage = tokenStorage;
		this.#customStatusConfig = customStatus;

		this.#localIdler = new LocalIdlerManager();
		this.#localIdler.initialize();

		// Handle processes cleanups
		process.on("exit", () => this.#localIdler?.stopIdling());
		process.on("SIGINT", () => {
			this.#localIdler?.stopIdling();
			process.exit(0);
		});
		process.on("SIGTERM", () => {
			this.#localIdler?.stopIdling();
			process.exit(0);
		});

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

			if (
				this.#customStatusConfig === undefined ||
				this.#customStatusConfig === false
			) {
				this.#log("CustomStatus is disabled (Native Status Mode).");
				return;
			}

			if (typeof this.#customStatusConfig === "string") {
				this.#customStatus = this.#customStatusConfig;
				this.#log(`Using manual custom status: "${this.#customStatus}"`);
				return;
			}

			if (this.#customStatusConfig === true) {
				this.#log("Fetching automatic combined games status...");
				this.#resolvingStatus = true;
				this.#steam.getProductInfo(
					this.#games,
					[],
					false,
					(
						err: Error | null,
						apps: Record<number, { appinfo?: { common?: { name?: string } } }>,
					) => {
						this.#resolvingStatus = false;
						if (err) {
							this.#log(`Failed to fetch product info: ${err.message}`);
							this.#play();
							return;
						}

						if (apps) {
							const names: string[] = [];
							for (const appid of this.#games) {
								const app = apps[appid];
								if (app?.appinfo?.common?.name) {
									names.push(app.appinfo.common.name);
								}
							}

							if (names.length > 0) {
								this.#customStatus = names.join(" & ");
								this.#log(
									`Automatic status constructed: "${this.#customStatus}"`,
								);
								this.#play();
							} else {
								this.#log("No game names could be resolved. Playing natively.");
								this.#play();
							}
						} else {
							this.#log("No apps returned from PICS. Playing natively.");
							this.#play();
						}
					},
				);
			}
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
			// Ignore blocks caused by our own idled games
			const isOwnGame = this.#games.includes(playingApp);
			const realBlocked = blocked && !isOwnGame;

			this.#blocked = realBlocked;

			// If we're not blocked & we are already playing something
			if (!realBlocked && playingApp !== 0) {
				return;
			}

			if (realBlocked) {
				this.#log(
					`Account is currently in-game elsewhere (App ID: ${playingApp}). Idling paused.`,
				);
			} else {
				this.#log("No conflicting game sessions. Ready to idle.");
			}

			// Defer play state until automatic status is constructed to prevent duplicate console logs/status flickering
			if (this.#resolvingStatus) {
				this.#log("Fetching automatic custom status before starting...");
				return;
			}

			this.#play();
		});

		this.#steam.on("steamGuard", async (_, callback) => {
			const code = await askSteamGuardCodeAsync(this.#username);

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

	async login(isFallback = false): Promise<void> {
		// Check if local Steam client is running
		if (isLocalSteamRunning()) {
			this.#localMode = true;
			this.#log(
				"Local Steam client detected. Running in LOCAL MODE (no network login).",
			);
			this.#log(
				'Games will show as "Running" in your Steam sidebar. Custom status is not available in this mode.',
			);
			this.#play();
			return;
		}

		// Remote mode — full TCP login
		this.#localMode = false;
		this.#log("Logging in...");

		const details = await this.#createLoginDetails(isFallback);

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
		} catch (err: unknown) {
			const error = err as Error & { eresult?: Steam.EResult };
			const isTokenError =
				error.message?.includes("token") ||
				error.eresult === Steam.EResult.Expired ||
				error.eresult === Steam.EResult.InvalidPassword;

			if (!isFallback && isTokenError && this.#tokenStorage) {
				this.#log(
					"Stored refresh token is invalid or expired. Deleting token and falling back to password...",
				);
				await this.#tokenStorage.deleteToken(this.#username);
				return this.login(true);
			}

			throw err;
		} finally {
			cleanup();
		}

		if (this.#online) {
			this.#steam.setPersona(Steam.EPersonaState.Online);
		}
	}

	async logout(): Promise<void> {
		this.#log("Logging out...");
		this.#localIdler?.stopIdling();

		const { promise, resolve } = Promise.withResolvers();

		this.#steam.once("disconnected", () => resolve());

		this.#steam.logOff();

		await promise;
	}

	async #createLoginDetails(bypassToken = false): Promise<LoginDetails> {
		const details = {
			renewRefreshTokens: true,
		};

		const token = bypassToken
			? null
			: await this.#tokenStorage?.getToken(this.#username);

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
			this.#localIdler?.stopIdling();
			this.#log("Stopped playing.");
			return;
		}

		// LOCAL MODE: Only run local C# idlers (no TCP, no session conflict)
		if (this.#localMode) {
			this.#localIdler?.startIdling(this.#games);
			this.#log(`Idling ${this.#games.length} games via local Steam client.`);
			return;
		}

		// REMOTE MODE: Only use TCP gamesPlayed (no local idlers)
		const hasCustomStatus =
			this.#customStatusConfig !== undefined &&
			this.#customStatusConfig !== false &&
			this.#customStatus !== null;

		const playList = hasCustomStatus
			? ([this.#customStatus, ...this.#games] as (string | number)[])
			: this.#games;

		this.#steam.gamesPlayed(playList);
		this.#log(
			`Playing ${this.#games.length} games (Display: "${
				hasCustomStatus ? this.#customStatus : this.#games[0]
			}").`,
		);
	}

	async #handleError(err: Error & { eresult?: Steam.EResult }): Promise<void> {
		console.error(err);

		if (err.eresult === Steam.EResult.LoggedInElsewhere) {
			this.#log(
				"You are active on your PC Steam client. Bot session paused to prevent disconnections.",
			);
			this.#steam.logOff();
			this.#localIdler?.stopIdling();
			return;
		}

		// List of EResults representing permanent account/session issues
		const permanentFailures = [
			Steam.EResult.InvalidPassword, // 5
			Steam.EResult.AccountNotFound, // 18
			Steam.EResult.AccountLogonDenied, // 63 (Invalid Steam Guard/2FA)
			Steam.EResult.AccountLogonDeniedVerifiedEmailRequired, // 65
			Steam.EResult.AccountLocked, // 73
			Steam.EResult.RateLimitExceeded, // 84 (Flooding will make it worse!)
		];

		if (err.eresult && permanentFailures.includes(err.eresult)) {
			this.#log(
				`Permanent logon failure detected (${err.eresult}). Reconnect aborted.`,
			);
			this.#steam.logOff();
			return;
		}

		try {
			await this.logout();

			await pRetry(() => this.login(), {
				retries: 10,
				factor: 2,
				minTimeout: 10 * 1000,
				onFailedAttempt: (error) => {
					const retryErr = error as Error & { eresult?: Steam.EResult };
					if (
						retryErr.eresult &&
						permanentFailures.includes(retryErr.eresult)
					) {
						this.#log(
							`Abort retry due to permanent error: ${retryErr.eresult}`,
						);
						throw new AbortError(retryErr);
					}
					this.#log(
						`Retrying logon due to network/transient issue. Attempt ${error.attemptNumber} failed.`,
					);
				},
			});

			this.#log("Re-login successful.");
		} catch (err) {
			console.error(err);

			this.#log("Could not re-login after multiple attempts, logging off.");
			this.#steam.logOff();
		}
	}
}
