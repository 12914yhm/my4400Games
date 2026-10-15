"""Build ship impact banks from the CC0 Tiny Naval Battle Sounds Set v2.

Run after build.py: python build-impacts.py deploy/builds/audio-sources
The source recordings remain outside public assets and the Git repository.
"""
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import imageio_ffmpeg
import numpy as np
import soundfile as sf

root = Path(sys.argv[1]).resolve()
source = root / 'naval/qubodup-NavalBattleSoundSet-cc0'
dest = Path(__file__).resolve().parent
rate = 44100
specs = {
    'hull-small': (1.6, [('ExplosionMetal.wav', 1.35, .42, 0), ('Splash.wav', 1.18, .22, .06)]),
    'hull-medium': (2.1, [('ExplosionMetal.wav', 1, .65, 0), ('WaterSurfaceExplosion08.wav', 1.18, .28, .04)]),
    'hull-large': (2.5, [('ExplosionMetal.wav', .87, .75, 0), ('WaterSurfaceExplosion07.wav', 1, .38, .08)]),
    'hull-sub': (2.4, [('SplashGverb.wav', 1.12, .52, 0), ('WaterSurfaceExplosion06.wav', .9, .23, .08)]),
    'sink-small': (2.6, [('WaterSurfaceExplosion06.wav', 1, .72, 0), ('Splash.wav', 1.05, .28, .13)]),
    'sink-medium': (2.9, [('WaterSurfaceExplosion04.wav', 1, .72, 0), ('ExplosionMetal.wav', 1, .24, .03), ('SplashGverb.wav', 1, .22, .2)]),
    'sink-large': (3.5, [('WaterSurfaceExplosion02.wav', .9, .8, 0), ('ExplosionMetal.wav', .83, .45, .03), ('SplashGverb.wav', .94, .35, .29)]),
    'sink-sub': (3.2, [('SplashGverb.wav', .87, .76, 0), ('WaterSurfaceExplosion06.wav', .77, .21, .25)]),
}
manifest_path = dest / 'manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

for name, (slot, layers) in specs.items():
    mixed = np.zeros((round(slot * rate), 2), dtype=np.float64)
    for filename, speed, gain, delay in layers:
        original, original_rate = sf.read(source / filename, always_2d=True)
        onset = np.flatnonzero(np.max(np.abs(original), axis=1) > .008)
        if onset.size:
            original = original[max(0, int(onset[0]) - round(.004 * original_rate)):]
        if original.shape[1] == 1:
            original = np.repeat(original, 2, axis=1)
        start = round(delay * rate)
        count = min(len(mixed) - start, round(len(original) / original_rate / speed * rate))
        timeline = np.arange(count) * original_rate * speed / rate
        for channel in range(2):
            mixed[start:start + count, channel] += np.interp(timeline, np.arange(len(original)), original[:, channel]) * gain
    mixed = np.tanh(mixed * 1.35) * .82
    fade = round(.2 * rate)
    mixed[-fade:] *= np.linspace(1, 0, fade)[:, None]
    mixed[:88] *= np.linspace(0, 1, 88)[:, None]
    with tempfile.TemporaryDirectory() as folder:
        wav = Path(folder) / 'mix.wav'
        sf.write(wav, mixed, rate, subtype='FLOAT')
        subprocess.run([ffmpeg, '-v', 'error', '-y', '-i', str(wav),
                        '-af', 'highpass=f=35,alimiter=limit=0.88:level=false',
                        '-ar', str(rate), '-c:a', 'libmp3lame', '-b:a', '160k',
                        str(dest / (name + '.mp3'))], check=True)
    output = dest / (name + '.mp3')
    manifest['banks'][name] = {
        'file': output.name, 'slot': slot, 'count': 1,
        'sourceFiles': [filename for filename, _, _, _ in layers],
        'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'bytes': output.stat().st_size,
    }
    print(name, output.stat().st_size)

manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
