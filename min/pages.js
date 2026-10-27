const $ = (id) => document.getElementById(id);

function drawer(open) {
  $('drawer').classList.toggle('open', open);
  $('dbg').classList.toggle('open', open);
}

$('menu').addEventListener('click', () => drawer(true));
$('dx').addEventListener('click', () => drawer(false));
$('dbg').addEventListener('click', () => drawer(false));

const bar = $('bar');
let ticking = false;
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    bar.style.transform = 'scaleX(' + Math.min(1, (window.scrollY || 0) / max) + ')';
  });
}, { passive: true });

const items = Array.from(document.querySelectorAll('.reveal'));
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { threshold: 0.12 });
  items.forEach((el) => io.observe(el));
  setTimeout(() => items.forEach((el) => el.classList.add('in')), 3500);
} else {
  items.forEach((el) => el.classList.add('in'));
}

function toast(msg) {
  const box = $('toasts');
  if (!box || box.children.length >= 3) return;
  const el = document.createElement('div');
  el.className = 'toast error';
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

const form = $('cform');
if (form) {
  const show = (id, msg) => {
    const e = $(id);
    e.textContent = msg;
    e.classList.toggle('show', Boolean(msg));
  };
  form.addEventListener('input', () => ['ecName', 'ecEmail', 'ecMsg'].forEach((i) => show(i, '')));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('cName').value.trim().replace(/\s+/g, ' ');
    const email = $('cEmail').value.trim();
    const msg = $('cMsg').value.trim();
    let ok = true;
    if (name.length < 3) { show('ecName', 'Write your name.'); ok = false; }
    if (!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/.test(email)) { show('ecEmail', 'Enter a correct email address.'); ok = false; }
    if (msg.length < 5) { show('ecMsg', 'Write your message.'); ok = false; }
    if (!ok) {
      toast('Please fix the marked fields.');
      return;
    }
    const phone = $('cPhone').value.trim();
    const body = 'Name: ' + name + '\nEmail: ' + email + (phone ? '\nPhone: ' + phone : '') + '\n\n' + msg;
    window.location.href = 'mailto:harunalawali5522@gmail.com?subject=' + encodeURIComponent($('cSub').value) + '&body=' + encodeURIComponent(body);
  });
}
