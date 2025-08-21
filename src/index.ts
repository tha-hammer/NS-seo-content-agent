#!/usr/bin/env node

import { CLI } from './cli';
import { config } from 'dotenv';

// Load environment variables
config();

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Run the CLI with command line arguments
CLI.main(process.argv).catch((error) => {
  console.error('CLI Error:', error);
  process.exit(1);
});