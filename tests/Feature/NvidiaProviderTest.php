<?php
namespace Tests\Feature;

use App\Services\SceneGenerationService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class NvidiaProviderTest extends TestCase
{
    public function test_initial_silence_is_kept_without_moving_later_scene_boundaries(): void
    {
        $service=app(SceneGenerationService::class);
        $parsed=['phrases'=>[
            ['phrase'=>'Hello world','keywords'=>['greeting'],'start_time'=>.36,'end_time'=>2,'duration_seconds'=>1.64,'prompt'=>'A greeting'],
            ['phrase'=>'Welcome here','keywords'=>['welcome'],'start_time'=>2,'end_time'=>4,'duration_seconds'=>2,'prompt'=>'A welcome'],
        ],'subtitles_script'=>['Hello world','Welcome here']];
        $method=new \ReflectionMethod($service,'validateNvidiaScenes');
        $result=$method->invoke($service,$parsed,'Hello world Welcome here',['words'=>[['start'=>.36,'end'=>1],['start'=>3,'end'=>4]]]);
        $this->assertEquals(0,$result['phrases'][0]['start_time']);
        $this->assertEquals(2,$result['phrases'][0]['duration_seconds']);
        $this->assertEquals(2,$result['phrases'][1]['start_time']);
        $this->assertEquals(4,array_sum(array_column($result['phrases'],'duration_seconds')));
        $parsed['phrases'][0]['start_time']=.9;
        $this->expectException(\RuntimeException::class);
        $method->invoke($service,$parsed,'Hello world Welcome here',['words'=>[['start'=>.36,'end'=>4]]]);
    }

    public function test_scene_generation_falls_back_on_invalid_output_without_using_old_provider(): void
    {
        config(['nvidia.enabled'=>true, 'nvidia.endpoint'=>'https://integrate.api.nvidia.com/v1/chat/completions',
            'nvidia.writing_models'=>['primary','fallback'], 'nvidia.models'=>[
                'primary'=>['key'=>'test-primary','model'=>'primary'],
                'fallback'=>['key'=>'test-fallback','model'=>'fallback']]]);
        Http::preventStrayRequests();
        Http::fakeSequence()->push(['choices'=>[['message'=>['content'=>json_encode(['phrases'=>[['phrase'=>'Hallucinated scene']], 'subtitles_script'=>['Wrong']])]]]])
            ->push(['choices'=>[['message'=>['content'=>json_encode(['phrases'=>[['phrase'=>'Hello world','keywords'=>['greeting'],'start_time'=>0,'end_time'=>2,'duration_seconds'=>2,'prompt'=>'A greeting']], 'subtitles_script'=>['Hello world']])]]]]);
        $service=app(SceneGenerationService::class);
        $method=new \ReflectionMethod($service,'generateScenePhrases');
        $result=$method->invoke($service,'Hello world',['text'=>'Hello world','words'=>[['word'=>'Hello','start'=>0,'end'=>1],['word'=>'world','start'=>1,'end'=>2]]],'en');
        $this->assertCount(1,$result['phrases']);
        Http::assertSentCount(2);
        Http::assertSent(fn($request)=>$request['model']==='fallback' && $request->hasHeader('Authorization','Bearer test-fallback'));
    }
}
