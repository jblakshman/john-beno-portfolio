---
title: Tone Grid
description: An eight-step sequencer tuned to a pentatonic scale, so every pattern sounds good.
order: 2
experiment: tone-grid
tags: [Web Audio, Music]
hue: '#8b6cff'
interaction: Turn sound on, then tap cells to write a melody.
sound: true
---

Six notes of a C major pentatonic scale over eight steps at 112 BPM. Because the scale has no half steps, there are no wrong notes, which makes it a nice way to start a melody without thinking about theory.

The synth is two oscillators per note (a triangle and a quiet sine an octave up) with a short envelope and a feedback delay. All of it runs in the browser with the Web Audio API. Sound only starts after you press the button.
