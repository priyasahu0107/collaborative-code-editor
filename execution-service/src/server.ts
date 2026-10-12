/**
 * Execution Service Server
 * 
 * Provides the execution API separately from the main API server.
 * Code execution remains disabled until a secure sandbox runtime is configured.
 */

import { createApp } from './app.js';

const app = createApp();
const PORT = parseInt(process.env['PORT'] || '4000', 10);

app.listen(PORT, () => {
  console.log(`Execution API listening on port ${PORT}; code execution is disabled.`);
});
