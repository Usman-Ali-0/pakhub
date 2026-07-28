import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        localStorage.setItem('access_token', data.data.accessToken);
        localStorage.setItem('refresh_token', data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ────────────────────────────────────────────────
export const authApi = {
  register: (data: { username: string; email: string; password: string; name?: string }) =>
    api.post('/auth/register', data).then(r => r.data.data),
  login: (data: { login: string; password: string; totpCode?: string }) =>
    api.post('/auth/login', data).then(r => r.data.data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }).then(r => r.data.data),
  me: () => api.get('/auth/me').then(r => r.data.data),
  updateMe: (data: any) => api.put('/auth/me', data).then(r => r.data.data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data).then(r => r.data),
  enableTotp: () => api.post('/auth/totp/enable').then(r => r.data.data),
  verifyTotp: (code: string) => api.post('/auth/totp/verify', { code }).then(r => r.data.data),
  disableTotp: (password: string) => api.post('/auth/totp/disable', { password }).then(r => r.data.data),
  getSshKeys: () => api.get('/auth/ssh-keys').then(r => r.data.data),
  addSshKey: (data: { title: string; publicKey: string }) => api.post('/auth/ssh-keys', data).then(r => r.data.data),
  deleteSshKey: (id: string) => api.delete(`/auth/ssh-keys/${id}`).then(r => r.data),
  uploadAvatar: (file: File) => {
    const data = new FormData();
    data.append('avatar', file);
    return api.post('/upload/avatar', data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);
  },
};

// ─── Users ───────────────────────────────────────────────
export const usersApi = {
  getUser: (username: string) => api.get(`/users/${username}`).then(r => r.data.data),
  getUserRepos: (username: string) => api.get(`/users/${username}/repos`).then(r => r.data.data),
  getUserStarred: (username: string) => api.get(`/users/${username}/starred`).then(r => r.data.data),
  getFollowers: (username: string) => api.get(`/users/${username}/followers`).then(r => r.data.data),
  getFollowing: (username: string) => api.get(`/users/${username}/following`).then(r => r.data.data),
  follow: (username: string) => api.post(`/users/${username}/follow`).then(r => r.data.data),
  listUsers: (params?: { q?: string; page?: number }) => api.get('/users', { params }).then(r => r.data),
};

