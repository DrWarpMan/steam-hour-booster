import { z } from "zod";

export const configSchema = z.array(
	z.object({
		username: z
			.string()
			.min(1)
			.regex(/^[a-zA-Z0-9_]+$/),
		password: z.string().min(1),
		games: z.array(z.number().int().positive()).min(1),
	}),
);

export type Config = z.infer<typeof configSchema>;

export const loadConfig = async (path: string): Promise<Config> => {
	try {
		const json = await Bun.file(path).json<unknown>();

		const result = await configSchema.safeParseAsync(json);

		if (!result.success) {
			throw result.error;
		}

		return result.data;
	} catch (e) {
		console.error("Can not read/parse config file.");
		throw e;
	}
};
