import { createHash } from 'node:crypto';
import { prepareSubmission } from '../scripts/leetcode/submission.js';

const problem = '0001-two-sum';
const solutionPath = `${problem}/${problem}.py`;
const descriptionPath = `${problem}/README.md`;
const notesPath = `${problem}/NOTES.md`;

function file(content) {
  const bytes = Buffer.from(content, 'utf8');
  return {
    content,
    sha: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),
  };
}

function input(overrides = {}) {
  return {
    problemName: problem,
    extension: '.py',
    code: 'return [0, 1]',
    description: '<h2>Two Sum</h2>',
    difficulty: 'Easy',
    topicTags: [{ name: 'Array' }, { name: 'Hash Table' }],
    hook: 'user/solutions',
    branch: 'main',
    files: { [solutionPath]: null, [descriptionPath]: null, 'README.md': null, 'stats.json': null },
    ...overrides,
  };
}

function publish(files, result) {
  return {
    ...files,
    ...Object.fromEntries(result.changes.map(change => [change.path, file(change.content)])),
  };
}

describe('submission change preparation', () => {
  it('prepares code, description, root topics, and stats without mutating input', async () => {
    const submission = input();
    const before = JSON.stringify(submission);
    const result = await prepareSubmission(submission);
    expect(result.changes.map(change => change.path)).toEqual([
      solutionPath,
      descriptionPath,
      'README.md',
      'stats.json',
    ]);
    expect(result.localStats.solved).toBe(1);
    expect(result.localStats.easy).toBe(1);
    expect(JSON.stringify(submission)).toBe(before);
    expect(result.changes.every(change => change.previousSha === null)).toBeTrue();
    expect(result.changes.find(change => change.path === 'README.md').content).toContain(
      '/tree/main/0001-two-sum'
    );
  });

  it('prepares no changes for an identical repeat, even with a freshly decoded snapshot', async () => {
    const submission = input();
    const first = await prepareSubmission(submission);
    const files = publish(submission.files, first);
    const repeat = await prepareSubmission(input({ files: JSON.parse(JSON.stringify(files)) }));
    expect(repeat.changes).toEqual([]);
    expect(repeat.unchanged).toBeTrue();
    expect(repeat.isNewProblem).toBeFalse();
    expect(repeat.localStats.solved).toBe(1);
  });

  it('preserves existing problem descriptions and absent notes, independent of local caches', async () => {
    const submission = input();
    submission.files[descriptionPath] = file('My edits and discussion links');
    submission.files[notesPath] = file('Keep these notes');
    const result = await prepareSubmission(submission);
    expect(
      result.changes.some(change => [descriptionPath, notesPath].includes(change.path))
    ).toBeFalse();
    expect(result.localStats.shas[problem]['README.md']).toBe(
      submission.files[descriptionPath].sha
    );
  });

  it('updates changed code and its stats SHA without counting a solution twice', async () => {
    const first = await prepareSubmission(input());
    const files = publish(input().files, first);
    const result = await prepareSubmission(input({ files, code: 'return [1, 0]' }));
    expect(result.changes.map(change => change.path)).toEqual([solutionPath, 'stats.json']);
    expect(result.changes[0].previousSha).toBe(files[solutionPath].sha);
    expect(result.localStats.solved).toBe(1);
    expect(result.localStats.easy).toBe(1);
    const repeat = await prepareSubmission(
      input({ files: publish(files, result), code: 'return [1, 0]' })
    );
    expect(repeat.changes).toEqual([]);
  });

  it('includes nonempty notes and hashes Unicode using UTF-8 bytes', async () => {
    const submission = input({ notes: 'פתרון 🙂', code: '# café 🙂\nreturn [0, 1]' });
    submission.files[notesPath] = null;
    const result = await prepareSubmission(submission);
    for (const change of result.changes) expect(change.sha).toBe(file(change.content).sha);
    expect(result.changes.find(change => change.path === notesPath).content).toBe('פתרון 🙂');
    expect(result.localStats.shas[problem]['NOTES.md']).toBe(file('פתרון 🙂').sha);
  });

  it('does not erase existing notes for an empty notes value', async () => {
    const submission = input({ notes: '  \n' });
    submission.files[notesPath] = file('Personal notes');
    expect(
      (await prepareSubmission(submission)).changes.some(change => change.path === notesPath)
    ).toBeFalse();
  });

  it('preserves personal headings outside the topic markers byte-for-byte', async () => {
    const initial = await prepareSubmission(input());
    const files = publish(input().files, initial);
    const prefix = '# My notes\r\n## Array\r\nDo not move this heading.\r\n';
    const suffix = '\r\n# Personal footer\r\nKeep this too.\r\n';
    const root = files['README.md'].content;
    const section = root.slice(root.indexOf('<!---LeetCode Topics Start-->'));
    files['README.md'] = file(prefix + section + suffix);
    const result = await prepareSubmission(input({ files, topicTags: [{ name: 'String' }] }));
    const readme = result.changes.find(change => change.path === 'README.md').content;
    expect(readme.startsWith(prefix)).toBeTrue();
    expect(readme.endsWith(suffix)).toBeTrue();
    expect(readme).toContain('## String');
  });

  it('sorts managed problem rows without duplicating the current problem', async () => {
    const first = await prepareSubmission(input());
    const files = publish(input().files, first);
    files['README.md'] = file(
      files['README.md'].content.replace(
        '| [0001-two-sum]',
        '| [0020-valid-parentheses](https://github.com/user/solutions/tree/main/0020-valid-parentheses) |\n| [0001-two-sum]'
      )
    );
    const result = await prepareSubmission(input({ files }));
    const readme = result.changes.find(change => change.path === 'README.md').content;
    expect(readme.indexOf('[0001-two-sum]')).toBeLessThan(
      readme.indexOf('[0020-valid-parentheses]')
    );
    expect(readme.match(/\[0001-two-sum\]/g).length).toBe(2); // Once in each topic.
  });

  it('retains other platforms, problem records, counters, and stats extensions', async () => {
    const submission = input();
    const persistent = {
      gfg: { solved: 3 },
      custom: 'keep',
      leetcode: {
        solved: 2,
        easy: 0,
        medium: 1,
        hard: 1,
        custom: 'also keep',
        shas: {
          '0002-other': { difficulty: 'medium', '0002-other.js': 'old-sha' },
          '0003-other': { difficulty: 'hard' },
        },
      },
    };
    submission.files['stats.json'] = file(JSON.stringify(persistent));
    const result = await prepareSubmission(submission);
    const output = JSON.parse(result.changes.find(change => change.path === 'stats.json').content);
    expect(output.gfg).toEqual(persistent.gfg);
    expect(output.custom).toBe('keep');
    expect(output.leetcode.custom).toBe('also keep');
    expect(output.leetcode.shas['0002-other']).toEqual(persistent.leetcode.shas['0002-other']);
    expect(result.localStats.solved).toBe(3);
    expect(result.localStats.medium).toBe(1);
    expect(result.localStats.hard).toBe(1);
  });

  it('keeps stats-file SHA tracking local and does not introduce a recursive payload', async () => {
    const result = await prepareSubmission(input());
    const stats = result.changes.find(change => change.path === 'stats.json');
    expect(JSON.parse(stats.content).leetcode.shas['stats.json']).toBeUndefined();
    expect(result.localStats.shas['stats.json']['']).toBe(stats.sha);
  });

  it('preserves legacy stats tracking without generating commits on every retry', async () => {
    const first = await prepareSubmission(input());
    const files = publish(input().files, first);
    const stats = JSON.parse(files['stats.json'].content);
    stats.leetcode.shas['stats.json'] = { '': 'a'.repeat(40) };
    files['stats.json'] = file(JSON.stringify(stats));
    const result = await prepareSubmission(input({ files }));
    expect(result.changes).toEqual([]);
    expect(result.localStats.shas['stats.json']['']).toBe(files['stats.json'].sha);
  });

  it('adds another language without incrementing the problem count', async () => {
    const first = await prepareSubmission(input());
    const files = publish(input().files, first);
    const javaPath = `${problem}/${problem}.java`;
    files[javaPath] = null;
    const result = await prepareSubmission(
      input({ files, extension: '.java', code: 'class Solution {}' })
    );
    expect(result.changes.map(change => change.path)).toEqual([javaPath, 'stats.json']);
    expect(result.localStats.solved).toBe(1);
    expect(result.localStats.shas[problem][`${problem}.py`]).toBe(files[solutionPath].sha);
  });

  it('preserves non-numeric identifiers from the existing filename resolver', async () => {
    const name = 'LCP 01-guess-numbers';
    const files = {
      [`${name}/${name}.py`]: null,
      [`${name}/README.md`]: null,
      'README.md': null,
      'stats.json': null,
    };
    const result = await prepareSubmission(input({ files, problemName: name }));
    expect(result.changes[0].path).toBe(`${name}/${name}.py`);
  });

  it('does not reformat semantically unchanged stats', async () => {
    const first = await prepareSubmission(input());
    const files = publish(input().files, first);
    files['stats.json'] = file(JSON.stringify(JSON.parse(files['stats.json'].content), null, 2));
    expect((await prepareSubmission(input({ files }))).changes).toEqual([]);
  });

  it('does not create topics when no tags are available', async () => {
    const result = await prepareSubmission(input({ topicTags: undefined }));
    expect(result.changes.some(change => change.path === 'README.md')).toBeFalse();
  });

  it('fails closed for unread files rather than interpreting them as absent', async () => {
    const submission = input();
    delete submission.files['README.md'];
    await expectAsync(prepareSubmission(submission)).toBeRejectedWithError(
      /IncompleteRepositorySnapshot/
    );
  });

  it('fails without replacing unreadable stats', async () => {
    for (const content of [
      '{broken',
      'null',
      '{}',
      '{"leetcode":{"solved":-1}}',
      '{"leetcode":{"shas":[]}}',
    ]) {
      const submission = input();
      submission.files['stats.json'] = file(content);
      await expectAsync(prepareSubmission(submission)).toBeRejectedWithError(
        'InvalidPersistentStats'
      );
    }
  });

  it('fails without rewriting a malformed topic section', async () => {
    const submission = input();
    submission.files['README.md'] = file('# Personal intro\n<!---LeetCode Topics Start-->\n');
    await expectAsync(prepareSubmission(submission)).toBeRejectedWithError('InvalidTopicSection');
  });

  it('retains filename mapping for other languages and uses the selected branch', async () => {
    const submission = input({ extension: '.cpp', branch: 'practice' });
    delete submission.files[solutionPath];
    submission.files[`${problem}/${problem}.cpp`] = null;
    const result = await prepareSubmission(submission);
    expect(result.changes[0].path).toBe(`${problem}/${problem}.cpp`);
    expect(result.changes.find(change => change.path === 'README.md').content).toContain(
      '/tree/practice/'
    );
  });
});
