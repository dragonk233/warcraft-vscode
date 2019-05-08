/**
 * @File   : environment.ts
 * @Author : Dencer (tdaddon@163.com)
 * @Link   : https://dengsir.github.io
 * @Date   : 4/22/2019, 11:18:19 AM
 */

import * as path from "path";
import * as vscode from "vscode";
import * as fs from "fs-extra";

const FILE_WARCRAFT = "warcraft.json";
const FILE_SCRIPT = "war3map.lua";
const FILE_MAP = "_warcraft_vscode_test.w3x";
const FOLDER_BUILD = ".build";

class Environment {
    private data: any;

    private get config() {
        return vscode.workspace.getConfiguration("warcraft");
    }

    get rootPath() {
        return vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : "";
    }

    get gamePath(): string {
        return this.config.get("gamePath") || "";
    }

    get wePath(): string {
        return this.config.get("wePath") || "";
    }

    get allowSshLibrary(): boolean {
        return this.config.get<boolean>("allowAddSshLibrary") || false;
    }

    get gameArgs(): string[] {
        return this.config.get("gameArgs") || [];
    }

    get weArgs(): string[] {
        return this.config.get("weArgs") || [];
    }

    get sourceFolder(): string {
        return path.join(this.rootPath, this.data.sourcedir);
    }

    get mapFolder(): string {
        return path.join(this.rootPath, this.data.mapdir);
    }

    get buildFolder(): string {
        return path.join(this.rootPath, FOLDER_BUILD);
    }

    get buildMapFolder(): string {
        return path.join(this.buildFolder, this.data.mapdir);
    }

    get outMapPath(): string {
        return path.join(this.buildFolder, FILE_MAP);
    }

    get outScriptPath(): string {
        return path.join(this.buildMapFolder, FILE_SCRIPT);
    }

    get tempScriptPath(): string {
        return path.join(this.buildFolder, FILE_SCRIPT);
    }

    async load() {
        const read = async () => {
            const configFile = path.join(this.rootPath, FILE_WARCRAFT);
            const stat = await fs.stat(configFile);
            if (!stat.isFile()) {
                throw new Error(`Not found ${FILE_WARCRAFT}`);
            }

            const body = await fs.readFile(configFile, { encoding: "utf-8" });
            if (!body) {
                throw new Error("Read ${FILE_WARCRAFT} failed");
            }

            const config = JSON.parse(body);
            if (!config) {
                throw new Error(`Parse ${FILE_WARCRAFT} failed`);
            }

            this.data = config;
        };

        const check = async () => {
            const configKeys = ["sourcedir", "mapdir"];
            for (const key of configKeys) {
                if (!this.data[key]) {
                    throw new Error(`Lost config ${key}`);
                }
            }

            const settingKeys = ["gamePath", "wePath"];
            for (const key of settingKeys) {
                if (!this.config.get(key)) {
                    throw new Error(`${key} not set`);
                }
            }

            const folders = [this.sourceFolder, this.mapFolder, this.gamePath, this.wePath];
            for (const folder of folders) {
                if (!(await fs.pathExists(folder))) {
                    throw new Error(`Not found dir: ${folder}`);
                }
            }
        };

        await read();
        await check();
    }
}

export default new Environment();
