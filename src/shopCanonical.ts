/** Preferred public origin for https://racketpoint.bg (apex, no www). */
export const preferredShopOrigin = 'https://racketpoint.bg';

/**
 * www is the same shop on the wrong host. Return the apex URL to 301 to,
 * or null when the request is already on another host.
 */
export function wwwRedirectTarget(requestUrl: string): string | null {
	let url: URL;
	try {
		url = new URL(requestUrl);
	} catch {
		return null;
	}

	if (url.hostname !== 'www.racketpoint.bg') {
		return null;
	}

	url.protocol = 'https:';
	url.hostname = 'racketpoint.bg';
	return url.toString();
}

/** User-selected canonical for the one page Google is treating as a duplicate. */
export function canonicalHrefForPath(pathname: string): string | null {
	if (pathname === '/') {
		return `${preferredShopOrigin}/`;
	}

	return null;
}

export function withCanonical(html: string, href: string): string {
	if (html.includes('rel="canonical"')) {
		return html;
	}

	const tag = `<link rel="canonical" href="${href}" />`;
	if (!html.includes('</head>')) {
		return html;
	}

	return html.replace('</head>', `${tag}</head>`);
}
