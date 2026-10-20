import { appendProblemToReadme, sortTopicsInReadme } from './readmeTopics.js';
import { getDifficulty, LeetHubError } from './util.js';

const TOPICS_START = '<!---LeetCode Topics Start-->';
const TOPICS_END = '<!---LeetCode Topics End-->';
const DEFAULT_README =
  'A collection of LeetCode questions to ace the coding interview! - Created using [LeetHub v2](https://github.com/arunbhardwaj/LeetHub-2.0)';

// Git hashes the UTF-8 byte length, not the JavaScript string length.
async function blobSha(content) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  const header = encoder.encode(`blob ${bytes.length}\0`);
  const blob = new Uint8Array(header.length + bytes.length);
  blob.set(header);
  blob.set(bytes, header.length);
  const digest = await crypto.subtle.digest('SHA-1', blob);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function updateTopics(content, topicTags, hook, problemName, branch) {
  if (!topicTags?.length) return content;
  const original = content ?? DEFAULT_README;
  const start = original.indexOf(TOPICS_START);
  const end = original.indexOf(TOPICS_END);
  if (start < 0 !== end < 0 || (start >= 0 && end < start)) {
    throw new LeetHubError('InvalidTopicSection');
  }
  // The upstream sorter can move matching headings outside the marked section.
  // Give it only the managed section so personal content stays byte-for-byte intact.
  let section =
    start < 0
      ? `${TOPICS_START}\n# LeetCode Topics\n${TOPICS_END}`
      : original.slice(start, end + TOPICS_END.length);
  for (const topic of topicTags) {
    section = appendProblemToReadme(topic.name, section, hook, problemName, branch);
  }
  section = sortTopicsInReadme(section);
  return start < 0
    ? `${original}\n${section}`
    : original.slice(0, start) + section + original.slice(end + TOPICS_END.length);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, canonical(value[key])])
    );
  }
  return value;
}

/**
 * Prepare an accepted submission without network writes or local storage changes.
 * `files` is a read-only snapshot from ONE remote commit: each required path must
 * be { content: decoded UTF-8 text, sha: blob SHA }, or explicitly null if absent.
 * The future uploader must reread and reprepare this set after a branch conflict.
 */
async function prepareSubmission({
  problemName,
  extension,
  code,
  description,
  notes,
  topicTags,
  difficulty,
  hook,
  branch,
  files,
}) {
  if (
    typeof problemName !== 'string' ||
    !problemName.trim() ||
    /[/\\\x00-\x1f]/.test(problemName) ||
    ['.', '..'].includes(problemName) ||
    !/^\.[a-z0-9]+$/i.test(extension)
  ) {
    throw new LeetHubError('InvalidProblemPath');
  }
  if (
    typeof code !== 'string' ||
    !code.trim() ||
    typeof description !== 'string' ||
    !description.trim()
  ) {
    throw new LeetHubError('MissingSubmissionContent');
  }
  if (typeof hook !== 'string' || !/^[^/\s]+\/[^/\s]+$/.test(hook) || !branch) {
    throw new LeetHubError('MissingRepositoryContext');
  }
  if (notes != null && typeof notes !== 'string') throw new LeetHubError('InvalidNotes');
  if (
    topicTags != null &&
    (!Array.isArray(topicTags) ||
      topicTags.some(
        topic => typeof topic?.name !== 'string' || !topic.name.trim() || /[\r\n]/.test(topic.name)
      ))
  ) {
    throw new LeetHubError('InvalidTopics');
  }

  const filename = problemName + extension;
  const solutionPath = `${problemName}/${filename}`;
  const descriptionPath = `${problemName}/README.md`;
  const notesPath = `${problemName}/NOTES.md`;
  const requiredPaths = [solutionPath, descriptionPath, 'README.md', 'stats.json'];
  if (notes?.trim()) requiredPaths.push(notesPath);
  for (const path of requiredPaths) {
    const file = files?.[path];
    if (
      !Object.hasOwn(files ?? {}, path) ||
      (file !== null && (typeof file?.content !== 'string' || !/^[a-f0-9]{40}$/i.test(file?.sha)))
    ) {
      throw new LeetHubError(`IncompleteRepositorySnapshot: ${path}`);
    }
  }

  const desired = new Map([[solutionPath, code]]);
  desired.set(descriptionPath, files[descriptionPath]?.content ?? description);
  if (notes?.trim()) desired.set(notesPath, notes);
  const readme = updateTopics(
    files['README.md']?.content ?? null,
    topicTags,
    hook,
    problemName,
    branch
  );
  if (readme !== null) desired.set('README.md', readme);

  let persistent;
  try {
    persistent =
      files['stats.json'] === null ? { leetcode: {} } : JSON.parse(files['stats.json'].content);
    if (
      !persistent ||
      typeof persistent !== 'object' ||
      Array.isArray(persistent) ||
      !persistent.leetcode ||
      typeof persistent.leetcode !== 'object' ||
      Array.isArray(persistent.leetcode)
    ) {
      throw new Error('Invalid stats');
    }
  } catch {
    throw new LeetHubError('InvalidPersistentStats');
  }
  const beforeStats = JSON.stringify(canonical(persistent));
  const stats = persistent.leetcode;
  stats.shas ??= {};
  if (!stats.shas || typeof stats.shas !== 'object' || Array.isArray(stats.shas)) {
    throw new LeetHubError('InvalidPersistentStats');
  }
  for (const counter of ['solved', 'easy', 'medium', 'hard']) {
    stats[counter] ??= 0;
    if (!Number.isInteger(stats[counter]) || stats[counter] < 0)
      throw new LeetHubError('InvalidPersistentStats');
  }
  const existing = stats.shas[problemName];
  if (existing != null && (typeof existing !== 'object' || Array.isArray(existing))) {
    throw new LeetHubError('InvalidPersistentStats');
  }
  const counted = typeof existing?.difficulty === 'string';
  stats.shas[problemName] ??= {};
  if (!counted) {
    const level = getDifficulty(difficulty).toLowerCase();
    stats.solved += 1;
    if (['easy', 'medium', 'hard'].includes(level)) stats[level] += 1;
    stats.shas[problemName].difficulty = level;
  }

  const changes = [];
  for (const [path, content] of desired) {
    const sha = await blobSha(content);
    const slash = path.lastIndexOf('/');
    const folder = slash < 0 ? path : path.slice(0, slash);
    const name = slash < 0 ? '' : path.slice(slash + 1);
    stats.shas[folder] ??= {};
    if (typeof stats.shas[folder] !== 'object' || Array.isArray(stats.shas[folder])) {
      throw new LeetHubError('InvalidPersistentStats');
    }
    stats.shas[folder][name] = sha;
    if (files[path]?.content !== content) {
      changes.push({ path, content, previousSha: files[path]?.sha ?? null, sha });
    }
  }
  if (JSON.stringify(canonical(persistent)) !== beforeStats || files['stats.json'] === null) {
    const content = JSON.stringify(persistent);
    changes.push({
      path: 'stats.json',
      content,
      previousSha: files['stats.json']?.sha ?? null,
      sha: await blobSha(content),
    });
  }
  // Its own changing SHA cannot be embedded in stats.json without recursion.
  // Keep that tracking entry only in the local result, to apply AFTER publication.
  const localStats = JSON.parse(JSON.stringify(stats));
  const statsFile = changes.find(file => file.path === 'stats.json');
  localStats.shas['stats.json'] = { '': statsFile?.sha ?? files['stats.json'].sha };
  return { changes, localStats, isNewProblem: !counted, unchanged: changes.length === 0 };
}

export { prepareSubmission };
