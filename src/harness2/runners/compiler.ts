import * as vpath from "../vpath";
import * as io from "../io";
import { Runner } from "../runner";
import { TextDocument } from "../documents";
import { VirtualFileSystem } from "../vfs";
import { parseTestCase } from "../testCaseParser";
import { compareStrings } from "../utils";
import { compileFiles, CompilationResult, ParseConfigHost } from "../compiler";
import * as ts from "../api";
import { assert } from "chai";

export const enum CompilerTestType {
    Conformance,
    Regressions,
    Test262
}

export class CompilerRunner extends Runner<"conformance" | "compiler"> {
    public readonly basePath: string;

    constructor(id: "conformance" | "compiler") {
        super(id);
        this.basePath = vpath.combine("tests/cases", id);
    }

    // nee. enumerateTestFiles()
    public discover(): string[] {
        return io.getFiles(this.basePath, { recursive: true, pattern: /\.tsx?$/, qualified: true });
    }

    // nee. initializeTests()
    protected describe(file: string): void {
        describe(`compiler tests for ${file}`, () => {
            let compilerTest: CompilerTest | undefined;
            before(() => compilerTest = new CompilerTest(this.ts, file));
            it("errors", () => compilerTest && compilerTest.testCorrectErrors());
            it("module resolution", () => compilerTest && compilerTest.testModuleResolution());
            it("sourcemap record", () => compilerTest && compilerTest.testSourceMapRecord());
            it("output", () => compilerTest && compilerTest.testJavaScriptOutput());
            it("sourcemap", () => compilerTest && compilerTest.testSourceMapOutput());
            it("types", () => compilerTest && compilerTest.testTypes());
            it("symbols", () => compilerTest && compilerTest.testSymbols());
            after(() => compilerTest = undefined);
        });
    }
}

class CompilerTest {
    private result: CompilationResult;
    private ts: ts.TypeScript;
    private basename: string;
    private dirname: string;
    private document: TextDocument;
    private documents: TextDocument[];
    private configFile: TextDocument | undefined;
    private meta: Map<string, string>;
    private vfs: VirtualFileSystem;
    private defaultLibLocation = vpath.resolve(__dirname, "../../built/local");
    private rootFiles: string[] = [];
    private config: ts.ParsedCommandLine | undefined;
    private compilerOptions: ts.CompilerOptions;

    constructor(ts: ts.TypeScript, file: string) {
        this.ts = ts;
        this.basename = vpath.basename(file);
        this.dirname = vpath.dirname(file);
        this.document = new TextDocument(file, io.readFile(file) || "");

        const { documents, meta } = parseTestCase(this.document);
        this.documents = documents;
        this.meta = meta;

        // TODO: parse tsconfig.json
        // TODO: @baseUrl
        // TODO: @includeBuiltFile
        // TODO: @baselineFile
        // TODO: @libFiles
        // TODO: @noImplicitReferences

        const useCaseSensitiveFileNames = compareStrings(this.meta.get("useCaseSensitiveFileNames"), "true", /*ignoreCase*/ true) === 0;
        this.vfs = VirtualFileSystem.getBuiltLocal(useCaseSensitiveFileNames).clone();

        const currentDirectory = this.meta.get("currentDirectory");
        this.vfs.changeDirectory(currentDirectory || this.dirname);

        // Add documents
        for (const document of this.documents) {
            const file = this.vfs.addFile(document.file, document.text);
            if (!file) throw new Error(`Failed to add file: '${document.file}'`);

            // Add symlinks
            const symlink = document.meta.get("symlink");
            if (file && symlink) {
                for (const link of symlink.split(",")) {
                    this.vfs.addSymlink(vpath.resolve(this.vfs.currentDirectory, link.trim()), file);
                }
            }

            if (this.vfs.sameName(file.name, "tsconfig.json")) {
                if (!this.configFile) {
                    this.configFile = document;
                }
            }
            else {
                this.rootFiles.push(document.file);
            }
        }

        if (this.configFile) {
            const { config } = this.ts.parseConfigFileTextToJson(this.configFile.file, this.configFile.text);
            assert.isDefined(config);
            const baseDir = vpath.dirname(this.configFile.file);
            const host = new ParseConfigHost(this.ts, this.vfs);
            this.config = this.ts.parseJsonConfigFileContent(config, host, baseDir, /*existingOptions*/ undefined, this.configFile.file);
            this.compilerOptions = this.config.options;
        }
        else {
            this.compilerOptions = {};
        }

        this.result = compileFiles(this.ts, this.vfs, this.defaultLibLocation, this.rootFiles, this.compilerOptions);
    }

    public testCorrectErrors(): void {
    }

    public testModuleResolution(): void {
    }

    public testSourceMapRecord(): void {
    }

    public testJavaScriptOutput(): void {
    }

    public testSourceMapOutput(): void {
    }

    public testTypes(): void {
    }

    public testSymbols(): void {
    }
}