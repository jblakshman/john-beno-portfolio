/**
 * Scroll-scrubbed video, in the style of Apple's product pages.
 * The section is tall; the video stays pinned and its time follows the scroll
 * position, eased so it glides rather than jumps. Captions appear at their moments.
 */
export function initScrub() {
  document.querySelectorAll<HTMLElement>('[data-scrub]').forEach((sec) => {
    const video = sec.querySelector('video');
    const caps = [...sec.querySelectorAll<HTMLElement>('[data-from]')];
    const bar = sec.querySelector<HTMLElement>('[data-scrub-bar]');
    if (!video) return;
    let target = 0, current = 0, seeking = false, raf = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    video.addEventListener('seeked', () => (seeking = false));
    const loop = () => {
      raf = 0;
      const dur = video.duration || 0;
      const r = sec.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight)));
      target = p * dur;
      current += (target - current) * (reduce ? 1 : 0.14);
      if (dur && !seeking && Math.abs(video.currentTime - current) > 0.02) {
        seeking = true;
        video.currentTime = current;
      }
      bar?.style.setProperty('--p', p.toFixed(4));
      caps.forEach((c) => {
        const on = p >= Number(c.dataset.from) && p < Number(c.dataset.to);
        on ? (c.dataset.on = '') : delete c.dataset.on;
      });
      if (Math.abs(target - current) > 0.01) raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    window.addEventListener('scroll', kick, { passive: true });
    video.addEventListener('loadedmetadata', kick);
    kick();
  });
}
