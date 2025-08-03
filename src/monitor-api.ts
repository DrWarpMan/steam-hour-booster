import type { Bot } from "./bot";

export async function startMonitorApi(bots: Bot[]) {
	Bun.serve({
		port: 3000,
		async fetch(req) {
			const url = new URL(req.url);

			if (url.pathname === "/") {
				const summary = await Promise.all(bots.map(bot => bot.getSummary()))
				return Response.json(summary);
			}

			return new Response("Not Found", { status: 404 });
		},
	});
}
