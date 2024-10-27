import { Optional } from '../Utils/index.js';

export function join(...segments: string[]) {
	const parts: string[] = [];

	for (const segment of segments) {
		segment.split('/').forEach((part) => {
			if (part === '' || part === '.') {
				return;
			}
			parts.push(part);
		});
	}

	if (segments.length > 0 && segments[0].startsWith('/')) {
		return '/' + parts.join('/');
	}

	return parts.join('/');
}

export function isAbsolute(path: string) {
	return path.startsWith('/');
}

export function isRelative(path: string) {
	return !isAbsolute(path);
}

export function filename(path: string) {
	const segments = path.split('/');
	return segments[segments.length - 1];
}

export function ext(path: string) {
	const fn = filename(path);
	const index = fn.lastIndexOf('.');
	return index !== -1 ? Optional.some(fn.substring(index)) : Optional.none;
}

export function dirname(path: string) {
	const segments = path.split('/');
	segments.pop();
	if (segments.length === 1 && isAbsolute(path)) {
		return '/';
	}
	if (segments.length === 0) {
		return '.';
	}
	return cleanPath(segments.join('/'));
}

function cleanPath(path: string): string {
	path = path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
	if (isAbsolute(path)) {
		return path;
	}
	return path;
}

export function resolve(basePath: string, relativePath: string): string {
	if (isAbsolute(relativePath)) {
		// If the relative path is an absolute path, just clean it.
		return cleanPath(relativePath);
	}

	const baseParts = basePath.split('/').filter((part) => part.length > 0);
	const parts = relativePath.split('/');

	for (const part of parts) {
		if (part === '..') {
			if (baseParts.length > 0) {
				baseParts.pop();
			}
		} else if (part !== '.' && part !== '') {
			baseParts.push(part);
		}
	}

	return cleanPath('/' + baseParts.join('/'));
}

/**
 * @param from an absolute value
 * @param to an absolute value
 */
export function relative(from: string, to: string): string {
	const fromParts = cleanPath(from).split('/');
	const toParts = cleanPath(to).split('/');

	while (fromParts.length && toParts.length && fromParts[0] === toParts[0]) {
		fromParts.shift();
		toParts.shift();
	}

	const upSteps = fromParts.length;
	const remainingPath = toParts.join('/');
	const relativePath = '../'.repeat(upSteps) + remainingPath;

	return cleanPath(relativePath || '.');
}

export function withinRoot(root: string, resolvedPath: string) {
	return resolvedPath.startsWith(root);
}

export function resolveWithinJail(args: {
	jail: string;
	basePath: string;
	path: string;
}) {
	const { jail, basePath, path } = args;

	const resolvedPath = resolve(basePath, path);

	// Ensure the beginning of the resolved path matches the root. Adjust this
	// logic based on the requirement to handle absolute paths.
	let finalPath = resolvedPath;
	if (!withinJail(jail, resolvedPath)) {
		finalPath = `${jail}/${resolvedPath}`.replace(/\/\/+/g, '/');
	}

	return finalPath.replace(/\/$/, ''); // Ensure no trailing slash.
}

export function withinJail(jail: string, path: string) {
	if (isRelative(path)) {
		return true;
	}
	return path.startsWith(jail);
}
