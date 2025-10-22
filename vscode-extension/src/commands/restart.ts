/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path = require('path');
import {workspace} from 'vscode';
import {createAndStartCompiler, killCompiler} from '../compiler';
import {getConfig} from '../config';
import {RelayExtensionContext} from '../context';
import {
  createAndStartLanguageClient,
  killLanguageClient,
} from '../languageClient';
import {findRelayBinaryWithWarnings} from '../utils/findRelayBinary';

export async function handleRestartLanguageServerCommand(
  context: RelayExtensionContext,
): Promise<void> {
  const config = getConfig();

  // Was the relay compiler running? Should we auto start it based on their config?
  const shouldRestartCompiler =
    Boolean(context.compilerTerminal) || config.autoStartCompiler;

  const compilerKilledSuccessfully = killCompiler(context);

  // Recompute rootPath based on the current configuration
  let rootPath = workspace.rootPath || process.cwd();
  if (config.rootDirectory) {
    rootPath = path.join(rootPath, config.rootDirectory);
  }

  // Re-find the relay binary in case the rootDirectory changed
  const binary = await findRelayBinaryWithWarnings(
    context.primaryOutputChannel,
  );

  if (!binary) {
    context.primaryOutputChannel.appendLine(
      'Cannot restart: Could not find a valid relay compiler binary at the new location.',
    );
    return;
  }

  // Update the context with the new rootPath and binary information
  context.relayBinaryExecutionOptions = {
    rootPath,
    binaryPath: binary.path,
    binaryVersion: binary.version,
  };

  context.primaryOutputChannel.appendLine(
    `Restarting with rootPath: ${rootPath}`,
  );
  context.primaryOutputChannel.appendLine(
    `Using relay binary: ${binary.path} (version ${binary.version})`,
  );

  if (compilerKilledSuccessfully && shouldRestartCompiler) {
    createAndStartCompiler(context);
  }

  killLanguageClient(context).then(languageClientKilledSuccessfully => {
    if (languageClientKilledSuccessfully) {
      createAndStartLanguageClient(context);
    }
  });
}
