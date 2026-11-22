"""Synthesize a short original plucked-string score matched to the tour's chapter marks."""
import argparse
import wave
import numpy as np
from scipy.signal import butter, sosfilt

parser = argparse.ArgumentParser()
parser.add_argument("output")
parser.add_argument("--chapters", type=int, default=4)
args = parser.parse_args()
if args.chapters < 1:
    parser.error("--chapters must be positive")
sr = 44100
chapter = 2.8
closing = 3.4 + args.chapters * chapter
duration = closing + 4.5
samples = int(round(duration * sr))
mix = np.zeros((samples, 2), dtype=float)
rng = np.random.default_rng(356)

def place(t, signal, gain, pan=0.):
    start = int(t * sr)
    length = min(len(signal), samples - start)
    if length <= 0: return
    mix[start:start+length] += (signal[:length] * gain)[:,None] * np.sqrt([(1-pan)/2, (1+pan)/2])

def pluck(t, midi, gain, pan=0., bass=False):
    f = 440 * 2**((midi-69)/12)
    x = np.arange(int(2.6*sr))/sr
    y = np.zeros_like(x)
    for h, amplitude in enumerate((1,.37,.17,.11,.05),1):
        y += amplitude * np.sin(2*np.pi*f*h*x + .14*np.sin(x*37)*np.exp(-x*16)) * np.exp(-x*(2.15 if bass else 2.75)*h**.56)
    y *= (1-np.exp(-x*125))
    place(t,y,gain,pan)
    place(t+.19,y,.105*gain,-pan)
    place(t+.37,y,.062*gain,pan*.7)

def pad(t, chord, length):
    x=np.arange(int(length*sr))/sr
    envelope=np.minimum(1,x/.88)*np.minimum(1,(length-x)/1.1)
    for i,note in enumerate(chord):
        f=440*2**((note-69)/12)
        y=(np.sin(2*np.pi*f*x)+.36*np.sin(2*np.pi*f*1.002*x))*envelope
        place(t,y,.024,(-.5,0.,.5)[i])

def brush(t):
    x=np.arange(int(.28*sr))/sr
    noise=sosfilt(butter(2,[1000,4500],fs=sr,btype='band',output='sos'),rng.normal(size=len(x)))
    place(t,noise*np.sin(np.pi*x/.28)**2,.032,.14)

def pulse(t):
    x=np.arange(int(.27*sr))/sr
    tap=np.sin(2*np.pi*(65*x + 1.45*(1-np.exp(-x*45))))*(1-np.exp(-x*200))*np.exp(-x*15)
    place(t,tap,.084)

# D minor and suspended voicings. The quiet low pulse leaves the pictures in front.
chords=[(50,57,65),(46,53,62),(53,60,69),(48,55,64)]
bars=np.arange(0,closing-.12,chapter)
for bar,t in enumerate(bars):
    notes=chords[bar%len(chords)]
    pad(t,notes,3.12)
    pluck(t+.05,notes[0]-12,.175,-.08,True)
    for k,offset in enumerate((.10,.76,1.13,1.82,2.19)):
        if t+offset>closing-.35: continue
        pitch=(notes[1],notes[2],notes[1]+12,notes[2],notes[1])[k]
        pluck(t+offset,pitch,(.14,.105,.094,.12,.083)[k],(-.24,.22,-.08,.28,-.18)[k])
    if t>0:
        pulse(t+.02)
        pulse(t+1.42)
for mark in np.arange(3.4,closing+.1,chapter): brush(mark-.04)
pad(closing-.15,(50,57,65),4.4)
for tail,pitch,level in [(0,38,.15),(.19,57,.095),(.63,65,.13),(1.32,69,.12),(2.02,62,.11)]:
    pluck(closing+tail,pitch,level,.13,pitch<48)
time=np.arange(samples)/sr
mix*= (np.minimum(1,time/.10)*np.minimum(1,(duration-time)/.95))[:,None]
peak=np.max(np.abs(mix))
pcm=(mix/peak*(10**(-2.8/20))*32767).astype('<i2')
with wave.open(args.output,'wb') as file:
    file.setnchannels(2); file.setsampwidth(2); file.setframerate(sr); file.writeframes(pcm.tobytes())
