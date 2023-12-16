export type GitData = {
	gitpath?: string;
	email?: string;
	name?: string;
	editor?: string;
};

export type CommitOptions = {
	files: string[];
};

export class Git {
	init(): Git | null {
		return null;
	}

	findNearest(): Git | null {
		return null;
	}

	private constructor(private data: GitData) {}

	commit(options: CommitOptions) {}
	add(filepath: string) {}
	addAll() {}
}
