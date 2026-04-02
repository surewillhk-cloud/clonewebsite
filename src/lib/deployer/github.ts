/**
 * GitHub API - 创建私有仓库并推送代码
 */

import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_ORG = process.env.GITHUB_ORG_NAME;

export function isGitHubConfigured(): boolean {
  return !!GITHUB_TOKEN;
}

function getOctokit(): Octokit {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub not configured. Set GITHUB_TOKEN or GITHUB_APP_PRIVATE_KEY');
  }
  return new Octokit({
    auth: GITHUB_TOKEN,
    userAgent: 'ch007ai-deployer',
  });
}

/** 创建私有仓库，返回 repo 完整名 owner/name */
export async function createRepository(
  repoName: string,
  description?: string
): Promise<{ fullName: string; cloneUrl: string }> {
  const octokit = getOctokit();

  const { data } = GITHUB_ORG
    ? await octokit.repos.createInOrg({
        org: GITHUB_ORG,
        name: repoName,
        description: description ?? 'Cloned by CH007',
        private: true,
      })
    : await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: description ?? 'Cloned by CH007',
        private: true,
      });

  const fullName = data.full_name!;
  const cloneUrl = `https://github.com/${fullName}.git`;

  return { fullName, cloneUrl };
}

/** 从本地目录推送代码到 GitHub */
export async function pushToGitHub(
  projectDir: string,
  cloneUrl: string
): Promise<void> {
  const git = simpleGit(projectDir);

  await git.init();
  await git.addConfig('user.email', 'deploy@ch007.ai');
  await git.addConfig('user.name', 'CH007 Deploy');

  const gitDir = path.join(projectDir, '.git');
  await fs.mkdir(gitDir, { recursive: true });
  await fs.writeFile(
    path.join(gitDir, 'credentials'),
    `https://${GITHUB_TOKEN}@github.com`,
    { mode: 0o600 }
  );
  await git.addConfig('credential.helper', `store --file ${path.join(gitDir, 'credentials')}`);

  await git.add('.');
  await git.commit('Initial commit - CH007 clone');
  await git.branch(['-M', 'main']);
  await git.addRemote('origin', cloneUrl);
  await git.push(['-u', 'origin', 'main']);
}
