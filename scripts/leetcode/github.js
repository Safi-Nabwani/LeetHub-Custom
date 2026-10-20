import { prepareSubmission } from './submission.js';
import { LeetHubError } from './util.js';

const queues = new Map();

class GitHubError extends LeetHubError {
  constructor(status) {
    super(`GitHubRequestFailed: ${status}`);
    this.status = status;
  }
}

const encodePath = path => path.split('/').map(encodeURIComponent).join('/');

async function fingerprint(value) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(value))
  );
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Queue uploads per repository in this content-script context. Other tabs/devices
 * are coordinated by non-forced branch updates and remote-state retries. */
async function publishSubmission(submission, { storage, fetchImpl = globalThis.fetch }) {
  const { leethub_token: token, leethub_hook: hook, mode_type: mode } = await storage.get([
    'leethub_token',
    'leethub_hook',
    'mode_type',
  ]);
  if (!token) throw new LeetHubError('LeethubTokenUndefined');
  if (mode !== 'commit') throw new LeetHubError('LeetHubNotAuthorizedByGit');
  if (!/^[\w.-]+\/[\w.-]+$/.test(hook ?? '')) throw new LeetHubError('NoRepoDefined');
  const previous = queues.get(hook) ?? Promise.resolve();
  const task = previous
    .catch(() => {})
    .then(() => upload(submission, { storage, fetchImpl, token, hook }));
  queues.set(hook, task);
  try {
    return await task;
  } finally {
    if (queues.get(hook) === task) queues.delete(hook);
  }
}

