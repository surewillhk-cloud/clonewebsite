export type HostingPlan =
  | 'static_starter'
  | 'static_growth'
  | 'dynamic_basic'
  | 'dynamic_pro';

export type HostedSiteStatus = 'deploying' | 'active' | 'suspended' | 'cancelled';

export interface HostedSite {
  id: string;
  userId: string;
  cloneTaskId: string;
  githubRepoUrl: string | null;
  githubRepoName: string | null;
  railwayProjectId: string | null;
  railwayServiceId: string | null;
  railwayDeploymentUrl: string | null;
  customDomain: string | null;
  domainVerified: boolean;
  hostingPlan: HostingPlan;
  stripeSubscriptionId: string | null;
  status: HostedSiteStatus;
  railwayBudgetUsed: number;
  createdAt: string;
  suspendedAt: string | null;
}

export interface DeployResult {
  siteId: string;
  status: 'deploying';
  githubRepoUrl: string;
  railwayProjectId: string;
  railwayServiceId?: string;
  deploymentUrl?: string;
}
