// ============================================================
// PISA-HUB Shared Types
// Used by both frontend (apps/web) and backend (apps/api)
// ============================================================

// ──────────────────────────────────────────────────────────
// User & Auth
// ──────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  website: string | null;
  location: string | null;
  twitterHandle: string | null;
  totpEnabled: boolean;
  isAdmin: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed
  followersCount?: number;
  followingCount?: number;
  reposCount?: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface SshKey {
  id: string;
  userId: string;
  title: string;
  publicKey: string;
  fingerprint: string;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────
// Repository
// ──────────────────────────────────────────────────────────

export interface Repository {
  id: string;
  name: string;
  fullName: string; // owner/repo
  description: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  ownerId: string;
  orgId: string | null;
  forkedFromId: string | null;
  isArchived: boolean;
  website: string | null;
  topics: string[];
  size: number;
  starsCount: number;
  forksCount: number;
  watchersCount: number;
  openIssuesCount: number;
  language: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  owner?: User;
  forkedFrom?: Repository | null;
  isStarred?: boolean;
  isWatched?: boolean;
}

export interface Branch {
  id: string;
  repoId: string;
  name: string;
  sha: string;
  isProtected: boolean;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────
// Git Objects
// ──────────────────────────────────────────────────────────

export interface TreeEntry {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  // Enriched
  lastCommit?: {
    message: string;
    sha: string;
    authorName: string;
    authorDate: string;
  };
}

export interface Commit {
  sha: string;
  message: string;
  shortSha: string;
  author: {
    name: string;
    email: string;
    date: string;
    avatarUrl?: string;
    username?: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  parents: string[];
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

export interface FileDiff {
  oldPath: string;
  newPath: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'add' | 'delete';
  content: string;
  oldLine?: number;
  newLine?: number;
}

// ──────────────────────────────────────────────────────────
// Issues
// ──────────────────────────────────────────────────────────

export type IssueState = 'OPEN' | 'CLOSED';

export interface Label {
  id: string;
  repoId: string;
  name: string;
  color: string;
  description: string | null;
}

export interface Milestone {
  id: string;
  repoId: string;
  title: string;
  description: string | null;
  state: 'OPEN' | 'CLOSED';
  dueDate: string | null;
  openIssues?: number;
  closedIssues?: number;
  createdAt: string;
}

export interface Issue {
  id: string;
  repoId: string;
  number: number;
  title: string;
  body: string | null;
  state: IssueState;
  authorId: string;
  milestoneId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  // Relations
  author?: User;
  labels?: Label[];
  assignees?: User[];
  milestone?: Milestone | null;
  commentsCount?: number;
}

export interface Comment {
  id: string;
  issueId: string | null;
  pullRequestId: string | null;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
}

// ──────────────────────────────────────────────────────────
// Pull Requests
// ──────────────────────────────────────────────────────────

export type PullRequestState = 'OPEN' | 'CLOSED' | 'MERGED';
export type ReviewState = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';

export interface PullRequest {
  id: string;
  repoId: string;
  number: number;
  title: string;
  body: string | null;
  state: PullRequestState;
  authorId: string;
  headBranch: string;
  baseBranch: string;
  headSha: string;
  baseSha: string;
  isDraft: boolean;
  mergedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  author?: User;
  labels?: Label[];
  assignees?: User[];
  reviewers?: User[];
  milestone?: Milestone | null;
  commentsCount?: number;
  reviewsCount?: number;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  isMergeable?: boolean;
}

export interface Review {
  id: string;
  pullRequestId: string;
  authorId: string;
  state: ReviewState;
  body: string | null;
  submittedAt: string;
  author?: User;
  comments?: ReviewComment[];
}

export interface ReviewComment {
  id: string;
  reviewId: string | null;
  pullRequestId: string;
  authorId: string;
  path: string;
  line: number;
  body: string;
  createdAt: string;
  author?: User;
}

// ──────────────────────────────────────────────────────────
// Notifications
// ──────────────────────────────────────────────────────────

export type NotificationType =
  | 'ISSUE_OPENED'
  | 'ISSUE_CLOSED'
  | 'ISSUE_COMMENTED'
  | 'PR_OPENED'
  | 'PR_CLOSED'
  | 'PR_MERGED'
  | 'PR_REVIEWED'
  | 'PR_COMMENTED'
  | 'STAR'
  | 'FORK'
  | 'FOLLOW'
  | 'MENTION'
  | 'RELEASE';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────
// Releases
// ──────────────────────────────────────────────────────────

export interface Release {
  id: string;
  repoId: string;
  tagName: string;
  name: string | null;
  body: string | null;
  isDraft: boolean;
  isPrerelease: boolean;
  authorId: string;
  createdAt: string;
  author?: User;
  assets?: ReleaseAsset[];
}

export interface ReleaseAsset {
  id: string;
  releaseId: string;
  name: string;
  contentType: string;
  size: number;
  downloadUrl: string;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────
// AI
// ──────────────────────────────────────────────────────────

export type AIProvider = 'GEMINI' | 'GROQ' | 'OPENAI' | 'ANTHROPIC' | 'MISTRAL' | 'COHERE' | 'OLLAMA' | 'CUSTOM';

export interface UserAiProvider {
  id: string;
  userId: string;
  provider: AIProvider;
  selectedModel: string;
  isDefault: boolean;
  useFor: string[]; // ['copilot', 'review', 'chat']
  createdAt: string;
}

export interface AIReviewComment {
  path: string;
  line: number;
  severity: 'critical' | 'warning' | 'info' | 'suggestion';
  message: string;
  suggestion?: string;
}

export interface AIReviewResult {
  summary: string;
  score: number; // 0-100
  comments: AIReviewComment[];
  positives: string[];
}

// ──────────────────────────────────────────────────────────
// Search
// ──────────────────────────────────────────────────────────

export interface SearchResults {
  repositories: Repository[];
  users: User[];
  issues: Issue[];
  totalCount: number;
}

// ──────────────────────────────────────────────────────────
// Organization
// ──────────────────────────────────────────────────────────

export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface Organization {
  id: string;
  name: string;
  displayName: string | null;
  description: string | null;
  avatarUrl: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
  membersCount?: number;
  reposCount?: number;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  user?: User;
}

// ──────────────────────────────────────────────────────────
// API Response Wrapper
// ──────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