// ─── Repos ───────────────────────────────────────────────
export const reposApi = {
  getRepo: (owner: string, repo: string) => api.get(`/repos/${owner}/${repo}`).then(r => r.data.data),
  createRepo: (data: any) => api.post('/repos', data).then(r => r.data.data),
  updateRepo: (owner: string, repo: string, data: any) => api.put(`/repos/${owner}/${repo}`, data).then(r => r.data.data),
  deleteRepo: (owner: string, repo: string) => api.delete(`/repos/${owner}/${repo}`).then(r => r.data),
  forkRepo: (owner: string, repo: string) => api.post(`/repos/${owner}/${repo}/fork`).then(r => r.data.data),
  starRepo: (owner: string, repo: string) => api.post(`/repos/${owner}/${repo}/star`).then(r => r.data.data),
  getBranches: (owner: string, repo: string) => api.get(`/repos/${owner}/${repo}/branches`).then(r => r.data.data),
  getTags: (owner: string, repo: string) => api.get(`/repos/${owner}/${repo}/tags`).then(r => r.data.data),
  getLanguages: (owner: string, repo: string) => api.get(`/repos/${owner}/${repo}/languages`).then(r => r.data.data),
  getContributors: (owner: string, repo: string) => api.get(`/repos/${owner}/${repo}/contributors`).then(r => r.data.data),
  uploadFile: (owner: string, repo: string, file: File, branch = 'main', commitMessage = 'Add files via web') => {
    const data = new FormData();
    data.append('file', file);
    data.append('branch', branch);
    data.append('commitMessage', commitMessage);
    return api.post(`/upload/repo/${owner}/${repo}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);
  },
  getReleases: (owner: string, repo: string) =>
    api.get(`/repos/${owner}/${repo}/releases`).then(r => r.data),
};

// ─── Git ─────────────────────────────────────────────────
export const gitApi = {
  getTree: (owner: string, repo: string, ref = 'HEAD', path = '') =>
    api.get(`/git/${owner}/${repo}/contents`, { params: { ref, path } }).then(r => r.data.data),
  getBlob: (owner: string, repo: string, ref: string, path: string) =>
    api.get(`/git/${owner}/${repo}/blob`, { params: { ref, path } }).then(r => r.data.data),
  getCommits: (owner: string, repo: string, ref = 'HEAD', params?: { page?: number; limit?: number; path?: string }) =>
    api.get(`/git/${owner}/${repo}/commits`, { params: { ref, ...params } }).then(r => r.data.data),
  getCommit: (owner: string, repo: string, sha: string) =>
    api.get(`/git/${owner}/${repo}/commit/${sha}`).then(r => r.data.data),
  compare: (owner: string, repo: string, base: string, head: string) =>
    api.get(`/git/${owner}/${repo}/compare/${base}...${head}`).then(r => r.data.data),
};

// ─── Issues ──────────────────────────────────────────────
export const issuesApi = {
  list: (owner: string, repo: string, params?: any) =>
    api.get(`/issues/${owner}/${repo}`, { params }).then(r => r.data),
  get: (owner: string, repo: string, number: number) =>
    api.get(`/issues/${owner}/${repo}/${number}`).then(r => r.data.data),
  create: (owner: string, repo: string, data: any) =>
    api.post(`/issues/${owner}/${repo}`, data).then(r => r.data.data),
  update: (owner: string, repo: string, number: number, data: any) =>
    api.patch(`/issues/${owner}/${repo}/${number}`, data).then(r => r.data.data),
  getComments: (owner: string, repo: string, number: number) =>
    api.get(`/issues/${owner}/${repo}/${number}/comments`).then(r => r.data.data),
  addComment: (owner: string, repo: string, number: number, body: string) =>
    api.post(`/issues/${owner}/${repo}/${number}/comments`, { body }).then(r => r.data.data),
  getLabels: (owner: string, repo: string) =>
    api.get(`/issues/${owner}/${repo}/labels`).then(r => r.data.data),
  createLabel: (owner: string, repo: string, data: any) =>
    api.post(`/issues/${owner}/${repo}/labels`, data).then(r => r.data.data),
};

// ─── Pull Requests ────────────────────────────────────────
export const pullsApi = {
  list: (owner: string, repo: string, params?: any) =>
    api.get(`/pulls/${owner}/${repo}`, { params }).then(r => r.data),
  get: (owner: string, repo: string, number: number) =>
    api.get(`/pulls/${owner}/${repo}/${number}`).then(r => r.data.data),
  create: (owner: string, repo: string, data: any) =>
    api.post(`/pulls/${owner}/${repo}`, data).then(r => r.data.data),
  update: (owner: string, repo: string, number: number, data: any) =>
    api.patch(`/pulls/${owner}/${repo}/${number}`, data).then(r => r.data.data),
  merge: (owner: string, repo: string, number: number) =>
    api.post(`/pulls/${owner}/${repo}/${number}/merge`).then(r => r.data),
  addComment: (owner: string, repo: string, number: number, body: string) =>
    api.post(`/pulls/${owner}/${repo}/${number}/comments`, { body }).then(r => r.data.data),
  submitReview: (owner: string, repo: string, number: number, data: any) =>
    api.post(`/pulls/${owner}/${repo}/${number}/reviews`, data).then(r => r.data.data),
  aiReview: (owner: string, repo: string, number: number) =>
    api.post(`/pulls/${owner}/${repo}/${number}/ai-review`).then(r => r.data.data),
  aiSummary: (owner: string, repo: string, number: number) =>
    api.post(`/pulls/${owner}/${repo}/${number}/ai-summary`).then(r => r.data.data),
};

// ─── Notifications ────────────────────────────────────────
export const notificationsApi = {
  list: (params?: any) => api.get('/notifications', { params }).then(r => r.data),
  markRead: (id: string) => api.put(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: () => api.put('/notifications/read-all').then(r => r.data),
  delete: (id: string) => api.delete(`/notifications/${id}`).then(r => r.data),
  clearAll: () => api.delete('/notifications').then(r => r.data),
};

// ─── Search ──────────────────────────────────────────────
export const searchApi = {
  global: (q: string) => api.get('/search', { params: { q } }).then(r => r.data.data),
  repositories: (params: any) => api.get('/search/repositories', { params }).then(r => r.data),
  users: (params: any) => api.get('/search/users', { params }).then(r => r.data),
  issues: (params: any) => api.get('/search/issues', { params }).then(r => r.data),
};

// ─── AI ──────────────────────────────────────────────────
export const aiApi = {
  copilot: (data: { prefix: string; suffix?: string; language?: string }) =>
    api.post('/ai/copilot', data).then(r => r.data.data),
  explain: (code: string, language: string) =>
    api.post('/ai/explain', { code, language }).then(r => r.data.data),
  commitMessage: (diff: string) =>
    api.post('/ai/commit-message', { diff }).then(r => r.data.data),
  chat: (messages: any[], context?: any) =>
    api.post('/ai/chat', { messages, context }).then(r => r.data.data),
  getProviders: () => api.get('/ai/providers').then(r => r.data.data),
  addProvider: (data: any) => api.post('/ai/providers', data).then(r => r.data.data),
  deleteProvider: (id: string) => api.delete(`/ai/providers/${id}`).then(r => r.data),
};

// ─── Workflows (CI/CD) ───────────────────────────────────
export const workflowsApi = {
  list: (owner: string, repo: string) =>
    api.get(`/workflows/${owner}/${repo}`).then(r => r.data.data),
  listRuns: (owner: string, repo: string, page = 1) =>
    api.get(`/workflows/${owner}/${repo}/runs`, { params: { page } }).then(r => r.data),
  getRun: (owner: string, repo: string, runId: string) =>
    api.get(`/workflows/${owner}/${repo}/runs/${runId}`).then(r => r.data.data),
  create: (owner: string, repo: string, data: { name: string; filename: string; content: string }) =>
    api.post(`/workflows/${owner}/${repo}`, data).then(r => r.data.data),
  sync: (owner: string, repo: string) =>
    api.post(`/workflows/${owner}/${repo}/sync`).then(r => r.data.data),
  run: (owner: string, repo: string, workflowId: string, branch = 'main') =>
    api.post(`/workflows/${owner}/${repo}/${workflowId}/run`, { branch }).then(r => r.data.data),
  delete: (owner: string, repo: string, workflowId: string) =>
    api.delete(`/workflows/${owner}/${repo}/${workflowId}`).then(r => r.data),
};

// ─── Gists ──────────────────────────────────────────────────
export const gistsApi = {
  list: (params?: any) => api.get('/gists', { params }).then(r => r.data.data),
  myGists: () => api.get('/gists/user').then(r => r.data.data),
  userGists: (username: string) => api.get(`/gists/user/${username}`).then(r => r.data.data),
  get: (id: string) => api.get(`/gists/${id}`).then(r => r.data.data),
  create: (data: any) => api.post('/gists', data).then(r => r.data.data),
  update: (id: string, data: any) => api.patch(`/gists/${id}`, data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/gists/${id}`).then(r => r.data),
  toggleStar: (id: string) => api.post(`/gists/${id}/star`).then(r => r.data),
  fork: (id: string) => api.post(`/gists/${id}/fork`).then(r => r.data.data),
  starred: () => api.get('/gists/starred').then(r => r.data.data),
};

// ─── Wiki ──────────────────────────────────────────────────
export const wikiApi = {
  list: (owner: string, repo: string) => api.get(`/wiki/${owner}/${repo}`).then(r => r.data.data),
  getPage: (owner: string, repo: string, slug: string) => api.get(`/wiki/${owner}/${repo}/${slug}`).then(r => r.data.data),
  create: (owner: string, repo: string, data: any) => api.post(`/wiki/${owner}/${repo}`, data).then(r => r.data.data),
  update: (owner: string, repo: string, slug: string, data: any) => api.put(`/wiki/${owner}/${repo}/${slug}`, data).then(r => r.data.data),
  delete: (owner: string, repo: string, slug: string) => api.delete(`/wiki/${owner}/${repo}/${slug}`).then(r => r.data),
  getRevisions: (owner: string, repo: string, slug: string) => api.get(`/wiki/${owner}/${repo}/${slug}/revisions`).then(r => r.data.data),
};


// ─── Discussions ──────────────────────────────────────────
export const discussionsApi = {
  list: (owner: string, repo: string, params?: any) => api.get(`/discussions/${owner}/${repo}`, { params }).then(r => r.data.data),
  get: (owner: string, repo: string, number: number) => api.get(`/discussions/${owner}/${repo}/${number}`).then(r => r.data.data),
  create: (owner: string, repo: string, data: any) => api.post(`/discussions/${owner}/${repo}`, data).then(r => r.data.data),
  update: (owner: string, repo: string, number: number, data: any) => api.patch(`/discussions/${owner}/${repo}/${number}`, data).then(r => r.data.data),
  delete: (owner: string, repo: string, number: number) => api.delete(`/discussions/${owner}/${repo}/${number}`).then(r => r.data),
  getCategories: (owner: string, repo: string) => api.get(`/discussions/${owner}/${repo}/categories`).then(r => r.data.data),
  createCategory: (owner: string, repo: string, data: any) => api.post(`/discussions/${owner}/${repo}/categories`, data).then(r => r.data.data),
  getComments: (owner: string, repo: string, number: number) => api.get(`/discussions/${owner}/${repo}/${number}/comments`).then(r => r.data.data),
  addComment: (owner: string, repo: string, number: number, data: any) => api.post(`/discussions/${owner}/${repo}/${number}/comments`, data).then(r => r.data.data),
  markAnswer: (owner: string, repo: string, number: number, commentId: string) => api.post(`/discussions/${owner}/${repo}/${number}/comments/${commentId}/answer`).then(r => r.data),
};

export default api;
