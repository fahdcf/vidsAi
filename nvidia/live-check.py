"""Bounded development checks. Reads ignored .env; never prints credentials."""
import json, os, re, time, urllib.request, urllib.error, subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
env=dict(re.findall(r'^([A-Z0-9_]+)=([^\r\n]*)',(root/'.env').read_text(encoding='utf-8-sig'),re.M))
catalog=json.loads((root/'nvidia/models.json').read_text())
requests=json.loads((root/'nvidia/requests.json').read_text())
out=root.parent/'runtime/nvidia-live-results.json'
results=[]
prompts={
'agent':'Return JSON only: {"operations":[{"tool":"set_format","params":{"width":1080,"height":1080}},{"tool":"set_subtitle_style","params":{"style":"progressive_highlight"}}],"reply":"Changes prepared."}. Request: make video square and set subtitles to progressive_highlight. Use exactly this schema.',
'writing':'Return JSON only with phrases and subtitles_script. Split this six-second script into two three-second scenes, preserve every word: Discover our reusable bottle. Take it on adventures. Each phrase needs phrase, keywords (one search phrase), start_time, end_time, duration_seconds, prompt. Return subtitles_script as an array of strings.',
'translation':'Translate English to French. Return only the translation: The reusable bottle keeps your water cold.',
'media_understanding':'Describe the attached image accurately in one sentence. Do not invent objects.'}
def call(alias,case,body,url):
    model=catalog['models'][alias]; start=time.monotonic()
    row={'case':case,'alias':alias,'model':model['catalogId']}
    try:
        response=subprocess.run(['curl.exe','--silent','--show-error','--max-time','30','--config','-','-H','Content-Type: application/json','--data-binary',json.dumps(body),'-w','\n%{http_code}',url],input='header = "Authorization: Bearer '+env[model['credentialEnv']]+'"\n',capture_output=True,encoding='utf8',timeout=35)
        raw,status=response.stdout.rsplit('\n',1); row['http']=int(status)
        if response.returncode: raise RuntimeError('Network timeout or connection error')
        if row['http']!=200: raise RuntimeError(re.sub(r'nvapi-[A-Za-z0-9_-]+','[REDACTED]',raw[:500]))
        data=json.loads(raw)
        if case in ('embedding','reranking'):
            row['passed']=bool(data.get('data') or data.get('rankings')); row['response']=data
        else:
            content=data.get('choices',[{}])[0].get('message',{}).get('content') or ''
            row['output']=content; row['passed']=bool(content.strip())
            if case in ('agent','writing'):
                parsed=json.loads(re.sub(r'^```(?:json)?\s*|\s*```$','',content.strip()))
                if case=='agent':
                    row['passed']=len(parsed.get('operations',[]))==2 and {o['tool'] for o in parsed['operations']}=={'set_format','set_subtitle_style'} and any(o['params']=={'width':1080,'height':1080} for o in parsed['operations'])
                else:
                    phrases=parsed.get('phrases',[])
                    row['passed']=len(phrases)==2 and all(all(k in p for k in ('phrase','keywords','start_time','end_time','duration_seconds','prompt')) for p in phrases) and abs(sum(p['duration_seconds'] for p in phrases)-6)<.01
    except urllib.error.HTTPError as e:
        row.update(http=e.code,passed=False,error=re.sub(r'nvapi-[A-Za-z0-9_-]+','[REDACTED]',e.read().decode(errors='replace')[:500]))
    except Exception as e: row.update(passed=False,error=type(e).__name__+': '+str(e)[:200])
    row['seconds']=round(time.monotonic()-start,2); results.append(row)
    out.write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf8')
    print(json.dumps({k:v for k,v in row.items() if k not in ('output','response','error')}),flush=True)
for case in ('agent','writing','media_understanding','translation'):
    for alias in catalog['rankedUseCases'][case]:
        model=catalog['models'][alias]
        content=prompts[case]
        if case=='media_understanding':
            # Tiny deterministic red square; tests actual image input rather than text claims.
            import base64, struct, zlib
            def chunk(t,d): return struct.pack('!I',len(d))+t+d+struct.pack('!I',zlib.crc32(t+d)&0xffffffff)
            png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',64,64,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\0'+b'\xff\0\0'*64)*64))+chunk(b'IEND',b'')
            content=[{'type':'text','text':content},{'type':'image_url','image_url':{'url':'data:image/png;base64,'+base64.b64encode(png).decode()}}]
        body={'model':model['apiModel'],'messages':[{'role':'user','content':content}],'temperature':0,'max_tokens':1600,'stream':False}
        call(alias,case,body,model['endpoint'])
for alias in catalog['rankedUseCases']['retrieval']:
    model=catalog['models'][alias]
    if model['family'] not in ('embedding','reranking'): continue
    spec=requests[alias]
    call(alias,'embedding' if model['family']=='embedding' else 'reranking',spec['body'],spec['url'])
for alias in catalog['rankedUseCases']['speech_audio_media']:
    if alias=='nano_omni': continue
    model=catalog['models'][alias]
    results.append({'case':'speech_audio_media','alias':alias,'model':model['catalogId'],'passed':False,'status':'not_executed','reason':'Hosted API contract/access pending' if model['endpoint'] is None else 'Requires official gRPC client/protobuf and media fixture; not an HTTP chat model'})
out.write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf8')
