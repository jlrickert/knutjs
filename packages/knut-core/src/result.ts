export class Result<T> {}
// export class Result<T> {
// 	static ok<T>(value: T): Result<T> {
// 		return new Result({ ok: true, value });
// 	}
//
// 	static error(message: string): Result<never> {
// 		return new Result({ ok: false, message });
// 	}
//
// 	private constructor(
// 		private data: { ok: true; value: T } | { ok: false; message: string },
// 	) {}
//
// 	isOk() {
// 		return this.data.ok;
// 	}
//
// 	unwrap(): T {
// 		if (this.data.ok) {
// 			return this.data.value;
// 		}
// 		throw new Error('Cannot unwrap an error result');
// 	}
// }
//
// export class Task<T> {
// 	static fromPromise<T>(
// 		f: () => Promise<T>,
// 		onError: (e: unknown) => string,
// 	) {}
//
// 	static ok<T>(value: T): Task<T> {
// 		return new Task(Promise.resolve({ ok: true, value }));
// 	}
//
// 	static error(message: string): Task<never> {
// 		return new Task(Promise.resolve({ ok: false, message }));
// 	}
//
// 	private constructor(
// 		private p: Promise<
// 			{ ok: true; value: T } | { ok: false; message: string }
// 		>,
// 	) {}
//
// 	map<G>(f: (value: T) => G): Task<G | T> {
// 		return new Task(
// 			this.p.then((data) => {
// 				if (data.ok) {
// 					const value = data.value
// 					return Promise.resolve({ ok: true, value: f(value) });
// 				}
// 				return this.p;
// 			}),
// 		);
// 	}
// }
