// Core types for the PISA-HUB platform

export interface User {
  id: string
  username: string
  email: string
  name: string | null
  displayName: string
  bio?: string | null
  avatarUrl?: string | null
  location?: string
  website?: string
  company?: string
  twitterHandle?: string
  publicRepos: number
  publicGists: number
  followers: number
  following: number
  isAdmin: boolean
  totpEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface Repository {
  id: string
  name: string
  fullName: string
  description?: string
  isPrivate: boolean
  isArchived: boolean
  isFork: boolean
  defaultBranch: string
  language?: string
  languages?: LanguageStats
  topics: string[]
  stargazersCount: number
  forksCount: number
  watchersCount: number
  openIssuesCount: number
  size: number
  owner: User
  parentRepo?: Repository
  cloneUrl: string
  sshUrl: string
  homepage?: string
  license?: License
  createdAt: string
  updatedAt: string
  pushedAt: string
  hasStarred?: boolean
  hasWatched?: boolean
  hasForked?: boolean
}

export interface License {
  key: string
  name: string
  spdxId: string
}

export interface LanguageStats {
  [language: string]: number
}

export interface Branch {
  name: string
  commit: {
    sha: string
    url: string
  }
  protected: boolean
}

export interface Tag {
  name: string
  commit: {
    sha: string
    url: string
  }
  zipballUrl: string
  tarballUrl: string
}

export interface Commit {
  sha: string
  message: string
  author: CommitAuthor
  committer: CommitAuthor
  timestamp: string
  url: string
  stats?: {
    additions: number
    deletions: number
    total: number
  }
  files?: CommitFile[]
}

export interface CommitAuthor {
  name: string
  email: string
  date: string
  login?: string
  avatarUrl?: string
}

export interface CommitFile {
  filename: string
  status: 'added' | 'modified' | 'removed' | 'renamed'
  additions: number
  deletions: number
  changes: number
  patch?: string
  previousFilename?: string
}

export interface FileEntry {
  name: string
  path: string
  sha: string
  size: number
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  url: string
  downloadUrl?: string
  content?: string
  encoding?: string
  lastCommit?: {
    sha: string
    message: string
    author: CommitAuthor
    timestamp: string
  }
}

export interface Issue {
  id: string
  number: number
  title: string
  body?: string
  state: 'open' | 'closed'
  author: User
  assignees: User[]
  labels: Label[]
  milestone?: Milestone
  comments: number
  reactions?: Reactions
  closedAt?: string
  createdAt: string
  updatedAt: string
  isPullRequest: boolean
}

export interface PullRequest {
  id: string
  number: number
  title: string
  body?: string
  state: 'open' | 'closed' | 'merged'
  isDraft: boolean
  author: User
  assignees: User[]
  reviewers: ReviewRequest[]
  labels: Label[]
  milestone?: Milestone
  headBranch: string
  baseBranch: string
  headSha: string
  mergeable?: boolean
  mergedAt?: string
  mergedBy?: User
  comments: number
  reviewComments: number
  commits: number
  additions: number
  deletions: number
  changedFiles: number
  reactions?: Reactions
  checks?: Check[]
  aiReview?: AIReview
  createdAt: string
  updatedAt: string
}

export interface ReviewRequest {
  user: User
  state: 'pending' | 'approved' | 'changes_requested' | 'commented' | 'dismissed'
}

export interface Label {
  id: string
  name: string
  color: string
  description?: string
}

export interface Milestone {
  id: string
  number: number
  title: string
  description?: string
  state: 'open' | 'closed'
  openIssues: number
  closedIssues: number
  dueOn?: string
  createdAt: string
}

export interface Comment {
  id: string
  body: string
  author: User
  reactions?: Reactions
  isEdited: boolean
  createdAt: string
  updatedAt: string
}

export interface ReviewComment extends Comment {
  path?: string
  line?: number
  diffHunk?: string
  inReplyToId?: string
  position?: number
  originalPosition?: number
  commitId?: string
}

export interface Review {
  id: string
  author: User
  body?: string
  state: 'pending' | 'approved' | 'changes_requested' | 'commented' | 'dismissed'
  submittedAt?: string
  comments?: ReviewComment[]
}

export interface Reactions {
  totalCount: number
  thumbsUp: number
  thumbsDown: number
  laugh: number
  hooray: number
  confused: number
  heart: number
  rocket: number
  eyes: number
}

export interface Check {
  id: string
  name: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required'
  url?: string
  startedAt?: string
  completedAt?: string
}

export interface AIReview {
  id: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  summary?: string
  comments: AIReviewComment[]
  score?: number
  createdAt: string
}

export interface AIReviewComment {
  id: string
  severity: 'critical' | 'warning' | 'info' | 'suggestion'
  path: string
  line: number
  message: string
  suggestion?: string
}

export interface Notification {
  id: string
  type: 'issue' | 'pull_request' | 'commit' | 'release' | 'review' | 'mention' | 'team_mention'
  title: string
  reason: 'assign' | 'author' | 'comment' | 'invitation' | 'manual' | 'mention' | 'review_requested' | 'state_change' | 'subscribed' | 'team_mention'
  unread: boolean
  subject: {
    title: string
    url: string
    latestCommentUrl?: string
  }
  repository: Repository
  updatedAt: string
  lastReadAt?: string
}

export interface Activity {
  id: string
  type: string
  actor: User
  repo?: Repository
  payload: Record<string, unknown>
  createdAt: string
}

export interface ContributionDay {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

export interface ContributionWeek {
  days: ContributionDay[]
}

export interface ContributionGraph {
  totalContributions: number
  weeks: ContributionWeek[]
}

export interface SearchResult<T> {
  totalCount: number
  incompleteResults: boolean
  items: T[]
}

export interface AIProvider {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'groq' | 'ollama' | 'cohere' | 'mistral'
  model: string
  apiKey?: string
  baseUrl?: string
  isDefault: boolean
  features: ('code_review' | 'pr_description' | 'copilot' | 'issue_triage')[]
}

export interface UserSettings {
  profile: {
    displayName: string
    bio: string
    location: string
    website: string
    company: string
    twitterHandle: string
  }
  notifications: {
    email: boolean
    web: boolean
    emailDigest: 'never' | 'daily' | 'weekly'
  }
  appearance: {
    theme: 'dark' | 'light' | 'system'
    fontSize: 'sm' | 'md' | 'lg'
    tabSize: 2 | 4
  }
  security: {
    twoFactorEnabled: boolean
  }
  aiProviders: AIProvider[]
}

export interface ApiError {
  message: string
  status: number
  errors?: { field: string; message: string }[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export type SortOrder = 'asc' | 'desc'

export interface RepoListParams {
  sort?: 'created' | 'updated' | 'pushed' | 'full_name' | 'stars' | 'forks'
  direction?: SortOrder
  type?: 'all' | 'owner' | 'public' | 'private' | 'member'
  page?: number
  perPage?: number
}

export interface IssueListParams {
  state?: 'open' | 'closed' | 'all'
  labels?: string
  sort?: 'created' | 'updated' | 'comments'
  direction?: SortOrder
  page?: number
  perPage?: number
  assignee?: string
  milestone?: string
  q?: string
}

export interface CommitListParams {
  sha?: string
  path?: string
  author?: string
  since?: string
  until?: string
  page?: number
  perPage?: number
}

export interface CreateRepoInput {
  name: string
  description?: string
  isPrivate: boolean
  initReadme: boolean
  gitignoreTemplate?: string
  licenseTemplate?: string
}

export interface CreateIssueInput {
  title: string
  body?: string
  labels?: string[]
  assignees?: string[]
  milestone?: string
}

export interface CreatePullRequestInput {
  title: string
  body?: string
  headBranch: string
  baseBranch: string
  isDraft?: boolean
  labels?: string[]
  assignees?: string[]
  reviewers?: string[]
}

export interface CreateCommentInput {
  body: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginInput {
  email: string
  password: string
  rememberMe?: boolean
  totpCode?: string
}

export interface RegisterInput {
  username: string
  email: string
  password: string
  confirmPassword: string
}
