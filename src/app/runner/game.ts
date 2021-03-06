/**
 * @File   : game.ts
 * @Author : Dencer (tdaddon@163.com)
 * @Link   : https://dengsir.github.io
 * @Date   : 5/23/2019, 11:13:56 AM
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as utils from '../../utils';

import { env } from '../../env';
import { localize } from '../../globals';

import { RunnerType } from './runner';
import { BaseRunner } from './private';

import { getUID } from '../../utils/blizzard';

class GameRunner extends BaseRunner {
    type() {
        return RunnerType.Game;
    }

    @utils.once
    private async getDocumentFolder() {
        const output = await utils.execFile('reg', [
            'query',
            'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders',
            '/v',
            'Personal'
        ]);

        const m = output.match(/Personal\s+REG_EXPAND_SZ\s+([^\r\n]+)/);
        if (!m) {
            throw Error(localize('error.noDocFolder', 'Not found: My Documents'));
        }

        const sys: Map<string, string> = new Map(
            Object.keys(process.env).map(key => [key.toLowerCase(), process.env[key]])
        ) as Map<string, string>;

        return m[1].replace(/%([^%]+)%/g, (_, x) => {
            x = x.toLowerCase();
            return sys.has(x) ? sys.get(x) : x;
        });
    }

    @utils.report(localize('report.openGame', 'Starting game'))
    async execute() {
        const mapPath = env.outFilePath;
        const docFolder = await this.getDocumentFolder();
        const uid = await getUID(env.asGamePath('../.product.db'));
        const isBeta = uid === 'w3b';
        const isPtr = uid === 'w3t';
        const docMapFolder = path.resolve(
            docFolder,
            isBeta ? 'Warcraft III Beta' : isPtr ? 'Warcraft III Public Test' : 'Warcraft III',
            'Maps'
        );
        const targetPath = path.resolve(docMapFolder, 'Test', path.basename(mapPath));
        await fs.copy(mapPath, targetPath);

        this.process = utils.spawn(env.config.gamePath, [
            ...env.config.gameArgs,
            '-loadfile',
            path.relative(docMapFolder, targetPath)
        ]);
    }

    async check() {
        if (!this.isAlive()) {
            return true;
        }

        if (!env.config.autoCloseClient) {
            const result = await utils.confirm(
                localize('confirm.closeGame', 'Warcraft III running, to terminate?'),
                localize('confirm.accept', 'Accept'),
                localize('confirm.autoCloseGame', 'Auto close')
            );
            if (!result) {
                return false;
            }
            if (result === utils.ConfirmResult.Alt) {
                env.config.autoCloseClient = true;
            }
        }
        await this.kill();
        return true;
    }
}

export const gameRunner = new GameRunner();
