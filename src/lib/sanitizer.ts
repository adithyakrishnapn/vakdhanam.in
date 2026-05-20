export function sanitizeText(input: string) {
	return input
		.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
		.replace(/<[^>]*>/g, '')
		.replace(/javascript:/gi, '')
		.trim();
}