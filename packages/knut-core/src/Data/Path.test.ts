import { expect, test } from 'vitest';
import { Path } from './index.js';

test.concurrent('Path.join', () => {
	const join = (...args: string[]) => expect(Path.join(...args));

	join('/', '/').toStrictEqual('/');
	join('/a/b', 'c', 'd').toStrictEqual('/a/b/c/d');
	join('/a/b', 'c/d').toStrictEqual('/a/b/c/d');
	join('/a/b', 'c/////d').toStrictEqual('/a/b/c/d');
	join('/a/b', '..', 'c', 'd').toStrictEqual('/a/b/../c/d');
	join('/', 'some', 'path').toStrictEqual('/some/path');
	join('some', 'path').toStrictEqual('some/path');
	join('../', 'a/b/c').toStrictEqual('../a/b/c');
});

test.concurrent('Path.resolve', async () => {
	const root = '/jail';
	const resolve = (basePath: string, relativePath: string) =>
		expect(Path.resolve(basePath, relativePath));

	resolve(root, '/a/b/c').toStrictEqual('/a/b/c');
	resolve(root, 'a/b/c').toStrictEqual('/jail/a/b/c');
	resolve(root, './a/b/c').toStrictEqual('/jail/a/b/c');
	resolve(root, '').toStrictEqual(root);
	resolve(root, '.').toStrictEqual(root);
	resolve(root, 'a/b/../c').toStrictEqual('/jail/a/c');
	resolve(root, Path.join('../../', 'a/b/c')).toStrictEqual('/a/b/c');
	resolve(root, Path.join('../../', 'a/b/c')).toStrictEqual('/a/b/c');
	resolve(root, '../../../../../abc').toStrictEqual('/abc');
	resolve('a', 'b').toStrictEqual('/a/b');
	resolve(
		Path.join(root, 'some', 'path'),
		Path.join('../', 'a/b/c'),
	).toStrictEqual('/jail/some/a/b/c');
	resolve(root, Path.join('../../', 'a/b/c')).toStrictEqual('/a/b/c');
	resolve('../ok', '../../example').toStrictEqual('/example');
	resolve('/some/jail', '/some/jail/a').toStrictEqual('/some/jail/a');
	resolve('/some/jail', 'a').toStrictEqual('/some/jail/a');
});

test.concurrent('Path.relative', () => {
	const relative = (basepath: string, relativePath: string) => {
		return expect(Path.relative(basepath, relativePath));
	};
	relative(
		'/home/user/.config/knut',
		'/home/user/kegs/sample1',
	).toStrictEqual('../../kegs/sample1');
	relative('/home/user', '/home/user/kegs/sample1').toStrictEqual(
		'kegs/sample1',
	);
	relative('/home/user', '/home/user/kegs/sample1').toStrictEqual(
		'kegs/sample1',
	);
	relative('/some/jail', '/some/jail/a').toStrictEqual('a');
	relative('/some/jail', '/some/jail/a').toStrictEqual('a');
	relative('/some/jail', '/some').toStrictEqual('..');
	relative('/some/jail', '/').toStrictEqual('../..');
});

test.concurrent('Path.resolveWithinRoot', () => {
	const root = '/path/to/jail';
	const rwj = (basePath: string, path: string) => {
		return expect(Path.resolveWithinJail({ jail: root, basePath, path }));
	};

	rwj(root, '/').toStrictEqual(root);
	rwj(root, '.').toStrictEqual(root);
	rwj('/a', '/').toStrictEqual(root);
	rwj('a', '.').toStrictEqual(Path.join(root, 'a'));
	rwj(root, 'a').toStrictEqual(Path.join(root, 'a'));
	rwj(root, '/a').toStrictEqual(Path.join(root, 'a'));
	rwj(root, '/a/b/c').toStrictEqual(Path.join(root, 'a', 'b', 'c'));
	rwj(root, 'a/b/c').toStrictEqual(Path.join(root, 'a', 'b', 'c'));
	rwj(Path.join(root, 'w/x/y/z'), '/a/b/c').toStrictEqual(Path.join(root, 'a/b/c'));
	rwj(Path.join(root, 'w/x/y/z'), 'a/b/c').toStrictEqual(
		Path.join(root, 'w/x/y/z/a/b/c'),
	);
	rwj(root, '../../../../a/b/c').toStrictEqual(
		Path.join(root, 'a', 'b', 'c'),
	);
	rwj(Path.join(root, 'w/x/y/z'), '../../../a/b/c').toStrictEqual(
		Path.join(root, 'w/a/b/c'),
	);
});

test.concurrent('Path.direname', () => {
	const dirname = (path: string) => {
		return expect(Path.dirname(path));
	};
	dirname('/some/path/to/file').toStrictEqual('/some/path/to');
	dirname('/rawr').toStrictEqual('/');
	dirname('rawr').toStrictEqual('.');
	dirname('/').toStrictEqual('/');
	dirname('').toStrictEqual('.');
});
