/**
 * Railway API - 创建项目、关联 GitHub 仓库、触发部署
 * GraphQL API: https://backboard.railway.com/graphql/v2
 */

const RAILWAY_ENDPOINT = 'https://backboard.railway.com/graphql/v2';
const RAILWAY_TOKEN = process.env.RAILWAY_API_TOKEN;
const RAILWAY_TEAM_ID = process.env.RAILWAY_TEAM_ID;

export function isRailwayConfigured(): boolean {
  return !!RAILWAY_TOKEN;
}

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!RAILWAY_TOKEN) {
    throw new Error('Railway not configured. Set RAILWAY_API_TOKEN');
  }

  const res = await fetch(RAILWAY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RAILWAY_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'Railway API error');
  }
  return json.data as T;
}

/** 创建项目 */
async function createProject(name: string): Promise<string> {
  const teamId = RAILWAY_TEAM_ID;
  const mutation = teamId
    ? `
    mutation projectCreate($name: String!, $teamId: String!) {
      projectCreate(input: { name: $name, teamId: $teamId }) {
        id
      }
    }
  `
    : `
    mutation projectCreate($name: String!) {
      projectCreate(input: { name: $name }) {
        id
      }
    }
  `;

  const variables = teamId ? { name, teamId } : { name };
  const data = await graphql<{ projectCreate: { id: string } }>(mutation, variables);
  return data.projectCreate.id;
}

/** 创建 Environment */
async function createEnvironment(projectId: string): Promise<string> {
  const mutation = `
    mutation environmentCreate($projectId: String!) {
      environmentCreate(input: { projectId: $projectId, name: "production" }) {
        id
      }
    }
  `;
  const data = await graphql<{ environmentCreate: { id: string } }>(mutation, {
    projectId,
  });
  return data.environmentCreate.id;
}

/** 从 GitHub 仓库创建 Service */
async function createServiceFromGitHub(
  projectId: string,
  repoFullName: string
): Promise<{ serviceId: string }> {
  const mutation = `
    mutation serviceCreate($projectId: String!, $source: ServiceSourceInput!) {
      serviceCreate(input: { projectId: $projectId, source: $source }) {
        id
      }
    }
  `;
  const data = await graphql<{ serviceCreate: { id: string } }>(mutation, {
    projectId,
    source: {
      repo: repoFullName,
    },
  });
  return { serviceId: data.serviceCreate.id };
}

/** 触发部署 */
async function triggerDeploy(serviceId: string): Promise<string> {
  const mutation = `
    mutation deploymentDeploy($serviceId: String!) {
      deploymentDeploy(input: { serviceId: $serviceId }) {
        id
      }
    }
  `;
  const data = await graphql<{ deploymentDeploy: { id: string } }>(mutation, {
    serviceId,
  });
  return data.deploymentDeploy.id;
}

/** 获取 Service 的默认域名（Railway 生成的 .up.railway.app） */
async function getServiceDomains(serviceId: string): Promise<string[]> {
  const query = `
    query service($id: String!) {
      service(id: $id) {
        domains {
          serviceDomains {
            domain
          }
        }
      }
    }
  `;
  const data = await graphql<{
    service: { domains: { serviceDomains: { domain: string }[] } };
  }>(query, { id: serviceId });
  const domains = data.service?.domains?.serviceDomains ?? [];
  return domains.map((d) => d.domain).filter(Boolean);
}

/** Railway 部署状态（用于同步到 hosted_sites） */
export interface RailwayServiceStatus {
  status: 'active' | 'deploying' | 'failed' | 'crashed' | 'unknown';
  deploymentUrl: string | null;
}

/**
 * 从 Railway 获取 Service 的当前部署状态与域名
 */
export async function getServiceStatus(
  serviceId: string
): Promise<RailwayServiceStatus> {
  try {
    const domains = await getServiceDomains(serviceId);
    const deploymentUrl =
      domains.length > 0
        ? domains[0].startsWith('http')
          ? domains[0]
          : `https://${domains[0]}`
        : null;
    const status = deploymentUrl ? 'active' : 'deploying';
    return { status, deploymentUrl };
  } catch (err) {
    console.warn('[railway] getServiceStatus failed:', err);
    return { status: 'unknown', deploymentUrl: null };
  }
}

/** 设置环境变量 */
async function setVariables(
  environmentId: string,
  variables: Record<string, string>
): Promise<void> {
  for (const [key, value] of Object.entries(variables)) {
    const mutation = `
      mutation variableUpsert($input: VariableUpsertInput!) {
        variableUpsert(input: $input)
      }
    `;
    await graphql(mutation, {
      input: {
        environmentId,
        serviceId: null,
        name: key,
        value,
      },
    });
  }
}

export interface RailwayDeployResult {
  projectId: string;
  serviceId: string;
  deploymentId: string;
  deploymentUrl?: string;
}

/** 完整流程：创建项目 → 创建 GitHub Service → 触发部署 */
export async function deployToRailway(
  repoFullName: string,
  envVars?: Record<string, string>
): Promise<RailwayDeployResult> {
  const projectName = `webecho-${repoFullName.replace('/', '-')}`;
  const projectId = await createProject(projectName);
  const environmentId = await createEnvironment(projectId);
  const { serviceId } = await createServiceFromGitHub(projectId, repoFullName);

  if (envVars && Object.keys(envVars).length > 0) {
    await setVariables(environmentId, envVars);
  }

  const deploymentId = await triggerDeploy(serviceId);

  let deploymentUrl: string | undefined;
  try {
    await new Promise((r) => setTimeout(r, 5000));
    const domains = await getServiceDomains(serviceId);
    if (domains.length > 0) {
      deploymentUrl = domains[0].startsWith('http') ? domains[0] : `https://${domains[0]}`;
    }
  } catch {
    // Domain may not be ready yet
  }

  return { projectId, serviceId, deploymentId, deploymentUrl };
}