async function upload(submission, { storage, fetchImpl, token, hook }) {
  const base = `https://api.github.com/repos/${hook}`;
  async function request(path, method = 'GET', body) {
    const response = await fetchImpl(base + path, {
      method,
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new GitHubError(response.status);
    return response.json();
  }
  const repository = await request('');
  const branch = repository.default_branch;
  if (typeof branch !== 'string' || !branch) throw new LeetHubError('DefaultBranchNotFound');
  const refPath = `/git/ref/heads/${encodePath(branch)}`;
  const updatePath = `/git/refs/heads/${encodePath(branch)}`;
  const pendingKey = `leethub_pending_${hook}_${await fingerprint(submission)}`;
  let pending = (await storage.get(pendingKey))[pendingKey];
  let originalFiles = pending?.originalFiles;

  async function tree(sha) {
    const result = await request(`/git/trees/${sha}`);
    if (result.truncated || !Array.isArray(result.tree))
      throw new LeetHubError('IncompleteGitTree');
    return result.tree;
  }
  async function snapshot() {
    let ref;
    try {
      ref = await request(refPath);
    } catch (error) {
      if (error.status === 404 || error.status === 409)
        throw new LeetHubError('RepositoryNeedsInitialCommit');
      throw error;
    }
    const head = ref.object?.sha;
    const commit = await request(`/git/commits/${head}`);
    const root = await tree(commit.tree.sha);
    const folder = root.find(entry => entry.path === submission.problemName);
    if (folder && folder.type !== 'tree') throw new LeetHubError('ProblemPathIsNotDirectory');
    const entries = folder ? await tree(folder.sha) : [];
    const paths = [
      `${submission.problemName}/${submission.problemName}${submission.extension}`,
      `${submission.problemName}/README.md`,
      'README.md',
      'stats.json',
    ];
    if (submission.notes?.trim()) paths.push(`${submission.problemName}/NOTES.md`);
    const files = Object.fromEntries(
      await Promise.all(
        paths.map(async path => {
          const slash = path.indexOf('/');
          const entry =
            slash < 0
              ? root.find(item => item.path === path)
              : entries.find(item => item.path === path.slice(slash + 1));
          if (!entry) return [path, null];
          if (entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)) {
            throw new LeetHubError(`UnsupportedFileType: ${path}`);
          }
          const blob = await request(`/git/blobs/${entry.sha}`);
          if (blob.encoding !== 'base64' || typeof blob.content !== 'string')
            throw new LeetHubError('UnreadableGitBlob');
          const bytes = Uint8Array.from(atob(blob.content.replace(/\s/g, '')), char =>
            char.charCodeAt(0)
          );
          return [
            path,
            {
              content: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
              sha: entry.sha,
              mode: entry.mode,
            },
          ];
        })
      )
    );
    // Do not silently discard historical progress when its persistent baseline is missing.
    if (
      !files['stats.json'] &&
      root.some(entry => entry.type === 'tree' && /^\d+-/.test(entry.path))
    ) {
      throw new LeetHubError('ExistingSolutionsNeedStatsBaseline');
    }
    return { head, treeSha: commit.tree.sha, files };
  }
  async function reachedBranch(candidate, head) {
    if (candidate === head) return true;
    const comparison = await request(`/compare/${candidate}...${head}`);
    return ['ahead', 'identical'].includes(comparison.status);
  }
  async function saveLocal(stats) {
    // Repository selection may have changed while the network request was in flight.
    const current = await storage.get('leethub_hook');
    if (current.leethub_hook === hook) await storage.set({ stats, stats_hook: hook });
  }
  function latestStats(state) {
    const stats = JSON.parse(state.files['stats.json'].content).leetcode;
    stats.shas['stats.json'] = { '': state.files['stats.json'].sha };
    return stats;
  }
  async function complete(state, result, sha, recovered = false) {
    await saveLocal(recovered ? latestStats(state) : result.localStats);
    await storage.remove(pendingKey);
    return { unchanged: result?.unchanged ?? false, commitSha: sha, recovered };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    let state = await snapshot();
    if (pending) {
      if (await reachedBranch(pending.sha, state.head))
        return complete(state, null, pending.sha, true);
      // Reuse the SAME candidate after an interrupted request when its parent is still current.
      if (state.head === pending.parent) {
        try {
          await request(updatePath, 'PATCH', { sha: pending.sha, force: false });
          const confirmed = await snapshot();
          if (!(await reachedBranch(pending.sha, confirmed.head)))
            throw new LeetHubError('UploadPublicationUnconfirmed');
          return complete(confirmed, null, pending.sha, true);
        } catch (error) {
          if (![409, 422].includes(error.status))
            throw new LeetHubError('UploadPublicationUnconfirmed');
          state = await snapshot();
          if (await reachedBranch(pending.sha, state.head))
            return complete(state, null, pending.sha, true);
          if (state.head === pending.parent) throw error;
        }
      }
      pending = null;
      await storage.remove(pendingKey);
    }
    originalFiles ??= state.files;
    // Merge root metadata again, but never silently overwrite a competing solution/notes edit.
    for (const path of Object.keys(state.files).filter(
      path => path.includes('/') && !path.endsWith('/README.md')
    )) {
      if (
        state.files[path]?.sha !== originalFiles[path]?.sha &&
        state.files[path]?.content !==
          (path.endsWith('/NOTES.md') ? submission.notes : submission.code)
      ) {
        throw new LeetHubError('ConcurrentSolutionChange');
      }
    }
    const result = await prepareSubmission({ ...submission, hook, branch, files: state.files });
    if (result.unchanged) return complete(state, result, null);
    const newTree = await request('/git/trees', 'POST', {
      base_tree: state.treeSha,
      tree: result.changes.map(file => ({
        path: file.path,
        mode: state.files[file.path]?.mode ?? '100644',
        type: 'blob',
        content: file.content,
      })),
    });
    const title =
      submission.title || submission.problemName.replace(/^\d+-/, '').replace(/-/g, ' ');
    const words = title
      .trim()
      .split(/\s+/)
      .map(word => word[0].toUpperCase() + word.slice(1))
      .join(' ');
    const subject = `${
      state.files[`${submission.problemName}/${submission.problemName}${submission.extension}`]
        ? 'Update'
        : 'Add'
    } Solution For ${words}`
      .slice(0, 50)
      .trim();
    const candidate = await request('/git/commits', 'POST', {
      message: subject + (submission.performance ? `\n\n${submission.performance}` : ''),
      tree: newTree.sha,
      parents: [state.head],
    });
    pending = { sha: candidate.sha, parent: state.head, originalFiles };
    await storage.set({ [pendingKey]: pending });
    try {
      await request(updatePath, 'PATCH', { sha: candidate.sha, force: false });
    } catch (error) {
      // A lost PATCH response may mean publication succeeded. Check ancestry before any retry.
      let current;
      try {
        current = await snapshot();
        if (await reachedBranch(candidate.sha, current.head))
          return complete(current, null, candidate.sha, true);
      } catch {
        throw new LeetHubError('UploadPublicationUnconfirmed');
      }
      if (![409, 422].includes(error.status)) {
        if (error.status) {
          await storage.remove(pendingKey);
          throw error;
        }
        throw new LeetHubError('UploadPublicationUnconfirmed');
      }
      if (current.head === state.head) {
        await storage.remove(pendingKey);
        throw error;
      }
      // Keep the baseline for conflict detection; the next iteration refreshes all metadata.
      continue;
    }
    const confirmedRef = await request(refPath);
    if (confirmedRef.object?.sha === candidate.sha) return complete(state, result, candidate.sha);
    const confirmed = await snapshot();
    if (!(await reachedBranch(candidate.sha, confirmed.head)))
      throw new LeetHubError('UploadPublicationUnconfirmed');
    return complete(confirmed, result, candidate.sha, confirmed.head !== candidate.sha);
  }
  throw new LeetHubError('ConcurrentUploadRetryLimit');
}

export { publishSubmission };
