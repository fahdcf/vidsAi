import { createHash } from "node:crypto";
import path from "node:path";
import ts from "typescript";
import { motionCompilerVersion, motionSdkModule, sceneProgram, sceneProgramInput, type SceneProgramDiagnostic,
    type SceneProgramInput, type SceneProgram } from "../../shared/motion/scene-program";
import { motionRendererVersion } from "../../shared/motion/registry";

const filename = "/scene.ts";
const sdkFile = "/motion-sdk.d.ts";
const sdkTypes = `declare module "${motionSdkModule}" {
    export type MotionFrameInput = Readonly<{ version: 1; frame: number; fps: number;
        properties: Readonly<Record<string, string | number | boolean>>; assetHandles: readonly string[] }>;
    export type MotionPoint = Readonly<{op: "M" | "L"; x: number; y: number} | {op: "Q"; cx: number; cy: number; x: number; y: number}
        | {op: "C"; c1x: number; c1y: number; c2x: number; c2y: number; x: number; y: number} | {op: "Z"}>;
    export type MotionCommand = Readonly<{ id: string; kind: "rect"; x: number; y: number; width: number; height: number; color: string }>
        | Readonly<{ id: string; kind: "asset"; handle: string; x: number; y: number; width: number; height: number }>
        | Readonly<{ id: string; kind: "text"; x: number; y: number; text: string; size: number; maxWidth: number; color: string }>
        | Readonly<{ id: string; kind: "path"; x: number; y: number; points: readonly MotionPoint[]; color: string }>;
    export type MotionSceneSdk = Readonly<{ math: Readonly<Pick<Math, "sin" | "cos" | "PI">>;
        rect(id: string, x: number, y: number, width: number, height: number, color: string): MotionCommand;
        asset(id: string, handle: string, x: number, y: number, width: number, height: number): MotionCommand;
        text(id: string, text: string, x: number, y: number, size: number, maxWidth: number, color: string): MotionCommand;
        path(id: string, points: readonly MotionPoint[], x: number, y: number, color: string): MotionCommand }>;
}`;

export type ProgramCompilation = { program: SceneProgram; diagnostics: [] } | { program: null; diagnostics: SceneProgramDiagnostic[] };
function diagnostic(code: string, message: string, line = 1, column = 1): SceneProgramDiagnostic {
    return { phase: "compiler", file: "scene.ts", code, message: message.slice(0, 320), line, column };
}

export function compileSceneProgram(raw: SceneProgramInput): ProgramCompilation {
    const input = sceneProgramInput.parse(raw);
    if (ts.version !== motionCompilerVersion) return { program: null, diagnostics: [diagnostic("compiler_version", "The pinned scene compiler is unavailable.")] };
    const source = ts.createSourceFile(filename, input.source, ts.ScriptTarget.ES2022, true);
    const exported = source.statements.filter((statement): statement is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(statement) && statement.modifiers?.some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword) === true);
    const invalid = source.statements.find((statement) => {
        if (ts.isImportDeclaration(statement)) return !statement.importClause?.isTypeOnly ||
            !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== motionSdkModule;
        return !ts.isFunctionDeclaration(statement) && !ts.isInterfaceDeclaration(statement) && !ts.isTypeAliasDeclaration(statement);
    });
    if (invalid || source.referencedFiles.length || source.typeReferenceDirectives.length || source.libReferenceDirectives.length ||
        exported.length !== 1 || exported[0].name?.text !== "frame") {
        const pos = source.getLineAndCharacterOfPosition(invalid?.getStart(source) ?? 0);
        return { program: null, diagnostics: [diagnostic("module_contract", "Export one frame function. Only type imports from the motion SDK and helper declarations are allowed.", pos.line + 1, pos.character + 1)] };
    }
    const check = `\nconst __vidsai_frame_check: (input: import("${motionSdkModule}").MotionFrameInput, sdk: import("${motionSdkModule}").MotionSceneSdk) => readonly import("${motionSdkModule}").MotionCommand[] = frame;`;
    const options: ts.CompilerOptions = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
        strict: true, noEmitOnError: true, sourceMap: true, types: [], lib: ["lib.es2022.d.ts"], skipLibCheck: true };
    const host = ts.createCompilerHost(options);
    const libDir = path.dirname(path.resolve(ts.getDefaultLibFilePath(options)));
    const originalRead = host.readFile;
    host.readFile = (file) => file === filename ? input.source + check : file === sdkFile ? sdkTypes
        : path.dirname(path.resolve(file)) === libDir && /^lib\.[a-z0-9.]+\.d\.ts$/i.test(path.basename(file)) ? originalRead(file) : undefined;
    host.fileExists = (file) => host.readFile(file) !== undefined;
    host.getSourceFile = (file, version) => {
        const text = host.readFile(file);
        return text === undefined ? undefined : ts.createSourceFile(file, text, version);
    };
    let code = "", sourceMap = "";
    host.writeFile = (file, text) => { if (file.endsWith(".map")) sourceMap = text; else if (file.endsWith(".js")) code = text; };
    const compilation = ts.createProgram([filename, sdkFile], options, host);
    const errors = ts.getPreEmitDiagnostics(compilation).filter(({ category }) => category === ts.DiagnosticCategory.Error).slice(0, 10);
    if (errors.length) return { program: null, diagnostics: errors.map((error) => {
        const pos = error.file?.getLineAndCharacterOfPosition(error.start ?? 0);
        const inCheck = !pos || (error.start ?? 0) >= input.source.length;
        const declaration = source.getLineAndCharacterOfPosition(exported[0].getStart(source));
        return diagnostic(`TS${error.code}`, ts.flattenDiagnosticMessageText(error.messageText, " "),
            (inCheck ? declaration.line : pos.line) + 1, (inCheck ? declaration.character : pos.character) + 1);
    }) };
    compilation.emit();
    const artifact = { ...input, compiler: motionCompilerVersion, rendererVersion: motionRendererVersion,
        dependencies: [`${motionSdkModule}@1`], code, sourceMap };
    const program = sceneProgram.safeParse({ ...artifact, buildHash: createHash("sha256").update(JSON.stringify(artifact)).digest("hex") });
    return program.success ? { program: program.data, diagnostics: [] }
        : { program: null, diagnostics: [diagnostic("build_size", "The compiled scene or its source map exceeds the build budget.")] };
}
