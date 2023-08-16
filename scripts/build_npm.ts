import { build, emptyDir } from "./deps.ts"

await emptyDir("./npm")

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  compilerOptions: {
    lib: ["DOM"],
  },
  shims: {
    // see JS docs for overview and more options
    deno: true,
  },
  package: {
    // package.json properties
    name: "@oliver_nexro/zod_api",
    version: Deno.args[0],
    description:
      "Configure API clients using Zod schemas for type-safety and interpreted action methods.",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/oliver-oloughlin/zod_api.git",
    },
    bugs: {
      url: "https://github.com/oliver-oloughlin/zod_api/issues",
    },
    dependencies: {
      "zod": "^3.21.4",
    },
  },
  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync("LICENSE", "npm/LICENSE")
    Deno.copyFileSync("README.md", "npm/README.md")
  },
})
