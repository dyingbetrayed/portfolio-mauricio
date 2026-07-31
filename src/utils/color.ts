function channelToLinear(value: number): number {
	const v = value / 255;
	return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa (WCAG) de un color hexadecimal */
export function luminance(hex: string): number {
	const raw = hex.replace('#', '');
	const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
	const r = parseInt(full.slice(0, 2), 16);
	const g = parseInt(full.slice(2, 4), 16);
	const b = parseInt(full.slice(4, 6), 16);

	if ([r, g, b].some(Number.isNaN)) return 0;

	return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

/** Color de texto legible sobre un fondo dado */
export function readableInk(background: string): '#000000' | '#ffffff' {
	return luminance(background) > 0.45 ? '#000000' : '#ffffff';
}
