import { app, Notification } from 'electron';
import log from 'electron-log/main.js';
import electronUpdater from 'electron-updater';
import type { ProgressInfo, UpdateInfo } from 'electron-updater';

import type { UpdaterState } from '../shared/types';
import { t } from './i18n';

const { autoUpdater } = electronUpdater;
/* This build checks for updates only when the user asks for it. Nothing
   downloads or installs on its own, so a personal build stays as built. */
let state: UpdaterState = { kind: 'idle' };
let initialized = false;
let checking: Promise<void> | undefined;
let publish: (state: UpdaterState) => void = () => undefined;
type UpdateEvent = Parameters<typeof autoUpdater.on>[0];
const listeners: Array<[UpdateEvent, (...args: any[]) => void]> = [];

export function getUpdaterState(): UpdaterState { return state; }
function setState(next: UpdaterState): void { state = next; publish(next); }
function listen(event: UpdateEvent, listener: (...args: any[]) => void): void {
  autoUpdater.on(event, listener);
  listeners.push([event, listener]);
}

export function initializeAutoUpdater(onChange: (state: UpdaterState) => void = () => undefined): void {
  if (initialized) return;
  publish = onChange;
  if (!app.isPackaged) { setState({ kind: 'disabled' }); return; }
  initialized = true;
  setState({ kind: 'idle' });
  autoUpdater.logger = log;
  /* Manual checks download the update and tell the user; nothing runs on its own. */
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = false;
  listen('checking-for-update', () => setState({ kind: 'checking' }));
  listen('update-available', (info: UpdateInfo) => setState({ kind: 'available', version: info.version }));
  listen('update-not-available', () => setState({ kind: 'current' }));
  listen('download-progress', (progress: ProgressInfo) => {
    if (state.kind !== 'available' && state.kind !== 'downloading') return;
    const percent = Math.max(0, Math.min(100, Math.round(progress.percent)));
    if (state.kind === 'downloading' && state.percent === percent) return;
    setState({ kind: 'downloading', version: state.version, percent });
  });
  listen('update-downloaded', (info: UpdateInfo) => {
    setState({ kind: 'downloaded', version: info.version });
    if (Notification.isSupported()) {
      new Notification({ title: t().updater.ready, body: t().updater.readyBody(info.version) }).show();
    }
  });
  listen('error', (error: Error) => {
    log.error('[yap:updater] error', error);
    setState({ kind: 'error' });
  });
}

export function disposeAutoUpdater(): void {
  for (const [event, listener] of listeners) autoUpdater.removeListener(event, listener);
  listeners.length = 0;
  initialized = false;
  publish = () => undefined;
}

export async function checkForUpdatesManually(): Promise<UpdaterState> {
  await runCheck();
  return state;
}

export function installDownloadedUpdate(canRestart: boolean): boolean {
  if (!initialized || state.kind !== 'downloaded' || !canRestart) return false;
  // Run after the IPC response, so the renderer can finish its pending action.
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return true;
}

async function runCheck(): Promise<void> {
  if (!initialized || state.kind === 'downloaded' || state.kind === 'downloading' || state.kind === 'available') return;
  if (checking) return checking;
  checking = (async () => {
    try { await autoUpdater.checkForUpdates(); }
    catch (error) { log.error('[yap:updater] check failed', error); setState({ kind: 'error' }); }
  })();
  try { await checking; } finally { checking = undefined; }
}
