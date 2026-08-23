#!/usr/bin/env node
/**
 * Minimal automation replacement — unified CLI.
 *
 *   node src/replacement/cli.mjs <launcher|digest|janitor|backup|claude-bridge> [--live] [--config PATH]
 *
 * DRY-RUN IS THE DEFAULT. Mutation requires an explicit --live flag.
 * This CLI never deploys, never merges, and never touches the live runtime.
 */

import { loadConfig, DEFAULT_CONFIG } from "./shared/config.mjs";
import { createLogger } from "./shared/logging.mjs";
import { loadRegistry } from "../repository-registry.mjs";
import { LinearWriteClient, loadLinearShadowData } from "./shared/linear-client.mjs";
import { runClaudeBridge, runClaudeBridgeDaemon } from "./claude-bridge/index.mjs";
import { runLauncher } from "./launcher/index.mjs";
import { createProductionLauncherAdapter } from "./launcher/production-adapter.mjs";
import { runDigest } from "./digest/index.mjs";
import { runJanitor } from "./janitor/index.mjs";
import { runBackup } from "./backup/index.mjs";

const JOBS = new Set(["launcher", "digest", "janitor", "backup", "claude-bridge", "claude-bridge-daemon"]);

function parseArgs(argv) {
  const [job, ...rest] = argv;
  const opts = { job, live: false, configPath: null };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--live") opts.live = true;
    else if (rest[i] === "--config") opts.configPath = rest[++i];
    else if (rest[i] === "--linear-live-read") opts.linearLiveRead = true;
    else if (rest[i] === "--issue") opts.issueIdentifier = rest[++i];
    else if (rest[i] === "--finish-state") opts.finishStateName = rest[++i];
    else if (rest[i] === "--claude-timeout-ms") opts.claudeTimeoutMs = Number(rest[++i]);
    else if (rest[i] === "--poll-interval-ms") opts.pollIntervalMs = Number(rest[++i]);
    else if (rest[i] === "--once") opts.once = true;
    else if (rest[i] === "--help" || rest[i] === "-h") opts.help = true;
  }
  return opts;
}

function usage() {
  console.log(`Minimal automation replacement (USA-97)

Usage: node src/replacement/cli.mjs <job> [options]

Jobs:
  launcher   Poll Ready issues and plan runner launches (USA-68, USA-73)
  digest     Build the review packet and daily digest
  janitor    Report and prune safe managed worktrees
  backup     Preflight and coordinate the existing backup framework
  claude-bridge  Launch Claude Code from a Linear @Claude comment
  claude-bridge-daemon  Poll Linear for eligible @Claude comments

Options:
  --live            Perform mutations. WITHOUT THIS, NOTHING IS MUTATED.
  --linear-live-read  Read real Linear issues for launcher shadow mode (still dry-run unless --live is also passed)
  --issue IDENTIFIER  Issue for claude-bridge, e.g. USA-98
  --finish-state NAME Move issue to this state after Claude result is posted
  --claude-timeout-ms N  Claude Code timeout override; production default is 1800000ms
  --poll-interval-ms N Poll interval for claude-bridge-daemon
  --once            Run one daemon poll pass and exit
  --config PATH     JSON config overriding the defaults
  -h, --help        This message

Safety: dry-run is the default. The live dispatcher is not affected by this CLI.
`);
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help || !JOBS.has(opts.job)) {
  usage();
  process.exit(opts.help ? 0 : 1);
}

const configPath = opts.configPath ?? (opts.job === "launcher" ? "config/dispatcher.config.json" : null);
const config = loadConfig(configPath, { overrides: { dryRun: !opts.live } });
const logger = createLogger({ job: opts.job });

logger.info("job_start", { job: opts.job, dryRun: config.dryRun });

let result;
try {
  switch (opts.job) {
    case "launcher":
      if (opts.linearLiveRead) {
        const registry = loadRegistry(config.registryPath);
        const shadow = await loadLinearShadowData({ config });
        result = await runLauncher({
          config,
          context: shadow.context,
          issues: shadow.readyIssues,
          logger,
          registry,
        });
        result.shadow = {
          allIssueCount: shadow.allIssues.length,
          readyIssueCount: shadow.readyIssues.length,
          context: shadow.context,
        };
      } else if (opts.live) {
        result = await runLauncher({
          config,
          logger,
          productionAdapter: createProductionLauncherAdapter({ configPath }),
        });
      } else {
        result = await runLauncher({ config, registry: { applications: [] }, issues: [], logger });
      }
      break;
    case "digest":
      result = await runDigest({ config, issues: [], target: null, logger });
      break;
    case "janitor":
      result = await runJanitor({ config, worktrees: [], logger });
      break;
    case "backup":
      result = await runBackup({ config, logger });
      break;
    case "claude-bridge": {
      const registry = loadRegistry(config.registryPath);
      const linear = new LinearWriteClient({
        apiUrl: config.linear.apiUrl,
        teamKey: config.linear.teamKey,
      });
      result = await runClaudeBridge({
        config,
        finishStateName: opts.finishStateName ?? null,
        issueIdentifier: opts.issueIdentifier,
        linear,
        logger,
        registry,
        timeoutMs: opts.claudeTimeoutMs || undefined,
      });
      break;
    }
    case "claude-bridge-daemon": {
      const registry = loadRegistry(config.registryPath);
      const linear = new LinearWriteClient({
        apiUrl: config.linear.apiUrl,
        teamKey: config.linear.teamKey,
      });
      result = await runClaudeBridgeDaemon({
        config,
        finishStateName: opts.finishStateName ?? null,
        linear,
        logger,
        once: opts.once,
        pollIntervalMs: opts.pollIntervalMs || undefined,
        registry,
        timeoutMs: opts.claudeTimeoutMs || undefined,
      });
      break;
    }
  }
} catch (e) {
  logger.error("job_failed", { code: e.code ?? "UNKNOWN", message: e.message });
  process.exit(1);
}

logger.info("job_complete", { job: opts.job, dryRun: config.dryRun });
console.log(JSON.stringify(result, null, 2));
process.exit(result?.exitStatus ?? 0);
