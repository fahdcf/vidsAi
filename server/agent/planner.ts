import {
  operationSchema,
  type Document,
  type Operation,
  type BrowserPlanningLimits,
} from "../../shared/contracts/index";
import { toolNames, applyOperations } from "../../shared/editing-core/index";
import { nvidiaProviders } from './nvidia';
export async function plan(
  message: string,
  document: Document,
  options: { providers?: boolean; browserLimits?: BrowserPlanningLimits } = {},
): Promise<{ operations: Operation[]; reply: string; source: string }> {
  const limits = options.browserLimits
    ? `Keep the proposal within these browser export limits: ${JSON.stringify(options.browserLimits)}. `
    : "";
  const prompt = `You edit videos using validated tools. Return JSON only: {"operations":[{"tool":"...","params":{}}],"reply":"..."}. Maximum 12 operations. Never invent media URLs or clip IDs. Available tools: ${toolNames.join(", ")}. set_subtitle_style {style}; set_transition {type,duration_frames}; set_volume {track,volume}; set_music {url,volume}; update_subtitle_config {config}; reorder_scenes {order}; trim_clip {id,trim_in,trim_out}; replace_asset {id,url,media_type}; set_animation {id,animation}; set_format {width,height}; set_duration {total_frames,preserve_narration:true} (cannot cut narration). styles: default,progressive_highlight,tiktok_trending,arabic_banner,rectangular,rounded_progressive,rectangular_banner. transitions: none,fade,zoom-in,zoom-out,slide-left,slide-right,slide-up,slide-down. Use [] for informational replies. ${limits}State: ${JSON.stringify(document)}. Request: ${message}`;
  const models = (
    process.env.OPENROUTER_MODELS ||
    [
      process.env.OPENROUTER_MODEL ||
        process.env.OPENROUTER_MODEL1 ||
        "arcee-ai/trinity-large-preview:free",
      process.env.OPENROUTER_MODEL2,
    ]
      .filter(Boolean)
      .join(",")
  )
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const orBase = (
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
  )
    .replace(/\/chat\/completions\/?$/, "")
    .replace(/\/$/, "");
  const providers = process.env.NVIDIA_PROVIDER_ENABLED === 'true' ? nvidiaProviders() : [
    [orBase, process.env.OPENROUTER_API_KEY, models[0]],
    [
      (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1")
        .replace(/\/chat\/completions\/?$/, "")
        .replace(/\/$/, ""),
      process.env.GROQ_API_KEY,
      process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    ],
    [orBase, process.env.OPENROUTER_API_KEY, models[1]],
  ];
  for (const [base, key, model] of providers) {
    if (!key || !model || options.providers === false) continue;
    try {
      const response = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          ...(process.env.NVIDIA_PROVIDER_ENABLED === 'true' ? {} : {response_format: { type: 'json_object' }}),
          temperature: 0,
          max_tokens: 2200,
          ...(String(model).startsWith('nvidia/nemotron-') ? {chat_template_kwargs: {enable_thinking: false}} : {}),
        }),
        signal: AbortSignal.timeout(process.env.NVIDIA_PROVIDER_ENABLED === 'true' ? 10000 : 15000),
      });
      if (!response.ok) continue;
      const data = (await response.json()) as any;
      const result = JSON.parse(data.choices[0].message.content);
      if (!Array.isArray(result.operations) || result.operations.length > 12)
        continue;
      const operations = result.operations.map((x: unknown) =>
        operationSchema.parse(x),
      );
      if (operations.some((x: Operation) => !toolNames.includes(x.tool)))
        continue;
      if (operations.length) applyOperations(document, operations);
      return {
        operations,
        reply: String(result.reply || "Changes prepared."),
        source: String(model),
      };
    } catch {
      /* Fall back to another configured provider or deterministic tools. */
    }
  }
  const operations: Operation[] = [];
  for (const part of message.toLowerCase().split(/\s+(?:and|then)\s+|;/)) {
    const duration = part.match(
      /(?:shorten|duration|length).*?(\d+(?:\.\d+)?)\s*(?:seconds?|s)\b/,
    );
    if (duration) {
      operations.push({
        tool: "set_duration",
        params: {
          total_frames: Math.round(Number(duration[1]) * document.fps),
          preserve_narration: true,
        },
      });
      continue;
    }
    if (/reverse.*scenes|scenes.*reverse/.test(part)) {
      operations.push({
        tool: "reorder_scenes",
        params: { order: document.tracks.video.map((c) => c.id).reverse() },
      });
      continue;
    }
    const format = part.match(
      /\b(16:9|9:16|1:1|4:5|21:9|3:2|portrait|landscape|square)\b/,
    );
    if (format) {
      const formats: Record<string, [number, number]> = {
        "16:9": [1920, 1080],
        landscape: [1920, 1080],
        "9:16": [1080, 1920],
        portrait: [1080, 1920],
        "1:1": [1080, 1080],
        square: [1080, 1080],
        "4:5": [1080, 1350],
        "21:9": [1920, 824],
        "3:2": [1620, 1080],
      };
      const [width, height] = formats[format[1]];
      operations.push({ tool: "set_format", params: { width, height } });
      continue;
    }
    const style = part.match(
      /(?:style|use|captions?|subtitles?).*?(progressive[_ ]highlight|tiktok[_ ]trending|arabic[_ ]banner|rounded[_ ]progressive|rectangular[_ ]banner|rectangular|default)/,
    )?.[1];
    if (style) {
      operations.push({
        tool: "set_subtitle_style",
        params: { style: style.replaceAll(" ", "_") },
      });
      continue;
    }
    const transition = part.match(
      /(fade|zoom[- ]in|zoom[- ]out|slide[- ]left|slide[- ]right|slide[- ]up|slide[- ]down|none).*transition|transition.*?(fade|zoom-in|zoom-out|slide-left|slide-right|none)/,
    );
    if (transition) {
      operations.push({
        tool: "set_transition",
        params: { type: (transition[1] || transition[2]).replaceAll(" ", "-") },
      });
      continue;
    }
    if (/(?:remove|no|mute).*music/.test(part)) {
      operations.push({ tool: "set_music", params: { url: null } });
      continue;
    }
    const vol = part.match(
      /(music|voiceover).*?(\d+(?:\.\d+)?)\s*(%|percent)?/,
    );
    if (vol && /volume|quieter|louder|music|voiceover/.test(part)) {
      operations.push({
        tool: "set_volume",
        params: {
          track: vol[1],
          volume: Math.min(
            1,
            Number(vol[2]) / (vol[3] || Number(vol[2]) > 1 ? 100 : 1),
          ),
        },
      });
      continue;
    }
    if (/caption|subtitle|subs/.test(part)) {
      const size = part.match(/(\d+)\s*(?:px|pixels)/);
      const config: Record<string, unknown> = {};
      if (size) config.fontSize = `${size[1]}px`;
      if (/bigger|larger|smaller/.test(part))
        config.fontSize = `${Math.max(16, Math.min(96, parseFloat(String(document.tracks.subtitles[0]?.config.fontSize || 32)) + (/smaller/.test(part) ? -12 : 12)))}px`;
      const pos = part.match(/\b(top|bottom|center)\b/);
      if (pos) config.position = pos[1];
      const color = part.match(/#[a-f0-9]{6}\b/);
      if (color) config.textColor = color[0];
      if (Object.keys(config).length)
        operations.push({ tool: "update_subtitle_config", params: { config } });
    }
  }
  return {
    operations,
    source: "local",
    reply: operations.length
      ? `Prepared ${operations.length} editing change(s).`
      : /current|what.*(?:size|style|volume)/i.test(message)
        ? `Current captions use ${document.tracks.subtitles[0]?.style || "default"}, size ${document.tracks.subtitles[0]?.config.fontSize || "default"}. There are ${document.tracks.video.length} scenes.`
        : "I can change captions, transitions, music, volume, scene order, trims and formats. Describe the change, or use the editor controls.",
  };
}
