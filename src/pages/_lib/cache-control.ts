export const withNoStore = (response: Response) => {
	const headers = new Headers(response.headers);
	headers.set("Cache-Control", "private, no-store");

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
};
