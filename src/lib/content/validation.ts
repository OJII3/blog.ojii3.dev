const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SLUG_PATTERN = /^(\d{4}-\d{2}-\d{2})-(\d+)$/;

export const normalizeContentDate = (value: string): string | null => {
	const date = value.includes("T") ? value.split("T")[0] : value;
	const match = DATE_PATTERN.exec(date);
	if (!match) return null;

	const parsed = new Date(`${date}T00:00:00Z`);
	if (
		Number.isNaN(parsed.getTime()) ||
		parsed.toISOString().slice(0, 10) !== date
	) {
		return null;
	}

	return date;
};

export const isValidContentSlug = (slug: string): boolean => {
	const match = SLUG_PATTERN.exec(slug);
	return match !== null && normalizeContentDate(match[1]) !== null;
};
