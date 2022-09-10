import { constants, accessSync, readFileSync, writeFileSync } from "fs";

class JSONManager {
	filePath: string;

	constructor(path: string) {
		this.filePath = path;
		accessSync(this.filePath, constants.W_OK | constants.R_OK);
	}

	read(): any {
		return JSON.parse(readFileSync(this.filePath, { encoding: "utf-8" }));
	}

	write(jsonData: any): void {
		writeFileSync(this.filePath, JSON.stringify(jsonData));
	}
}

export default JSONManager;
