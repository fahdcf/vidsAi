import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan } from './agent/planner';
import { fixture } from './test-fixtures/editing';
test('NVIDIA falls back after invalid operations and uses per-model credentials', async () => {
  const saved={...process.env}; const realFetch=globalThis.fetch;
  try {
    Object.assign(process.env,{NVIDIA_PROVIDER_ENABLED:'true',NVIDIA_ROUTE_AGENT_COMPLEX_PRIMARY:'test/one',NVIDIA_ROUTE_AGENT_COMPLEX_FALLBACKS:'test/two',NVIDIA_ONE_MODEL_ID:'test/one',NVIDIA_TWO_MODEL_ID:'test/two',NVIDIA_ONE_API_KEY:'first',NVIDIA_TWO_API_KEY:'second'});
    const seen: string[]=[];
    globalThis.fetch=async (_url, options) => {
      const body=JSON.parse(String(options?.body));seen.push(body.model);
      assert.equal((options?.headers as Record<string,string>).Authorization,seen.length===1?'Bearer first':'Bearer second');
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({operations:[seen.length===1?{tool:'invent_media',params:{}}:{tool:'set_format',params:{width:1080,height:1080}}],reply:'Ready'})}}]}));
    };
    const result=await plan('Make square',fixture());
    assert.deepEqual(seen,['test/one','test/two']);assert.equal(result.source,'test/two');assert.equal(result.operations[0].tool,'set_format');
  } finally { globalThis.fetch=realFetch;for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved); }
});
