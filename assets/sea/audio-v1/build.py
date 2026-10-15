"""Edit CC0 recordings into compact banks. Requires numpy, soundfile, imageio-ffmpeg.
Usage: python assets/sea/audio-v1/build.py deploy/builds/audio-sources
Original archives stay outside the public assets. Sources and offsets are in manifest.json.
"""
import sys, json, hashlib, subprocess, tempfile
from pathlib import Path
import numpy as np
import soundfile as sf
import imageio_ffmpeg

root = Path(sys.argv[1]).resolve()
dest = Path(__file__).resolve().parent
rate = 44100
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
firearms = root / 'firearms/Prepared SFX Library'
specs = [
    ('machinegun', firearms/'AK-47/C_28P.wav', 2.4, 3, 1),
    ('twin', firearms/'Carl Gustav M45/G_31P.wav', 2.4, 3, .96),
    ('rapid', firearms/'PPSh/P_30P.wav', 2.4, 3, 1),
    ('spread', firearms/'Model 12/K_22P.wav', 3.2, 2, .91),
    ('cannon', root/'cannon.mp3', 5.4, 2, 1),
    ('howitzer', root/'cannon.mp3', 6.0, 2, .86),
    ('impact', root/'naval/qubodup-NavalBattleSoundSet-cc0/ExplosionMetal.wav', 2.0, 1, .88),
]
manifest = {'sampleRate': rate, 'license': 'CC0-1.0', 'banks': {}}
previews = {}
for name, path, slot, count, speed in specs:
    audio, source_rate = sf.read(path, always_2d=True)
    # Each selected firearm file contains separated single shots, not a burst loop.
    amplitude = np.max(np.abs(audio), axis=1)
    candidates = np.flatnonzero(amplitude > amplitude.max()*.30)
    starts = []
    for i in candidates:
        if not starts or (i-starts[-1])/source_rate > (4 if name in ('cannon','howitzer') else 1.8):
            starts.append(int(i))
    starts = starts[:count]
    if len(starts) != count:
        raise ValueError((name, 'not enough separate shots', starts))
    clips = []
    for index, onset in enumerate(starts):
        start = max(0, onset-round(.004*source_rate))
        end = min(len(audio), start+round(slot*speed*source_rate))
        if index+1 < len(starts): end = min(end, starts[index+1]-round(.05*source_rate))
        clip = audio[start:end]
        timeline = np.arange(round(len(clip)/source_rate/speed*rate))*source_rate*speed/rate
        clip = np.column_stack([np.interp(timeline,np.arange(len(clip)),clip[:,c]) for c in range(clip.shape[1])])
        if clip.shape[1] == 1: clip = np.repeat(clip,2,axis=1)
        # Keep natural outdoor tails; small fades remove edit clicks, not the decay.
        fade = min(round(.18*rate),len(clip)//4)
        clip[-fade:] *= np.linspace(1,0,fade)[:,None]
        clip[:44] *= np.linspace(0,1,44)[:,None]
        padded = np.zeros((round(slot*rate),2)); padded[:len(clip)] = clip[:len(padded)]
        if name == 'twin':
            delayed=np.zeros_like(padded); delayed[353:]=padded[:-353,::-1]
            padded=(padded+delayed*.65)/1.35
        if name == 'spread':
            for delay,gain in [(794,.35),(1588,.22)]: padded[delay:]+=padded[:-delay].copy()*gain
        if name in ('machinegun','twin','rapid','spread'):
            # Recorded near-mic shots have very dry tails. A low wet-level diffuse
            # reflection adds space without delaying or replacing the real attack.
            rng=np.random.default_rng(1701+index)
            ir_length=round(rate*1.8);fft_length=1 << (len(padded)+ir_length-1).bit_length()
            for channel in range(2):
                ir=np.convolve(rng.normal(size=ir_length),np.ones(9)/9,mode='same')
                ir*=np.exp(-np.arange(ir_length)/rate*3.3)
                ir/=np.sqrt(np.sum(ir*ir))
                ir=np.pad(ir,(round(rate*(.047+channel*.013)),0))
                reverb=np.fft.irfft(np.fft.rfft(padded[:,channel],fft_length)*np.fft.rfft(ir,fft_length),fft_length)
                padded[:,channel]+=reverb[:len(padded)]*.28
            padded[-round(rate*.25):]*=np.linspace(1,0,round(rate*.25))[:,None]
        clips.append(padded)
    bank=np.concatenate(clips)
    with tempfile.TemporaryDirectory() as temp:
        wav=Path(temp)/'input.wav';sf.write(wav,bank,rate,subtype='FLOAT')
        # Gentle compression raises recorded body and reflections while retaining the transient.
        subprocess.run([ffmpeg,'-v','error','-y','-i',str(wav),'-af',
            'highpass=f=32,acompressor=threshold=0.14:ratio=2.5:attack=2:release=180:makeup=1.7,alimiter=limit=0.88:level=false',
            '-ar',str(rate),'-c:a','libmp3lame','-b:a','160k',str(dest/(name+'.mp3'))],check=True)
    output=dest/(name+'.mp3')
    manifest['banks'][name]={'file':name+'.mp3','slot':slot,'count':count,
        'sourceFile':str(path.relative_to(root)).replace('\\','/'),'sourceOnsetsSeconds':[round(i/source_rate,6) for i in starts],
        'speed':speed,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'bytes':output.stat().st_size}
    decoded,_=sf.read(output,always_2d=True)
    previews[name]=decoded[:round(slot*rate)]
    print(name, 'onsets',manifest['banks'][name]['sourceOnsetsSeconds'], 'bytes',output.stat().st_size)
(dest/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
montage=[]
for name in ['machinegun','twin','rapid','spread','cannon','howitzer']:
    montage += [previews[name]*.5,np.zeros((round(.6*rate),2))]
sf.write(root.parent/'real-weapons-preview.wav',np.concatenate(montage),rate,subtype='PCM_16')
