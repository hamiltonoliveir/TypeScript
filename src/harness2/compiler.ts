import { VirtualFileSystem } from "./vfs";
import { TextDocument } from "./documents";
import * as vpath from "./vpath";
import * as ts from "./api";

export class CompilerHost {
    private _setParentNodes: boolean;
    private _sourceFiles = new Map<string, ts.SourceFile>();
    private _ts: ts.TypeScript;
    private _newLine: "\r\n" | "\n";

    public readonly vfs: VirtualFileSystem;
    public readonly defaultLibLocation: string;
    public readonly outputs: TextDocument[] = [];
    public readonly traceResults: string[] = [];

    constructor(ts: ts.TypeScript, vfs: VirtualFileSystem, defaultLibLocation: string, newLine: "\r\n" | "\n", setParentNodes = false) {
        this._ts = ts;
        this.vfs = vfs;
        this.defaultLibLocation = defaultLibLocation;
        this._newLine = newLine;
        this._setParentNodes = setParentNodes;
    }

    public getCurrentDirectory(): string {
        return this.vfs.currentDirectory;
    }

    public useCaseSensitiveFileNames(): boolean {
        return this.vfs.useCaseSensitiveFileNames;
    }

    public getNewLine(): string {
        return this._newLine;
    }

    public getCanonicalFileName(fileName: string): string {
        return this.vfs.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
    }

    public fileExists(fileName: string): boolean {
        return this.vfs.fileExists(fileName);
    }

    public directoryExists(directoryName: string): boolean {
        return this.vfs.directoryExists(directoryName);
    }

    public getDirectories(path: string): string[] {
        const entry = this.vfs.getDirectory(path);
        return entry ? entry.getDirectories(/*recursive*/ true).map(dir => dir.relative) : [];
    }

    public readFile(path: string): string | undefined {
        const entry = this.vfs.getFile(path);
        return entry && entry.getContent();
    }

    public writeFile(fileName: string, content: string, writeByteOrderMark: boolean) {
        if (writeByteOrderMark) content = "\uFEFF" + content;
        const entry = this.vfs.addFile(fileName);
        if (entry) {
            entry.setContent(content);
            const document = new TextDocument(entry.path, content);
            const index = this.outputs.findIndex(doc => this.vfs.sameName(document.file, doc.file));
            if (index < 0) {
                this.outputs.push(document);
            }
            else {
                this.outputs[index] = document;
            }
        }
    }

    public trace(s: string): void {
        this.traceResults.push(s);
    }

    public realpath(path: string): string {
        const entry = this.vfs.getEntry(path, { followSymlinks: true });
        return entry && entry.path || path;
    }

    public getDefaultLibLocation(): string {
        return vpath.resolve(this.vfs.currentDirectory, this.defaultLibLocation);
    }

    public getDefaultLibFileName(options: ts.CompilerOptions): string {
        return vpath.resolve(this.getDefaultLibLocation(), this._ts.getDefaultLibFileName(options));
    }

    public getSourceFile(fileName: string, languageVersion: number): ts.SourceFile | undefined {
        fileName = this.getCanonicalFileName(vpath.resolve(this.vfs.currentDirectory, fileName));

        const existing = this._sourceFiles.get(fileName);
        if (existing) return existing;

        const content = this.readFile(fileName);
        if (content === undefined) return undefined;

        const parsed = this._ts.createSourceFile(fileName, content, languageVersion, this._setParentNodes);
        this._sourceFiles.set(fileName, parsed);
        return parsed;
    }
}

export class ParseConfigHost {
    public readonly ts: ts.TypeScript;
    public readonly vfs: VirtualFileSystem;

    constructor(ts: ts.TypeScript, vfs: VirtualFileSystem) {
        this.ts = ts;
        this.vfs = vfs;
    }

    public get useCaseSensitiveFileNames() {
        return this.vfs.useCaseSensitiveFileNames;
    }

    public readDirectory(path: string, extensions: string[], excludes: string[], includes: string[]): string[] {
        return this.ts.matchFiles(path, extensions, excludes, includes, this.vfs.useCaseSensitiveFileNames, this.vfs.currentDirectory, path => this.vfs.getAccessibleFileSystemEntries(path));
    }

    public fileExists(path: string) {
        return this.vfs.fileExists(path);
    }

    public readFile(path: string) {
        const entry = this.vfs.getFile(path);
        return entry && entry.getContent();
    }
}

export class CompilationResult {
    public readonly output: TextDocument[];
    public readonly errors: ts.Diagnostic[];
    public readonly sourceMaps: ts.SourceMapData[];
    public readonly options: ts.CompilerOptions;
    constructor(options: ts.CompilerOptions, output: TextDocument[], errors: ts.Diagnostic[], sourceMaps: ts.SourceMapData[]) {
        this.options = options;
        this.output = output;
        this.errors = errors;
        this.sourceMaps = sourceMaps;
    }
}

export function compileFiles(ts: ts.TypeScript, vfs: VirtualFileSystem, defaultLibLocation: string, rootFiles: string[], options: ts.CompilerOptions) {
    const host = new CompilerHost(ts, vfs, defaultLibLocation, "\r\n");
    const program = ts.createProgram(rootFiles, options, host);
    const errors = ts.getPreEmitDiagnostics(program);
    const emitResult = program.emit();
    return new CompilationResult(options, host.outputs, errors, emitResult.sourceMaps);
}