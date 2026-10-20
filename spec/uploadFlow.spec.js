import { LeetCodeV2 } from '../scripts/leetcode/versions.js';
import { server, storage, solutionPath } from './helpers/githubMock.js';

describe('accepted-submission upload flow', () => {
  let loader, api;
  let git, local, leetCode, interval, original;

  beforeAll(async () => {
    const saved = {
      chrome: globalThis.chrome,
      document: globalThis.document,
      MutationObserver: globalThis.MutationObserver,
    };
    api = {
      runtime: {},
      storage: { local: { get: (_key, callback) => callback({ isSync: true }) } },
    };
    globalThis.chrome = api;
    globalThis.document = { body: {}, addEventListener() {} };
    globalThis.MutationObserver = class {
      observe() {}
      disconnect() {}
    };
    try {
      ({ loader } = await import('../scripts/leetcode/leetcode.js'));
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete globalThis[key];
        else globalThis[key] = value;
      }
    }
  });

  beforeEach(() => {
    git = server({ LICENSE: 'keep' });
    local = storage();
    api.storage.local = local;
    original = {
      fetch: globalThis.fetch,
      document: globalThis.document,
      setInterval: globalThis.setInterval,
      clearInterval: globalThis.clearInterval,
    };
    globalThis.document = { cookie: '' };
    globalThis.setInterval = callback => {
      interval = callback;
      return 1;
    };
    globalThis.clearInterval = () => {};
    spyOn(console, 'error');
    leetCode = Object.create(LeetCodeV2.prototype);
    leetCode.submissionId = '123';
    leetCode.difficulty = 'Easy';
    leetCode.getSuccessStateAndUpdate = () => true;
    leetCode.startSpinner = jasmine.createSpy('startSpinner');
    leetCode.parseQuestion = () => '<h2>Two Sum</h2>';
    leetCode.markUploaded = jasmine.createSpy('markUploaded');
    leetCode.markUploadFailed = jasmine.createSpy('markUploadFailed');
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });

  function responses(statusCode) {
    globalThis.fetch = (url, request) => {
      if (url !== 'https://leetcode.com/graphql/') return git.fetch(url, request);
      const query = JSON.parse(request.body);
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data:
            query.operationName === 'submissionDetails'
              ? {
                  submissionDetails: {
                    statusCode,
                    code: 'return [0, 1]',
                    lang: { verboseName: 'Python3' },
                    runtimeDisplay: '1 ms',
                    runtimePercentile: 90,
                    memoryDisplay: '1 MB',
                    memoryPercentile: 90,
                    question: {
                      title: 'Two Sum',
                      titleSlug: 'two-sum',
                      difficulty: 'Easy',
                      topicTags: [{ name: 'Array' }],
                    },
                  },
                }
              : { question: { questionFrontendId: '1' } },
        }),
      });
    };
  }

  it('verifies acceptance, extracts files, publishes one commit, then shows success', async () => {
    responses(10);
    git.beforePatch = () => {
      expect(leetCode.markUploaded).not.toHaveBeenCalled();
      expect(local.data.stats).toBeUndefined();
    };
    loader(leetCode);
    await interval();
    expect(git.files()[solutionPath]).toBe('return [0, 1]');
    expect(
      git.calls.filter(call => call.path === '/git/commits' && call.method === 'POST').length
    ).toBe(1);
    expect(git.calls.some(call => call.method === 'PUT')).toBeFalse();
    expect(leetCode.markUploaded).toHaveBeenCalledTimes(1);
    expect(leetCode.markUploadFailed).not.toHaveBeenCalled();
    expect(local.data.stats.solved).toBe(1);
  });

  it('makes no GitHub requests for a rejected submission', async () => {
    responses(11);
    loader(leetCode);
    await interval();
    expect(git.calls).toEqual([]);
    expect(leetCode.markUploaded).not.toHaveBeenCalled();
    expect(leetCode.markUploadFailed).toHaveBeenCalledTimes(1);
  });

  it('distinguishes an already synced result from a new publication', async () => {
    responses(10);
    loader(leetCode);
    await interval();
    expect(leetCode.markUploaded).toHaveBeenCalledWith(false);
    leetCode.markUploaded.calls.reset();
    loader(leetCode);
    await interval();
    expect(leetCode.markUploaded).toHaveBeenCalledWith(true);
    expect(
      git.calls.filter(call => call.path === '/git/commits' && call.method === 'POST').length
    ).toBe(1);
  });

  it('reports a failed publication without successful local progress', async () => {
    responses(10);
    git.beforePatch = () => 403;
    loader(leetCode);
    await interval();
    expect(local.data.stats).toBeUndefined();
    expect(leetCode.markUploaded).not.toHaveBeenCalled();
    expect(leetCode.markUploadFailed).toHaveBeenCalledTimes(1);
  });

  it('awaits asynchronously extracted legacy code before making GitHub writes', async () => {
    // The legacy parser returns a promise; it must not be encoded as an object.
    responses(10);
    const findCode = leetCode.findCode;
    leetCode.findCode = async () => {
      await Promise.resolve();
      return findCode.call(leetCode);
    };
    loader(leetCode);
    await interval();
    expect(git.files()[solutionPath]).toBe('return [0, 1]');
  });
});
