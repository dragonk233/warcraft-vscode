/**
 * @File   : app.ts
 * @Author : Dencer (tdaddon@163.com)
 * @Link   : https://dengsir.github.io
 * @Date   : 5/24/2019, 10:48:53 AM
 */

import * as vscode from 'vscode';
import debounce from 'lodash-es/debounce';

import { env } from '../env';
import { globals, ConfigurationType } from '../globals';
import { registerCommand, registerCheckedCommand } from './command';
import { debugCompiler, releaseCompiler } from './compiler';
import { debugPacker } from './packer';
import { gameRunner, editorRunner } from './runner';
import { project, library } from './project';

export class App implements vscode.Disposable {
    private subscriptions: vscode.Disposable[] = [];
    private reloader = debounce(() => env.config.reload(), 100);
    private configurationButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);

    dispose() {
        this.configurationButton.dispose();
        this.subscriptions.forEach(sub => sub.dispose());
    }

    constructor() {
        this.initListeners();
        this.initCommands();
        this.initStatusBar();
    }

    private get compiler() {
        return env.config.configuration === ConfigurationType.Release ? releaseCompiler : debugCompiler;
    }

    private get packer() {
        return debugPacker;
    }

    private initListeners() {
        if (env.rootPath) {
            const watcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(env.rootPath, globals.FILE_PROJECT)
            );

            this.subscriptions.push(
                watcher.onDidChange(() => this.reload()),
                watcher.onDidCreate(() => this.reload()),
                watcher.onDidDelete(() => this.reload())
            );
        }

        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('warcraft')) {
                this.reload();
            }
        });
    }

    private initStatusBar() {
        this.configurationButton.command = 'extension.warcraft.project.toggleConfiguration';
        this.configurationButton.show();
        this.updateConfigurationButton();
    }

    private initCommands() {
        this.subscriptions.push(
            registerCommand('compile.debug', () => this.compiler.execute()),
            registerCommand('pack.debug', async () => {
                await this.compiler.execute();
                await this.packer.execute();
            }),
            registerCheckedCommand('run.debug', async () => {
                if (!(await gameRunner.check())) {
                    return;
                }
                await this.compiler.execute();
                await this.packer.execute();
                await gameRunner.execute();
            }),
            registerCheckedCommand('run.editor', async () => {
                if (!(await editorRunner.check())) {
                    return;
                }
                await editorRunner.execute();
            }),
            registerCommand('project.create', () => project.create()),
            registerCommand('project.clean', () => project.clean()),
            registerCommand('project.addlibrary', () => library.add()),
            registerCommand('project.toggleConfiguration', () => project.toggleConfiguration())
        );
    }

    private reload() {
        this.reloader();
        this.updateConfigurationButton();
    }

    private updateConfigurationButton() {
        this.configurationButton.text = '$(gear) ' + ConfigurationType[env.config.configuration];
    }
}

export const app = new App();
