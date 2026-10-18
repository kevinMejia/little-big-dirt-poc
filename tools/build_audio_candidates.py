"""Prepare approved auditions from verified downloads in an external cache.

Usage: python tools/build_audio_candidates.py <audio-research-cache> <ffmpeg.exe>
No gameplay files, settings or event hooks are touched. Originals stay in cache;
manifest records source URLs, original filenames, hashes and every edit.
"""
from pathlib import Path
import array, hashlib, json, math, re, subprocess, sys

cache=Path(sys.argv[1]);ffmpeg=sys.argv[2]
root=Path(__file__).resolve().parents[1];out=root/'assets/audio-candidates'
out.mkdir(exist_ok=True);(out/'licenses').mkdir(exist_ok=True)
cc0='https://creativecommons.org/publicdomain/zero/1.0/'
sources={}
for slug in ['impact-sounds','digital-audio','music-jingles','sci-fi-sounds','rpg-audio']:
    sources[slug]=dict(author='Kenney',sourceUrl='https://kenney.nl/assets/'+slug,downloadUrl=(cache/(slug+'-source-url.txt')).read_text(),license='CC0 1.0',licenseUrl=cc0)
    text=next((cache/slug).rglob('License.txt')).read_text(encoding='utf-8-sig')
    (out/'licenses'/f'{slug}.md').write_text(text,encoding='utf-8')
for sid,author in [(186939,'ReadeOnly'),(450808,'kyles'),(570759,'ericnorcross81')]:
    html=(cache/f'freesound-{sid}.html').read_text(encoding='utf-8')
    assert 'creativecommons.org/publicdomain/zero/' in html
    url=re.search(r'data-static-file-url="([^"]+)"',html).group(1)
    sources[str(sid)]=dict(author=author,sourceUrl=f'https://freesound.org/people/{author}/sounds/{sid}/',downloadUrl=url,license='CC0 1.0',licenseUrl=cc0,downloadKind='Official high-quality MP3 preview; original lossless download requires Freesound login.')
for key,slug,author,filename in [('wood','35-wooden-crackshitsdestructions','Independent.nu (submitted by qubodup)','independent_nu_ljudbank-wood_crack_hit_destruction.7z'),('wind','wind1','Luke.RUSTLTD','wind1.wav'),('swishes','swishes-sound-pack','artisticdude','swishes.zip')]:
    html=(cache/(slug+'.html')).read_text(encoding='utf-8')
    assert 'creativecommons.org/publicdomain/zero/' in html
    sources[key]=dict(author=author,sourceUrl='https://opengameart.org/content/'+slug,downloadUrl='https://opengameart.org/sites/default/files/'+filename,license='CC0 1.0',licenseUrl=cc0)

