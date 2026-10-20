import { createHash } from 'node:crypto';

import { prepareSubmission } from '../../scripts/leetcode/submission.js';

const hash = value => createHash('sha1').update(value).digest('hex');
const problem = '0001-two-sum';
const solutionPath = `${problem}/${problem}.py`;
const submission = () => ({
  problemName: problem,
  extension: '.py',
  code: 'return [0, 1]',
  description: '<h2>Two Sum</h2>',
  title: 'Two Sum',
  topicTags: [{ name: 'Array' }],
  difficulty: 'Easy',
  performance: 'Time: 1 ms, Space: 1 MB',
  submissionId: '123',
});

// Stateful GitHub model: reads are pinned to immutable trees/blobs, and branch
// updates require ancestry. Tests inspect the resulting history and file state.
function server(initial = {}, branch = 'practice') {
  const trees = new Map(),
    commits = new Map(),
    blobs = new Map();
  const calls = [];
  let serial = 0,
    head;
  function makeTree(files) {
    const sha = hash(JSON.stringify(files));
    trees.set(sha, structuredClone(files));
    return sha;
  }
  function commit(files, parent = head) {
    const sha = hash(`commit-${serial++}`);
    commits.set(sha, {
      sha,
      tree: { sha: makeTree(files) },
      parents: parent ? [{ sha: parent }] : [],
    });
    head = sha;
    return sha;
  }
  commit(initial);
  function ancestor(a, b) {
    if (a === b) return true;
    return commits.get(b)?.parents.some(parent => ancestor(a, parent.sha)) ?? false;
  }
  function fileState() {
    return structuredClone(trees.get(commits.get(head).tree.sha));
  }
  const state = {
    calls,
    commits,
    branch,
    beforePatch: null,
    fail: null,
    get head() {
      return head;
    },
    files: fileState,
    externalCommit: commit,
    setHead(sha) {
      head = sha;
    },
  };
  state.fetch = async (url, options) => {
    const path = url.replace('https://api.github.com/repos/user/solutions', '');
    const body = options.body ? JSON.parse(options.body) : undefined;
    const call = { path, method: options.method, body };
    calls.push(call);
    const reply = (value, status = 200) => ({
      ok: status < 400,
      status,
      json: async () => structuredClone(value),
    });
    const failure = state.fail?.(call);
    if (failure) return reply({}, failure);
    if (path === '') return reply({ default_branch: branch });
    if (path === `/git/ref/heads/${branch}`) return reply({ object: { sha: head } });
    if (path.startsWith('/git/commits/')) return reply(commits.get(path.split('/').pop()));
    if (path.startsWith('/compare/')) {
      const [base, tip] = path.slice(9).split('...');
      return reply({
        status:
          base === tip
            ? 'identical'
            : ancestor(base, tip)
            ? 'ahead'
            : ancestor(tip, base)
            ? 'behind'
            : 'diverged',
      });
    }
    if (path.startsWith('/git/trees/')) {
      const files = trees.get(path.split('/').pop());
      if (!files) throw new Error('Unknown tree');
      const entries = [];
      const folders = new Map();
      for (const [path, content] of Object.entries(files)) {
        const slash = path.indexOf('/');
        if (slash >= 0) {
          const folder = path.slice(0, slash);
          if (!folders.has(folder)) folders.set(folder, {});
          folders.get(folder)[path.slice(slash + 1)] = content;
        } else {
          const bytes = Buffer.from(content);
          const sha = createHash('sha1')
            .update(`blob ${bytes.length}\0`)
            .update(bytes)
            .digest('hex');
          blobs.set(sha, content);
          entries.push({ path, sha, type: 'blob', mode: '100644' });
        }
      }
      for (const [folder, contents] of folders)
        entries.push({ path: folder, sha: makeTree(contents), type: 'tree', mode: '040000' });
      return reply({ tree: entries, truncated: state.truncated ?? false });
    }
    if (path.startsWith('/git/blobs/'))
      return reply({
        encoding: 'base64',
        content: Buffer.from(blobs.get(path.split('/').pop())).toString('base64'),
      });
    if (path === '/git/trees' && options.method === 'POST') {
      const files = structuredClone(trees.get(body.base_tree));
      for (const entry of body.tree) files[entry.path] = entry.content;
      return reply({ sha: makeTree(files) }, 201);
    }
    if (path === '/git/commits' && options.method === 'POST') {
      const sha = hash(`candidate-${serial++}`);
      commits.set(sha, {
        sha,
        tree: { sha: body.tree },
        parents: body.parents.map(sha => ({ sha })),
      });
      return reply({ sha }, 201);
    }
    if (path === `/git/refs/heads/${branch}` && options.method === 'PATCH') {
      const outcome = await state.beforePatch?.(call);
      if (outcome) return reply({}, outcome);
      if (body.force !== false) throw new Error('Forced updates forbidden');
      if (!ancestor(head, body.sha)) return reply({}, 422);
      head = body.sha;
      if (state.loseResponse) {
        state.loseResponse = false;
        throw new Error('Lost response');
      }
      return reply({ object: { sha: head } });
    }
    throw new Error(`Unexpected request: ${options.method} ${path}`);
  };
  return state;
}

function storage() {
  const data = { leethub_token: 'test-token', leethub_hook: 'user/solutions', mode_type: 'commit' };
  return {
    data,
    writes: [],
    async get(keys) {
      return Object.fromEntries(
        (Array.isArray(keys) ? keys : [keys]).map(key => [key, structuredClone(data[key])])
      );
    },
    async set(values) {
      this.writes.push(structuredClone(values));
      Object.assign(data, structuredClone(values));
    },
    async remove(key) {
      delete data[key];
    },
  };
}

export { server, storage, submission, problem, solutionPath };
