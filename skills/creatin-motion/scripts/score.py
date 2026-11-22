"""Synthesize the original 45-second Creatin stereo score to the supplied WAV path."""
import sys
from scipy import signal
from scipy.io import wavfile
import numpy as np
rng = np.random.default_rng(25321)
sr = 44100
duration = 45
mix = np.zeros((sr * duration, 2), np.float32)

def add(t, w, pan=0):
    pos = round(t * sr)
    length = max(0, min(len(w), len(mix) - pos))
    if length:
        ang = (pan + 1) * np.pi / 4
        mix[pos:pos + length, 0] += w[:length] * np.cos(ang)
        mix[pos:pos + length, 1] += w[:length] * np.sin(ang)

def f(n):
    return 440 * 2 ** ((n - 69) / 12)

def tone(t, hz, length, vol, pan=0, flavor='bell', fall=5):
    x = np.arange(int(length * sr)) / sr
    if len(x) == 0:
        return
    ph = 2 * np.pi * hz * x
    if flavor == 'bell':
        w = np.sin(ph + 0.4 * np.exp(-x * 14) * np.sin(2 * ph)) + 0.22 * np.sin(2 * ph + 0.03) + 0.052 * np.sin(3.001 * ph)
    elif flavor == 'keys':
        w = np.sin(ph + 0.42 * np.exp(-x * 5) * np.sin(2.002 * ph)) + 0.11 * np.sin(2 * ph) + 0.08 * np.sin(ph * 1.002 + 0.13)
    else:
        w = np.sin(ph) + 0.22 * np.sin(ph * 2) + 0.065 * np.sin(ph * 3)
    a = 0.015 if flavor == 'keys' else 0.007
    env = np.minimum(1, x / a) * np.exp(-x * fall / length) * np.minimum(1, (length - x) / 0.022)
    add(t, (w * env * vol).astype('f'), pan)

def noise(t, length, vol, hz, q='highpass', pan=0, attack=0.003):
    x = np.arange(int(sr * length)) / sr
    if q == 'bandpass':
        filt = [hz * 0.63, min(18000, hz * 1.42)]
    else:
        filt = hz
    y = signal.sosfilt(signal.butter(3, filt, fs=sr, btype=q, output='sos'), rng.standard_normal(x.size))
    add(t, y * vol * np.minimum(1, x / attack) * np.exp(-x * 5 / length), pan)

def kick(t, g):
    x = np.arange(int(0.32 * sr)) / sr
    ph = 2 * np.pi * (46 * x + 82 * 0.035 * (1 - np.exp(-x / 0.035)))
    add(t, g * (np.sin(ph) + 0.035 * np.sin(2 * ph)) * np.exp(-x * 16) * np.minimum(1, x / 0.002))

def keys(t, ns, vol):
    for j, n in enumerate(ns):
        tone(t + 0.012 * j, f(n), 1.4, vol, (j - 1.5) * 0.2, 'keys', 4.4)
        tone(t + 0.022 + 0.012 * j, f(n) * 1.0028, 1, vol * 0.22, -(j - 1.5) * 0.18, 'keys')

def pluck(t, n, v, p):
    tone(t, f(n), 0.53, v, p)
    tone(t + 0.188, f(n), 0.4, v * 0.19, -p)
    tone(t + 0.375, f(n), 0.33, v * 0.1, p)
chords = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 69], [52, 55, 59, 62]]
bs = [45, 41, 43, 40]
lead = [[76, 72, 67, 69], [72, 69, 65, 64], [74, 71, 67, 69], [71, 67, 64, 62]]
for j in range(88):
    t = 0.08 + j * 0.5
    bar = j // 4
    idx = bar % 4
    bt = j % 4
    quiet = t < 4.5 or t >= 39
    lv = 0.72 if t < 9 else 0.69 if t >= 39 else 1
    if bt == 0 or (not quiet and (bt == 2 or (bar % 4 == 2 and bt == 3))):
        kick(t, 0.51 * lv)
    if not quiet and bt % 2:
        noise(t, 0.14, 0.26, 1750, 'bandpass', 0.08)
        noise(t + 0.017, 0.09, 0.12, 5100, pan=-0.18)
        tone(t, 184, 0.13, 0.088, 0.05, 'bass')
    if not quiet or bt % 2 == 0:
        noise(t + 0.255, 0.065, 0.12 * lv, 7000, pan=0.32 if bt % 2 else -0.34)
    if 17 < t < 38 and bt == 3 and bar % 2:
        noise(t + 0.384, 0.052, 0.087, 6700, pan=-0.22)
    if bt == 0 or (not quiet and bt == 2):
        tone(t + 0.013, f(bs[idx]), 0.76 if bt == 0 else 0.39, 0.27 * lv, 0, 'bass', 3.9)
    if bt == 0:
        keys(t + 0.017, chords[idx], 0.085 * lv)
    if not quiet and bt == 2 and (bar % 2 == 0):
        keys(t + 0.25, chords[idx][1:], 0.046)
    if not quiet and bt in (1, 3) or (quiet and bt == 2):
        pluck(t + 0.25, lead[idx][(bt + bar) % 4], 0.112 * lv, 0.21)
for t in [4.5, 9, 13.5, 18, 23.5, 28.5, 33.5, 39]:
    length = 0.23
    x = np.arange(int(sr * length)) / sr
    w = signal.sosfilt(signal.butter(2, [950, 4400], fs=sr, btype='bandpass', output='sos'), rng.standard_normal(x.size))
    add(t - 0.19, w * 0.115 * np.sin(np.pi * x / length) ** 2, -0.09)
    tone(t + 0.034, 740, 0.13, 0.059, 0.23)
for i, t in enumerate([2.25, 5.15, 5.28, 5.43, 5.55, 5.63, 15.85, 19.5, 19.78, 20.05, 26.1, 30.27, 41.8]):
    tone(t, 1100 + i % 3 * 154, 0.055, 0.084, 0.12)
    noise(t, 0.026, 0.086, 3000, 'bandpass')
keys(43.48, [57, 60, 64, 71], 0.081)
end = np.arange(mix.shape[0]) / sr
fade = np.clip((45 - end) / 1.5, 0, 1)
mix *= fade[:, None]
mix = np.tanh(mix * 1.48)
mix *= 0.86 / max(0.01, np.max(np.abs(mix)))
wavfile.write(sys.argv[1], sr, (32767 * mix).astype('int16'))
