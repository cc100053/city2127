import assert from 'node:assert/strict';
import type { DevSurveyConfig } from '../src/shared/devSurvey.ts';
import { exhibitionFixture, ok, startServer } from './surveyFixture.ts';
import { METER_CONTRACTS } from './meterContract.ts';

for (const test of [{ enabled: false, address: '127.0.0.1', status: 404 },
  { enabled: true, address: '192.168.1.2', status: 403 },
  { enabled: true, address: '127.0.0.1', status: 200 }]) {
  const { ctx } = exhibitionFixture();
  const server = await startServer(ctx, () => test.address, { devAuto: test.enabled });
  try {
    const response = await server.request<DevSurveyConfig>('/api/admin/dev-survey-config');
    assert.equal(response.status, test.status);
    if (test.status === 200) {
      const config = ok(response.body);
      assert.equal(config.questionSetVersion, 2);
      for (const contract of METER_CONTRACTS) {
        const meter = config.meters.find(meter => meter.axis === contract.axis)!;
        assert.equal(meter.questionId, contract.questionId);
        for (const vote of [-1, 0, 1] as const) assert.equal(meter.options.find(option => option.vote === vote)?.id, contract.options[vote]);
      }
    }
    const responseAfter = await server.request('/api/city-state');
    assert.equal((ok(responseAfter.body) as { revision: number }).revision, 0, 'config discovery never creates a session');
  } finally { await server.close(); ctx.db.close(); }
}
console.log('PASS: disabled/loopback gates and authoritative option mapping without state mutation.');
