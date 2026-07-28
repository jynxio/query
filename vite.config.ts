import { defineConfig } from "vite-plus";
import babel from "@rolldown/plugin-babel";
import coreJSPurePackage from "core-js-pure/package.json" with { type: "json" };

const config = defineConfig({
    test: { include: ["test/**/*.test.ts"] },
    fmt: {
        tabWidth: 4,
        printWidth: 110,
        ignorePatterns: ["README.md"],
    },
    lint: { options: { typeAware: true, typeCheck: true } },
    pack: {
        minify: true,
        sourcemap: true,
        platform: "neutral",
        dts: { tsgo: true },
        fixedExtension: true,
        plugins: [createBabelPlugin()],

        publint: true,
        attw: { level: "error", profile: "esm-only" },

        target: ["chrome111", "edge111", "firefox114", "safari16.4", "ios16.4", "node22"],
        exports: {
            customExports(exports) {
                return {
                    ...exports,
                    ".": {
                        types: "./dist/index.d.mts",
                        import: "./dist/index.mjs",
                        default: "./dist/index.mjs",
                    },
                };
            },
        },
    },
});

function createBabelPlugin() {
    return babel({
        include: /src\/.*\.[jt]s$/,
        presets: [["@babel/preset-env", { modules: false }]],
        plugins: [
            [
                "babel-plugin-polyfill-corejs3",
                {
                    method: "usage-pure",
                    version: coreJSPurePackage.version,
                },
            ],
        ],
    });
}

export default config;
