import type {Operation} from '@vidsai/contracts';
export function operationSummary(operation:Operation,fps:number):string {
 const p=operation.params;const readable=(v:unknown)=>String(v??'').replaceAll('_',' ').replaceAll('-',' ');const seconds=(frames:unknown)=>(Number(frames)/fps).toFixed(2);
 switch(operation.tool){
  case 'set_subtitle_style':return `Use ${readable(p.style)} captions`;
  case 'set_transition':return `Use ${readable(p.type)} transitions`;
  case 'set_music':return p.url?'Replace the background music':'Remove background music';
  case 'set_volume':return `Set ${readable(p.track)} volume to ${Math.round(Number(p.volume)*100)}%`;
  case 'update_subtitle_config':{const labels:Record<string,string>={fontSize:'Font size',textColor:'Text color',backgroundColor:'Background',position:'Position',fontFamily:'Font',borderRadius:'Corner radius',opacity:'Opacity',bold:'Bold text'};return Object.entries((p.config||{}) as Record<string,unknown>).map(([key,value])=>`${labels[key]||readable(key)}: ${readable(value)}`).join('; ');}
  case 'reorder_scenes':return 'Reorder the scenes as requested';
  case 'trim_clip':return `Use source footage from ${seconds(p.trim_in)} to ${seconds(p.trim_out)} seconds`;
  case 'replace_asset':return 'Replace the selected scene media';
  case 'set_animation':return `Use ${readable(p.animation)} animation`;
  case 'set_format':return `Change the canvas to ${p.width} × ${p.height}`;
  case 'set_duration':return `Set video duration to ${seconds(p.total_frames)} seconds while preserving narration`;
  case 'update_subtitle':return `Change caption text to “${String(p.text)}”`;
  case 'add_overlay':return 'Add an image overlay';
  case 'remove_overlay':return 'Remove the selected overlay';
  case 'set_audio_timing':return `Play audio from ${seconds(p.start_frame)} to ${seconds(p.end_frame)} seconds`;
  default:return 'Apply the requested editing change';
 }
}
