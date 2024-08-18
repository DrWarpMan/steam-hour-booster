import { isAbsolute, join, resolve } from "node:path";
import { packageDirectorySync } from "pkg-dir";

/**
 * Converts relative path to absolute path.
 * @param path - Relative path. Relative to the root directory of the app.
 * @throws {Error} If root directory of the app can not be resolved.
 */
export const convertRelativePath = (path: string) => {
	if (isAbsolute(path)) {
		return path;
	}

	const root = packageDirectorySync({ cwd: __dirname });

	if (!root) {
		throw new Error("Can not find root directory of the app.");
	}

	return resolve(join(root, path));
};
