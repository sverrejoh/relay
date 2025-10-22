/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {createAndStartCompiler, killCompiler} from '../compiler';
import {getConfig} from '../config';
import {RelayExtensionContext} from '../context';
import {
  createAndStartLanguageClient,
  killLanguageClient,
} from '../languageClient';
import {resolveRelayBinaryExecutionOptions} from '../utils/findRelayBinary';

export async function handleRestartLanguageServerCommand(
  context: RelayExtensionContext,
): Promise<void> {
  const config = getConfig();

  // Was the relay compiler running? Should we auto start it based on their config?
  const shouldRestartCompiler =
    Boolean(context.compilerTerminal) || config.autoStartCompiler;

  // Re-resolve binary execution options with the latest configuration
  const binaryExecutionOptions =
    await resolveRelayBinaryExecutionOptions(context.primaryOutputChannel);

  if (binaryExecutionOptions) {
    context.relayBinaryExecutionOptions = binaryExecutionOptions;
    // Clear cached JSON schema since binary/config may have changed
    context.textDocumentContentProvider?.clearCache();
  }

  const compilerKilledSuccessfully = killCompiler(context);

  if (compilerKilledSuccessfully && shouldRestartCompiler) {
    createAndStartCompiler(context);
  }

  killLanguageClient(context).then(languageClientKilledSuccessfully => {
    if (languageClientKilledSuccessfully) {
      createAndStartLanguageClient(context);
    }
  });
}
