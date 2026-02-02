/**
 * Celebrations module — canvas-based confetti/particle burst animations.
 */
const Celebrations = (() => {
  let canvas = null;
  let ctx = null;
  let particles = [];
  let animationId = null;

  const COLORS = ['#48bb78', '#d4a853', '#e8553d', '#4a9ead', '#f0ece4', '#f6e05e'];

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas || !canvas.parentElement) return;
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
  }

  function createParticle(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    const size = 3 + Math.random() * 5;
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    };
  }

  function burst(region) {
    if (!canvas || !ctx) return;
    resize();

    // Convert percentage region to pixel coordinates (center of region)
    const cx = (region.x + region.w / 2) / 100 * canvas.width;
    const cy = (region.y + region.h / 2) / 100 * canvas.height;

    const count = 60;
    for (let i = 0; i < count; i++) {
      particles.push(createParticle(cx, cy));
    }

    if (!animationId) animate();
  }

  function animate() {
    if (!ctx || particles.length === 0) {
      animationId = null;
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles = particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.life -= p.decay;
      p.rotation += p.rotationSpeed;

      if (p.life <= 0) return false;

      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      return true;
    });

    animationId = requestAnimationFrame(animate);
  }

  function isAnimating() {
    return particles.length > 0;
  }

  function clear() {
    particles = [];
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function getParticleCount() {
    return particles.length;
  }

  if (typeof window !== 'undefined') {
    window.Celebrations = { init, burst, clear, isAnimating, resize, getParticleCount };
  }

  return { init, burst, clear, isAnimating, resize, getParticleCount };
})();
