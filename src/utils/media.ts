const VIDEO_EXTENSION = /\.(?:mp4|m4v|webm|ogv|ogg|mov)(?:$|[?#])/i;
const CLOUDINARY_PATH = /^\/[^/]+\/(image|video)\/upload(?:\/|$)/i;

type CloudinaryResourceType = 'image' | 'video';

function splitSuffix(source: string): [string, string] {
	const suffixStart = source.search(/[?#]/);
	return suffixStart === -1
		? [source, '']
		: [source.slice(0, suffixStart), source.slice(suffixStart)];
}

function cloudinaryResourceType(source: string): CloudinaryResourceType | null {
	try {
		const url = new URL(source);
		if (url.hostname.toLowerCase() !== 'res.cloudinary.com') return null;

		const match = url.pathname.match(CLOUDINARY_PATH);
		return (match?.[1].toLowerCase() as CloudinaryResourceType | undefined) ?? null;
	} catch {
		return null;
	}
}

function cloudinaryUrlWithTransformation(source: string, transformation: string): string {
	const resourceType = cloudinaryResourceType(source);
	if (!resourceType) return source;

	const [urlWithoutSuffix, suffix] = splitSuffix(source);
	const uploadMarker = `/${resourceType}/upload/`;
	const markerIndex = urlWithoutSuffix.indexOf(uploadMarker);
	if (markerIndex === -1) return source;

	const insertionPoint = markerIndex + uploadMarker.length;
	const afterUpload = urlWithoutSuffix.slice(insertionPoint);
	if (afterUpload.startsWith(`${transformation}/`)) return source;

	return `${urlWithoutSuffix.slice(0, insertionPoint)}${transformation}/${afterUpload}${suffix}`;
}

/** True for a video URL, including Cloudinary URLs without an extension. */
export function isVideoMedia(source: string): boolean {
	return cloudinaryResourceType(source) === 'video' || VIDEO_EXTENSION.test(source);
}

/**
 * Serves Cloudinary assets with the delivery transformations used by the site.
 * Local legacy assets are deliberately returned untouched so older entries keep
 * working while they are migrated.
 */
export function getMediaDeliveryUrl(source: string): string {
	const resourceType = cloudinaryResourceType(source);
	if (resourceType === 'video') {
		return cloudinaryUrlWithTransformation(
			source,
			'c_limit,w_1920,h_1080/f_auto:video/q_auto:good',
		);
	}

	if (resourceType === 'image') {
		return cloudinaryUrlWithTransformation(
			source,
			'c_limit,w_2400,h_2400/f_auto/q_auto:good',
		);
	}

	return source;
}

/**
 * A mobile-first hero rendition derived by Cloudinary from the same source
 * video. It is deliberately a portrait crop because the hero uses
 * `object-fit: cover` on phones; sending a full 16:9 frame wastes most of the
 * downloaded pixels outside the viewport.
 */
export function getMobileHeroVideoUrl(source: string): string {
	if (cloudinaryResourceType(source) !== 'video') return '';

	return cloudinaryUrlWithTransformation(
		source,
		'c_fill,g_center,ar_9:16,w_720/f_auto:video/q_auto:eco',
	);
}

/**
 * Extracts the first video frame as a JPEG poster. Cloudinary creates this
 * derived image automatically; no poster file is uploaded or managed by the
 * editor. Returns an empty string for legacy/local videos.
 */
export function getVideoPosterUrl(source: string): string {
	if (cloudinaryResourceType(source) !== 'video') return '';

	return cloudinaryUrlWithTransformation(
		source,
		'c_limit,w_1920,h_1080/so_0/f_jpg/q_auto:good',
	);
}

/** A lightweight portrait poster paired with getMobileHeroVideoUrl(). */
export function getMobileHeroPosterUrl(source: string): string {
	if (cloudinaryResourceType(source) !== 'video') return '';

	return cloudinaryUrlWithTransformation(
		source,
		'c_fill,g_center,ar_9:16,w_720/so_0/f_jpg/q_auto:eco',
	);
}

/** A still preview for project cards. Local videos fall back to their color. */
export function getMediaPreviewUrl(source: string): string {
	if (isVideoMedia(source)) return getVideoPosterUrl(source);
	return getMediaDeliveryUrl(source);
}
