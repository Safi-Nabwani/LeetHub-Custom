import { publishSubmission } from '../scripts/leetcode/github.js';
import { prepareSubmission } from '../scripts/leetcode/submission.js';
import { server, storage, submission, problem, solutionPath } from './helpers/githubMock.js';

describe('single-commit GitHub publication', () => {
  let git, local, options;
  beforeEach(() => {
    git = server({ LICENSE: 'keep me' });
    local = storage();
    options = { storage: local, fetchImpl: git.fetch };
  });
  const run = (value, options) => publishSubmission(value, options);

  it('publishes code, description, topics, and stats in one visible commit', async () => {
    const initial = git.head;
    const result = await run(submission(), options);
    expect(git.commits.get(git.head).parents).toEqual([{ sha: initial }]);
    expect(result.commitSha).toBe(git.head);
    expect(Object.keys(git.files()).sort()).toEqual(
      ['LICENSE', 'README.md', 'stats.json', solutionPath, `${problem}/README.md`].sort()
    );
    expect(git.files().LICENSE).toBe('keep me');
    expect(git.files()['README.md']).toContain('/tree/practice/');
    expect(local.data.stats.solved).toBe(1);
    expect(local.data.stats_hook).toBe('user/solutions');
    expect(
      git.calls.filter(call => call.method === 'POST' && call.path === '/git/commits').length
    ).toBe(1);
    expect(git.calls.some(call => call.method === 'PUT')).toBeFalse();
    const commit = git.calls.find(call => call.path === '/git/commits');
    expect(commit.body.message).toBe('Add Solution For Two Sum\n\nTime: 1 ms, Space: 1 MB');
  });

  it('makes no further commit for an identical repeat', async () => {
    await run(submission(), options);
    const head = git.head;
    const result = await run(submission(), options);
    expect(result.unchanged).toBeTrue();
    expect(git.head).toBe(head);
    expect(
      git.calls.filter(call => call.path === '/git/commits' && call.method === 'POST').length
    ).toBe(1);
  });

  it('serializes overlapping automatic/manual uploads without duplicate commits', async () => {
    await Promise.all([run(submission(), options), run(submission(), options)]);
    expect(
      git.calls.filter(call => call.path === '/git/commits' && call.method === 'POST').length
    ).toBe(1);
    expect(local.data.stats.solved).toBe(1);
  });

  it('updates changed code in one further commit and preserves a personal problem README', async () => {
    await run(submission(), options);
    const files = git.files();
    files[`${problem}/README.md`] = 'My description edits';
    git.externalCommit(files);
    const previous = git.head;
    await run({ ...submission(), code: 'return [1, 0]' }, options);
    expect(git.commits.get(git.head).parents).toEqual([{ sha: previous }]);
    expect(git.files()[`${problem}/README.md`]).toBe('My description edits');
    expect(local.data.stats.solved).toBe(1);
  });

  it('rebuilds root metadata on an unrelated concurrent branch update', async () => {
    let raced = false;
    git.beforePatch = () => {
      if (!raced) {
        raced = true;
        git.externalCommit({ ...git.files(), 'README.md': '# Personal introduction' });
      }
    };
    await run(submission(), options);
    expect(git.files()['README.md'].startsWith('# Personal introduction')).toBeTrue();
    expect(local.data.stats.solved).toBe(1);
    expect(git.calls.filter(call => call.method === 'PATCH').length).toBe(2);
    expect(
      git.calls.filter(call => call.method === 'PATCH').every(call => call.body.force === false)
    ).toBeTrue();
  });

  it('merges another solved problem and stats after a concurrent update', async () => {
    let raced = false;
    git.beforePatch = async () => {
      if (raced) return;
      raced = true;
      const other = '0002-add-two-numbers';
      const prepared = await prepareSubmission({
        ...submission(),
        problemName: other,
        hook: 'user/solutions',
        branch: 'practice',
        files: {
          [`${other}/${other}.py`]: null,
          [`${other}/README.md`]: null,
          'README.md': null,
          'stats.json': null,
        },
      });
      git.externalCommit({
        ...git.files(),
        ...Object.fromEntries(prepared.changes.map(file => [file.path, file.content])),
      });
    };
    await run(submission(), options);
    expect(local.data.stats.solved).toBe(2);
    expect(git.files()['README.md']).toContain('0002-add-two-numbers');
    expect(git.files()['0002-add-two-numbers/0002-add-two-numbers.py']).toBeDefined();
  });

  it('rejects a competing edit of the same solution', async () => {
    await run(submission(), options);
    let raced = false;
    git.beforePatch = () => {
      if (!raced) {
        raced = true;
        git.externalCommit({ ...git.files(), [solutionPath]: 'someone else changed this' });
      }
    };
    await expectAsync(
      run({ ...submission(), code: 'my changed solution' }, options)
    ).toBeRejectedWithError('ConcurrentSolutionChange');
    expect(git.files()[solutionPath]).toBe('someone else changed this');
  });

  it('recognizes a lost successful PATCH response without another commit', async () => {
    git.loseResponse = true;
    const result = await run(submission(), options);
    expect(result.recovered).toBeTrue();
    expect(result.commitSha).toBe(git.head);
    expect(
      git.calls.filter(call => call.path === '/git/commits' && call.method === 'POST').length
    ).toBe(1);
    expect(local.data.stats.solved).toBe(1);
  });

  it('recovers a published candidate after interruption, including a new uploader instance', async () => {
    let offline = false;
    const fetchImpl = async (url, request) => {
      if (offline) throw new Error('Offline');
      const response = await git.fetch(url, request);
      if (request.method === 'PATCH') {
        offline = true;
        throw new Error('Lost connection');
      }
      return response;
    };
    await expectAsync(run(submission(), { ...options, fetchImpl })).toBeRejectedWithError(
      'UploadPublicationUnconfirmed'
    );
    expect(local.data.stats).toBeUndefined();
    expect(Object.keys(local.data).some(key => key.startsWith('leethub_pending_'))).toBeTrue();
    const result = await run(submission(), options);
    expect(result.recovered).toBeTrue();
    expect(local.data.stats.solved).toBe(1);
    expect(
      git.calls.filter(call => call.path === '/git/commits' && call.method === 'POST').length
    ).toBe(1);
  });

  it('reuses an unpublished candidate after an interrupted PATCH', async () => {
    const fetchImpl = (url, request) => {
      if (request.method === 'PATCH') throw new Error('Connection lost before delivery');
      return git.fetch(url, request);
    };
    await expectAsync(run(submission(), { ...options, fetchImpl })).toBeRejectedWithError(
      'UploadPublicationUnconfirmed'
    );
    expect(local.data.stats).toBeUndefined();
    await run(submission(), options);
    expect(
      git.calls.filter(call => call.path === '/git/commits' && call.method === 'POST').length
    ).toBe(1);
    expect(local.data.stats.solved).toBe(1);
  });

  for (const path of ['/git/trees', '/git/commits']) {
    it(`does not publish partial content when ${path} fails`, async () => {
      const initial = git.head;
      git.fail = call => (call.method === 'POST' && call.path === path ? 500 : null);
      await expectAsync(run(submission(), options)).toBeRejected();
      expect(git.head).toBe(initial);
      expect(local.data.stats).toBeUndefined();
      expect(git.calls.some(call => call.method === 'PATCH')).toBeFalse();
    });
  }

  it('reports branch protection without retrying it as a race', async () => {
    const initial = git.head;
    git.beforePatch = () => 422;
    await expectAsync(run(submission(), options)).toBeRejectedWithError(/GitHubRequestFailed: 422/);
    expect(git.head).toBe(initial);
    expect(local.data.stats).toBeUndefined();
    expect(git.calls.filter(call => call.method === 'PATCH').length).toBe(1);
  });

  it('stops after bounded conflicts', async () => {
    git.beforePatch = () => {
      git.externalCommit({ ...git.files(), 'README.md': `Concurrent ${git.calls.length}` });
    };
    await expectAsync(run(submission(), options)).toBeRejectedWithError(
      'ConcurrentUploadRetryLimit'
    );
    expect(git.calls.filter(call => call.method === 'PATCH').length).toBe(3);
    expect(local.data.stats).toBeUndefined();
  });

  it('does not reset existing historical progress when remote stats are missing', async () => {
    git.externalCommit({ ...git.files(), '0002-other/0002-other.py': 'old solution' });
    await expectAsync(run(submission(), options)).toBeRejectedWithError(
      'ExistingSolutionsNeedStatsBaseline'
    );
    expect(git.calls.some(call => call.method === 'POST')).toBeFalse();
  });

  it('does not apply stats to a different repository selected during publication', async () => {
    git.beforePatch = () => {
      local.data.leethub_hook = 'user/another';
    };
    await run(submission(), options);
    expect(local.data.stats).toBeUndefined();
  });

  it('rejects incomplete remote trees before writing', async () => {
    git.truncated = true;
    await expectAsync(run(submission(), options)).toBeRejectedWithError('IncompleteGitTree');
    expect(git.calls.some(call => call.method === 'POST')).toBeFalse();
  });

  it('requires authentication and repository selection before network access', async () => {
    delete local.data.leethub_token;
    await expectAsync(run(submission(), options)).toBeRejectedWithError('LeethubTokenUndefined');
    expect(git.calls).toEqual([]);
  });

  it('supports a default branch containing a slash and publishes Unicode notes', async () => {
    git = server({}, 'practice/algorithms');
    await run({ ...submission(), notes: 'פתרון 🙂' }, { storage: local, fetchImpl: git.fetch });
    expect(git.files()[`${problem}/NOTES.md`]).toBe('פתרון 🙂');
    expect(git.files()['README.md']).toContain('/tree/practice%2Falgorithms/');
  });

  it('does not overwrite managed symlinks', async () => {
    await run(submission(), options);
    const fetchImpl = async (url, request) => {
      const response = await git.fetch(url, request);
      if (url.includes('/git/trees/') && request.method === 'GET') {
        const body = await response.json();
        const entry = body.tree.find(entry => entry.path === 'README.md');
        if (entry) entry.mode = '120000';
        return { ...response, json: async () => body };
      }
      return response;
    };
    const head = git.head;
    await expectAsync(run(submission(), { ...options, fetchImpl })).toBeRejectedWithError(
      /UnsupportedFileType/
    );
    expect(git.head).toBe(head);
  });

  it('reports an uninitialized repository before creating objects', async () => {
    git.fail = call => (call.path.startsWith('/git/ref/heads/') ? 409 : null);
    await expectAsync(run(submission(), options)).toBeRejectedWithError(
      'RepositoryNeedsInitialCommit'
    );
    expect(git.calls.some(call => call.method === 'POST')).toBeFalse();
  });

  it('reports permission failures before any write', async () => {
    git.fail = () => 401;
    await expectAsync(run(submission(), options)).toBeRejectedWithError(/GitHubRequestFailed: 401/);
    expect(local.data.stats).toBeUndefined();
    expect(git.calls.some(call => call.method === 'POST')).toBeFalse();
  });

  it('recovers the original commit even after a later commit advances the branch', async () => {
    let disconnected = false;
    const fetchImpl = async (url, request) => {
      if (disconnected) throw new Error('Offline');
      const response = await git.fetch(url, request);
      if (request.method === 'PATCH') {
        disconnected = true;
        throw new Error('Lost response');
      }
      return response;
    };
    await expectAsync(run(submission(), { ...options, fetchImpl })).toBeRejectedWithError(
      'UploadPublicationUnconfirmed'
    );
    const published = git.head;
    git.externalCommit({ ...git.files(), 'extra.txt': 'a later commit' });
    const later = git.head;
    const result = await run(submission(), options);
    expect(result.commitSha).toBe(published);
    expect(result.recovered).toBeTrue();
    expect(git.head).toBe(later);
    expect(
      git.calls.filter(call => call.path === '/git/commits' && call.method === 'POST').length
    ).toBe(1);
  });
});
