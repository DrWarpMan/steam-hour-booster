import fs from "node:fs";
import { join } from "path";

export class TokenStorage {
    readonly #directory: string;

    constructor(directory: string) {
        this.#directory = directory;

        if (!fs.existsSync(this.#directory)) {
            fs.mkdirSync(this.#directory);
        }
    }

    #formatPath(key: string): string {
        return join(this.#directory, key);
    }

    async getToken(key: string): Promise<string|null> {
        const path = this.#formatPath(key);

        try {
            const token = await Bun.file(path).text();

            return token;
        } catch(err) {
            if(!(err instanceof Error)) {
                throw err;
            }
            
            if(!("code" in err)) {
                throw err;
            }

            if(err.code === "ENOENT") {
                return null;
            }
            
            throw err;
        }
    }

    async setToken(key: string, token: string): Promise<void> {
        const path = this.#formatPath(key);

        await Bun.write(path, token);
    }
}