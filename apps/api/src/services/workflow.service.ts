import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { getRepoPath } from './git.service';

const execAsync = promisify(exec);

// ─────────────────────────────────────────────────────────
// YAML Parser (lightweight, no external deps)
// ─────────────────────────────────────────────────────────

interface WorkflowDefinition {
  name: string;
  on: Record<string, unknown> | string[];
  jobs: Record<string, WorkflowJobDef>;
}

interface WorkflowJobDef {
  'runs-on'?: string;
  steps?: Array<{ name?: string; run?: string; uses?: string; with?: Record<string, string> }>;
}

function parseSimpleYaml(content: string): WorkflowDefinition {
  const lines = content.split('\n');
  const result: Record<string, unknown> = { jobs: {} };
  let currentSection = '';
  let currentJob = '';
  let currentStep: Record<string, string> | null = null;
  let inSteps = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    if (indent === 0) {
      inSteps = false;
      currentJob = '';
      currentStep = null;
      if (trimmed.startsWith('name:')) {
        result.name = trimmed.slice(5).trim().replace(/^["']|["']$/g, '');
      } else if (trimmed === 'on:' || trimmed.startsWith('on:')) {
        currentSection = 'on';
        if (trimmed.includes('[')) {
          result.on = trimmed.replace('on:', '').trim().replace(/[\[\]]/g, '').split(',').map(s => s.trim().replace(/['"]/g, ''));
        } else {
          result.on = {};
        }
      } else if (trimmed === 'jobs:') {
        currentSection = 'jobs';
      }
    } else if (currentSection === 'on' && indent <= 4) {
      const match = trimmed.match(/^(\w+):/);
      if (match && typeof result.on === 'object' && !Array.isArray(result.on)) {
        (result.on as Record<string, unknown>)[match[1]] = {};
      }
    } else if (currentSection === 'jobs' && indent === 2 && trimmed.endsWith(':')) {
      currentJob = trimmed.slice(0, -1);
      (result.jobs as Record<string, WorkflowJobDef>)[currentJob] = { steps: [] };
      inSteps = false;
    } else if (currentJob && trimmed === 'steps:') {
      inSteps = true;
    } else if (inSteps && currentJob && indent >= 6 && trimmed.startsWith('- ')) {
      currentStep = {};
      const stepContent = trimmed.slice(2);
      if (stepContent.includes(':')) {
        const [k, ...v] = stepContent.split(':');
        currentStep[k.trim()] = v.join(':').trim().replace(/^["']|["']$/g, '');
      }
      (result.jobs as Record<string, WorkflowJobDef>)[currentJob].steps!.push(currentStep as never);
    } else if (inSteps && currentStep && indent >= 8) {
      const [k, ...v] = trimmed.split(':');
      if (k && v.length) currentStep[k.trim()] = v.join(':').trim().replace(/^["']|["']$/g, '');
    } else if (currentJob && trimmed.startsWith('runs-on:')) {
      (result.jobs as Record<string, WorkflowJobDef>)[currentJob]['runs-on'] = trimmed.slice(8).trim();
    }
  }

  return result as unknown as WorkflowDefinition;
}

function getTriggers(on: Record<string, unknown> | string[]): string[] {
  if (Array.isArray(on)) return on;
  return Object.keys(on);
}

function matchesTrigger(
  triggers: string[],
  event: string,
  branch?: string,
  workflowOn?: Record<string, unknown> | string[]
): boolean {
  if (!triggers.includes(event)) return false;
  if (event === 'push' && branch && workflowOn && !Array.isArray(workflowOn)) {
    const pushConfig = workflowOn.push as { branches?: string[] } | undefined;
    if (pushConfig?.branches?.length) {
      return pushConfig.branches.some(b => branch === b || branch.match(new RegExp('^' + b.replace('*', '.*') + '$')));
    }
  }
  return true;
}

// ─────────────────────────────────────────────────────────
// Sync workflows from repo files
// ─────────────────────────────────────────────────────────

export async function syncWorkflowsFromRepo(repoId: string, owner: string, repo: string): Promise<number> {
  const repoPath = getRepoPath(owner, repo);
  if (!fs.existsSync(repoPath)) return 0;

  const workDir = path.join(os.tmpdir(), `pakhub-sync-${uuidv4()}`);
  let synced = 0;

  try {
    fs.mkdirSync(workDir, { recursive: true });
    await execAsync(`git clone "${repoPath}" "${workDir}"`);

    const workflowDirs = [
      path.join(workDir, '.pakhub', 'workflows'),
      path.join(workDir, '.github', 'workflows'),
    ];

    for (const dir of workflowDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

      for (const file of files) {
        const content = fs.readFileSync(path.join(dir, file), 'utf8');
        let parsed: WorkflowDefinition;
        try {
          parsed = parseSimpleYaml(content);
        } catch {
          continue;
        }

        const triggers = getTriggers(parsed.on);

        await prisma.workflow.upsert({
          where: { repoId_filename: { repoId, filename: file } },
          update: { name: parsed.name || file, content, triggers, isActive: true },
          create: { repoId, name: parsed.name || file, filename: file, content, triggers },
        });
        synced++;
      }
    }
  } finally {
    if (fs.existsSync(workDir)) fs.rmSync(workDir, { recursive: true, force: true });
  }

  return synced;
}

// ─────────────────────────────────────────────────────────
// Trigger workflows on events
// ─────────────────────────────────────────────────────────

export async function triggerWorkflowsOnPush(
  repoId: string,
  owner: string,
  repo: string,
  branch: string,
  commitSha?: string,
  commitMsg?: string
): Promise<void> {
  await syncWorkflowsFromRepo(repoId, owner, repo);

  const workflows = await prisma.workflow.findMany({
    where: { repoId, isActive: true },
  });

  for (const workflow of workflows) {
    let parsed: WorkflowDefinition;
    try {
      parsed = parseSimpleYaml(workflow.content);
    } catch {
      continue;
    }

    if (!matchesTrigger(workflow.triggers, 'push', branch, parsed.on)) continue;

    await queueWorkflowRun(workflow.id, repoId, 'push', branch, commitSha, commitMsg);
  }
}

export async function triggerWorkflowManually(
  workflowId: string,
  repoId: string,
  branch: string = 'main'
): Promise<string> {
  return queueWorkflowRun(workflowId, repoId, 'workflow_dispatch', branch);
}

async function queueWorkflowRun(
  workflowId: string,
  repoId: string,
  trigger: string,
  branch?: string,
  commitSha?: string,
  commitMsg?: string
): Promise<string> {
  const lastRun = await prisma.workflowRun.findFirst({
    where: { repoId },
    orderBy: { runNumber: 'desc' },
  });
  const runNumber = (lastRun?.runNumber || 0) + 1;

  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow) throw new Error('Workflow not found');

  let parsed: WorkflowDefinition;
  try {
    parsed = parseSimpleYaml(workflow.content);
  } catch {
    parsed = { name: workflow.name, on: ['push'], jobs: {} };
  }

  const run = await prisma.workflowRun.create({
    data: {
      workflowId,
      repoId,
      runNumber,
      status: 'QUEUED',
      trigger,
      branch,
      commitSha,
      commitMsg,
    },
  });

  const jobEntries = Object.entries(parsed.jobs || {});
  if (jobEntries.length === 0) {
    jobEntries.push(['default', { steps: [{ run: 'echo "No jobs defined"' }] }]);
  }

  for (const [jobName] of jobEntries) {
    await prisma.workflowJob.create({
      data: { runId: run.id, name: jobName, status: 'QUEUED' },
    });
  }

  // Execute asynchronously
  setImmediate(() => executeWorkflowRun(run.id, workflow, parsed, branch).catch(console.error));

  return run.id;
}

// ─────────────────────────────────────────────────────────
// Execute workflow run
// ─────────────────────────────────────────────────────────

async function executeWorkflowRun(
  runId: string,
  workflow: { id: string; repoId: string; content: string },
  parsed: WorkflowDefinition,
  branch?: string
): Promise<void> {
  const run = await prisma.workflowRun.findUnique({
    where: { id: runId },
    include: { repo: { include: { owner: true } }, jobs: true },
  });
  if (!run) return;

  const owner = run.repo.owner.username;
  const repoName = run.repo.name;
  const repoPath = getRepoPath(owner, repoName);
  const workDir = path.join(os.tmpdir(), `pakhub-run-${uuidv4()}`);
  const allLogs: string[] = [];

  await prisma.workflowRun.update({
    where: { id: runId },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });

  try {
    fs.mkdirSync(workDir, { recursive: true });
    await execAsync(`git clone "${repoPath}" "${workDir}"`);
    if (branch) {
      await execAsync(`git checkout "${branch}"`, { cwd: workDir }).catch(() => {});
    }

    let overallSuccess = true;

    for (const job of run.jobs) {
      const jobDef = parsed.jobs[job.name];
      const jobLogs: string[] = [`▶ Job: ${job.name}`, `  runs-on: ${jobDef?.['runs-on'] || 'ubuntu-latest'}`, ''];

      await prisma.workflowJob.update({
        where: { id: job.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });

      let jobSuccess = true;

      for (const step of jobDef?.steps || []) {
        const stepName = step.name || step.run || step.uses || 'step';
        jobLogs.push(`  ▶ Step: ${stepName}`);

        if (step.run) {
          try {
            const { stdout, stderr } = await execAsync(step.run, {
              cwd: workDir,
              timeout: 300000,
              env: { ...process.env, CI: 'true', PAKHUB: 'true', BRANCH: branch || 'main' },
            });
            if (stdout) jobLogs.push(stdout.trim());
            if (stderr) jobLogs.push(stderr.trim());
            jobLogs.push(`  ✓ Step completed`);
          } catch (err: unknown) {
            const error = err as { stdout?: string; stderr?: string; message?: string };
            jobLogs.push(`  ✗ Step failed: ${error.message || 'Unknown error'}`);
            if (error.stdout) jobLogs.push(error.stdout);
            if (error.stderr) jobLogs.push(error.stderr);
            jobSuccess = false;
            break;
          }
        } else if (step.uses) {
          jobLogs.push(`  ✓ Action ${step.uses} (simulated)`);
        }
        jobLogs.push('');
      }

      const jobLogText = jobLogs.join('\n');
      allLogs.push(jobLogText);

      await prisma.workflowJob.update({
        where: { id: job.id },
        data: {
          status: jobSuccess ? 'SUCCESS' : 'FAILURE',
          logs: jobLogText,
          completedAt: new Date(),
        },
      });

      if (!jobSuccess) overallSuccess = false;
    }

    await prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: overallSuccess ? 'SUCCESS' : 'FAILURE',
        logs: allLogs.join('\n\n'),
        completedAt: new Date(),
      },
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    allLogs.push(`Fatal error: ${error.message}`);
    await prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: 'FAILURE',
        logs: allLogs.join('\n'),
        completedAt: new Date(),
      },
    });
  } finally {
    if (fs.existsSync(workDir)) fs.rmSync(workDir, { recursive: true, force: true });
  }
}

export async function getWorkflowRuns(repoId: string, page = 1, limit = 20) {
  const [runs, total] = await Promise.all([
    prisma.workflowRun.findMany({
      where: { repoId },
      include: {
        workflow: { select: { id: true, name: true, filename: true } },
        jobs: { select: { id: true, name: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.workflowRun.count({ where: { repoId } }),
  ]);
  return { runs, total, page, limit };
}

export async function getWorkflowRun(runId: string) {
  return prisma.workflowRun.findUnique({
    where: { id: runId },
    include: {
      workflow: true,
      jobs: true,
      repo: { include: { owner: { select: { username: true } } } },
    },
  });
}

export { parseSimpleYaml };
