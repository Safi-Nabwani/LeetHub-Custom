import { LeetCodeV2 } from '../scripts/leetcode/versions.js';

describe('V2 submission acceptance', () => {
  let originalFetch;
  let originalDocument;
  let leetCode;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalDocument = globalThis.document;
    globalThis.document = { cookie: '' };
    // Avoid the constructor's browser UI setup; exercise the real init method.
    leetCode = Object.create(LeetCodeV2.prototype);
    leetCode.submissionId = '123';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  });

  function mockDetails(details, options = {}) {
    const requests = [];
    globalThis.fetch = async (url, request) => {
      const query = JSON.parse(request.body);
      requests.push({ url, query });
      return {
        ok: options.ok !== false,
        json: async () =>
          query.operationName === 'submissionDetails'
            ? { data: { submissionDetails: details }, ...options.body }
            : { data: { question: { questionFrontendId: '1' } } },
      };
    };
    return requests;
  }

  it('allows an accepted submission and retrieves its question details', async () => {
    const requests = mockDetails({
      statusCode: 10,
      code: 'solution',
      question: { titleSlug: 'two-sum' },
    });
    await leetCode.init();
    expect(leetCode.submissionData.code).toBe('solution');
    expect(leetCode.submissionData.question.questionFrontendId).toBe('1');
    expect(requests.length).toBe(2);
    expect(requests[0].query.variables.submissionId).toBe('123');
    expect(requests.every(request => request.url === 'https://leetcode.com/graphql/')).toBeTrue();
  });

  for (const statusCode of [11, 12, 13, 14, 15, 16, 20, 0, null, undefined, '10']) {
    it(`blocks non-confirmed acceptance (${String(
      statusCode
    )}) before further requests`, async () => {
      const requests = mockDetails({ statusCode });
      leetCode.submissionData = { statusCode: 10, code: 'stale solution' };
      await expectAsync(leetCode.init()).toBeRejectedWithError('SubmissionNotAccepted');
      expect(leetCode.submissionData).toBeUndefined();
      expect(requests.length).toBe(1);
    });
  }

  it('blocks missing submission details', async () => {
    mockDetails(null);
    await expectAsync(leetCode.init()).toBeRejectedWithError('SubmissionDetailsNotFound');
  });

  it('blocks GraphQL errors even when partial data says Accepted', async () => {
    mockDetails({ statusCode: 10 }, { body: { errors: [{ message: 'Unavailable' }] } });
    await expectAsync(leetCode.init()).toBeRejectedWithError('SubmissionDetailsNotFound');
  });

  it('blocks HTTP failures', async () => {
    mockDetails({ statusCode: 10 }, { ok: false });
    await expectAsync(leetCode.init()).toBeRejectedWithError('SubmissionDetailsRequestFailed');
  });

  it('blocks network failures', async () => {
    globalThis.fetch = async () => {
      throw new Error('Offline');
    };
    await expectAsync(leetCode.init()).toBeRejectedWithError('Offline');
  });

  it('blocks missing submission IDs before requesting data', async () => {
    const requests = mockDetails({ statusCode: 10 });
    leetCode.submissionId = undefined;
    await expectAsync(leetCode.init()).toBeRejectedWithError('SubmissionIdNotFound');
    expect(requests.length).toBe(0);
  });
});
