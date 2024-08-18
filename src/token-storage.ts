import fs from "node:fs";
import { join } from "node:path";
import { convertRelativePath } from "./path";

export interface TokenStorage {
	getToken(key: string): Promise<string | null>;
	setToken(key: string, token: string): Promise<void>;
	deleteToken(key: string): Promise<void>;
}

export class DefaultTokenStorage implements TokenStorage {
	readonly #directory: string;

	constructor(directory: string) {
		this.#directory = convertRelativePath(directory);

		if (!fs.existsSync(this.#directory)) {
			fs.mkdirSync(this.#directory);
		}
	}

	#formatPath(key: string): string {
		return join(this.#directory, key);
	}

	async getToken(key: string): Promise<string | null> {
		const path = this.#formatPath(key);

		try {
			const token = await Bun.file(path).text();

			return token;
		} catch (err) {
			if (!(err instanceof Error)) {
				throw err;
			}

			if (!("code" in err)) {
				throw err;
			}

			if (err.code === "ENOENT") {
				return null;
			}

			throw err;
		}
	}

	async setToken(key: string, token: string): Promise<void> {
		const path = this.#formatPath(key);

		await Bun.write(path, token);
	}

	async deleteToken(key: string): Promise<void> {
		const path = this.#formatPath(key);

		return new Promise((resolve, reject) => {
			fs.unlink(path, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}
}