# id, group, proposed use, source key, exact original, note, mode, excerpt start/length
specs=[
 ('dirty-diesel','Engines','Dirty Â· mechanical diesel idle','186939','freesound-186939.mp3','A prepared slow-idle engine loop. Audition against the heavier truck below; not a verified backhoe recording.','loop',0,5.1),
 ('stinky-diesel','Engines','Stinky Â· heavy rattling diesel','450808','freesound-450808.mp3','An old school-bus diesel recording: heavier truck character rather than a garbage-truck-specific recording.','loop',15,6),
 ('wood-bump','Trees','Gentle trunk bump','impact-sounds','impactWood_light_000.ogg','Short wood contact for light impacts.','shot',0,0),
 ('wood-creak','Trees','Trunk creak','rpg-audio','creak1.ogg','A creak alternative for wobble; audition its character before choosing.','shot',0,0),
 ('wood-crack-a','Trees','Strong wood crack A','wood','crack04.mp3.flac','A recorded crack for knockdown onset.','shot',0,0),
 ('wood-crack-b','Trees','Strong wood crack B','wood','crack09.mp3.flac','An alternate crack for occasional variation.','shot',0,0),
 ('foliage','Trees','Falling foliage rustle','570759','freesound-570759.mp3','A short excerpt from a dry-plant rustling recording, without a wind bed.','burst',0,.45),
 ('tree-thud','Trees','Tree ground thud','impact-sounds','impactWood_heavy_000.ogg','A heavier wood hit to pair with the fall landing.','shot',0,0),
 ('cannon-boom','Boundary cannon','Launch Â· low arcade boom','sci-fi-sounds','lowFrequency_explosion_000.ogg','An exaggerated bass launch candidate, not audio from Motocross Madness.','shot',0,0),
 ('air-wind','Boundary cannon','Flight Â· rushing wind loop','wind','wind1.wav','A short crossfaded excerpt from a synthesized wind recording.','loop',12,6),
 ('cannon-land','Boundary cannon','Landing Â· soft heavy impact','impact-sounds','impactSoft_heavy_001.ogg','A broad landing thump; less brittle than a metal hit.','shot',0,0),
 ('turbo-pickup','Turbo Boost','Collection Â· rising power-up','digital-audio','powerUp3.ogg','A quick rising cue for collection.','shot',0,0),
 ('turbo-active','Turbo Boost','Activation Â· energetic jump','digital-audio','phaseJump1.ogg','An alternate activation accent; compare with the pickup alone.','shot',0,0),
 ('turbo-expire','Turbo Boost','Expiration Â· falling cue','digital-audio','highDown.ogg','A short downward cue for boost ending.','shot',0,0),
 ('letter-a','Word Hunt','Letter Â· bright chirp A','digital-audio','pepSound3.ogg','A compact collectible candidate suitable for small pitch variations.','shot',0,0),
 ('letter-b','Word Hunt','Letter Â· two-tone B','digital-audio','twoTone1.ogg','A second letter-collection character to compare.','shot',0,0),
 ('word-complete','Word Hunt','Word complete Â· plucked jingle','music-jingles','jingles_PIZZI00.ogg','A short plucked-instrument completion candidate.','shot',0,0),
 ('record-fanfare','Word Hunt','Personal record Â· brass jingle','music-jingles','jingles_SAX00.ogg','A more prominent record cue; compare against the smaller word jingle.','shot',0,0),
 ('rock-crack','Rocks','Rock damage Â· stone strike','impact-sounds','impactMining_001.ogg','A stone/mining hit for the first qualifying crack.','shot',0,0),
 ('rock-break','Rocks','Rock break Â· crunchy burst','sci-fi-sounds','explosionCrunch_002.ogg','A stylized breaking burst, to play once when the rock breaks.','shot',0,0),
 ('rock-scatter','Rocks','Fragments Â· small stone ticks','impact-sounds','impactMining_004.ogg','An optional debris accent; reserve for limited fragment contacts.','shot',0,0),
 ('ramp-takeoff','Jumps','Ramp takeoff Â· swish','swishes','swish-1.wav','A short recorded swish for takeoff.','shot',0,0),
 ('ramp-land','Jumps','Ramp landing Â· cushioned hit','impact-sounds','impactSoft_heavy_000.ogg','A cushioned alternative for ordinary landings.','shot',0,0),
]
manifest=dict(version=1,approvalStatus='approved-for-gameplay',integrated=True,checkedOn='2026-10-18',licenseUrl=cc0,candidates=[])
for sid,group,label,source,filename,note,mode,start,length in specs:
    paths=[p for p in cache.rglob(filename) if '__MACOSX' not in p.parts]
    assert paths,filename
    original=paths[0]
    args=[ffmpeg,'-v','error','-i',str(original),'-ac','1','-ar','44100','-f','f32le','-']
    samples=array.array('f');samples.frombytes(subprocess.check_output(args));rate=44100
    edits=['Mono 44.1 kHz AAC-LC audition at 96 kb/s; conservative level matching.']
    if mode=='burst':
        # Choose an energetic rustle excerpt, rather than one of the source's gaps.
        window=int(length*rate);best=-1;chosen=0
        for i in range(0,len(samples)-window,rate//2):
            energy=sum(x*x for x in samples[i:i+window:100])
            if energy>best:best=energy;chosen=i
        start=chosen/rate
    if length:
        samples=samples[int(start*rate):int((start+length)*rate)]
        edits.append(f'Excerpt {start:.3f}â€“{start+length:.3f} seconds of downloaded source.')
    peak=max(abs(v) for v in samples)
    assert peak>0
    if mode!='loop':
        threshold=peak*.012
        first=next(i for i,x in enumerate(samples) if abs(x)>threshold)
        last=len(samples)-next(i for i,x in enumerate(reversed(samples)) if abs(x)>threshold)
        samples=samples[max(0,first-441):min(len(samples),last+882)]
        fade=min(220,len(samples)//4)
        for i in range(fade):samples[i]*=i/fade;samples[-1-i]*=i/fade
        edits.append('Silence trimmed with short edge fades.')
    else:
        overlap=int(.15*rate)
        blend=array.array('f',(samples[-overlap+i]*(1-i/overlap)+samples[i]*i/overlap for i in range(overlap)))
        samples=samples[overlap:-overlap]+blend
        edits.append('150 ms cyclic linear crossfade; loop seam still subject to listening approval.')
    # AAC can overshoot transient PCM peaks. Leave >3 dB headroom before encoding.
    rms=math.sqrt(sum(v*v for v in samples)/len(samples));gain=min(.7/max(abs(v) for v in samples),(.09 if mode=='loop' else .12)/rms)
    samples=array.array('f',(v*gain for v in samples))
    target=out/(sid+'.m4a')
    subprocess.run([ffmpeg,'-y','-v','error','-f','f32le','-ar',str(rate),'-ac','1','-i','-','-c:a','aac','-b:a','96k','-movflags','+faststart',str(target)],input=samples.tobytes(),check=True)
    metadata={**sources[source], 'id':sid,'group':group,'label':label,'description':note,'sourceFile':filename,'sourceSHA256':hashlib.sha256(original.read_bytes()).hexdigest(),'file':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'duration':round(len(samples)/rate,3),'bytes':target.stat().st_size,'loop':mode=='loop','processing':edits,'approved':True}
    if source in ['186939','450808','570759']:metadata['sourceFile']=sources[source]['downloadUrl'].rsplit('/',1)[-1]
    manifest['candidates'].append(metadata)
(out/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
(out/'licenses/SOURCES.md').write_text('# Audio candidate sources\n\nChecked 2026-10-18. Approved for gameplay; individual controls in Settings → Audio.\n\n'+''.join(f"- **{v['author']}** â€” [{v['sourceUrl']}]({v['sourceUrl']}) â€” [CC0 1.0]({cc0}).\n" for v in sources.values()),encoding='utf-8')
print(f'Prepared {len(specs)} approved candidates, {sum(c["bytes"] for c in manifest["candidates"])/1024:.0f} KiB total.')
