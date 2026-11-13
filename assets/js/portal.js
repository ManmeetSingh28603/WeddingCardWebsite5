(function() {
  const canvas = document.getElementById('starsCanvas');
  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.size = Math.random() * 2 + 0.5;
      this.alpha = Math.random() * 0.7 + 0.1;
      this.fadeSpeed = Math.random() * 0.01 + 0.003;
      this.fadingOut = Math.random() > 0.5;
      this.vx = (Math.random() - 0.5) * 0.25;
      this.vy = -(Math.random() * 0.35 + 0.1);
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.fadingOut) {
        this.alpha -= this.fadeSpeed;
        if (this.alpha <= 0.05) this.fadingOut = false;
      } else {
        this.alpha += this.fadeSpeed;
        if (this.alpha >= 0.8) this.fadingOut = true;
      }
      if (this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.reset();
        this.y = height + 10;
      }
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212, 175, 55, ${this.alpha})`;
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(238, 200, 107, 0.7)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  for (let i = 0; i < 45; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (let p of particles) {
      p.update();
      p.draw();
    }
    requestAnimationFrame(animate);
  }
  animate();
})();