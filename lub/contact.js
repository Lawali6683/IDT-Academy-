(function () {
  var d = document;
  var $ = function (id) { return d.getElementById(id); };
  var to = '';
  try { to = atob(window.__t || '').split('').reverse().join(''); } catch (e) { to = ''; }
  var text = '';
  var subj = '';
  var mail = '';

  function setErr(k, m) {
    var e = $('ec' + k);
    if (!e) return;
    e.textContent = m;
    e.classList.toggle('show', Boolean(m));
    var box = e.closest('.f');
    if (box) box.classList.toggle('bad', Boolean(m));
  }

  var msg = $('cMsg');
  msg.addEventListener('input', function () { $('cCnt').textContent = msg.value.length; setErr('Msg', ''); });
  ['cName', 'cEmail', 'cTopic'].forEach(function (id) {
    $(id).addEventListener('input', function () { setErr(id.slice(1), ''); });
  });

  $('ctForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if ($('cWeb').value) return;
    var name = $('cName').value.trim().replace(/\s+/g, ' ');
    var email = $('cEmail').value.trim();
    var topic = $('cTopic').value;
    var body = msg.value.trim();
    var ok = true;
    setErr('Name', ''); setErr('Email', ''); setErr('Topic', ''); setErr('Msg', '');
    if (name.length < 3) { setErr('Name', 'Please write your name.'); ok = false; }
    if (!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/.test(email)) { setErr('Email', 'Enter a correct email address.'); ok = false; }
    if (!topic) { setErr('Topic', 'Choose a topic.'); ok = false; }
    if (body.length < 10) { setErr('Msg', 'Please write at least 10 letters.'); ok = false; }
    if (!ok || !to) return;
    subj = topic + ' - ' + name;
    text = body + '\n\nName: ' + name + '\nEmail: ' + email;
    mail = 'mailto:' + to + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(text);
    $('ctForm').classList.add('hidden');
    $('ctDone').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.location.href = mail;
  });

  $('ctWeb').addEventListener('click', function () {
    var ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    var url = ios
      ? 'googlegmail:///co?to=' + encodeURIComponent(to) + '&subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(text)
      : 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(to) + '&su=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(text);
    window.open(url, '_blank', 'noopener');
  });

  $('ctCopy').addEventListener('click', function () {
    var btn = $('ctCopy');
    var done = function () { btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied'; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(subj + '\n\n' + text).then(done, function () {});
    } else {
      var t = d.createElement('textarea');
      t.value = subj + '\n\n' + text;
      d.body.appendChild(t);
      t.select();
      try { d.execCommand('copy'); done(); } catch (er) {}
      t.remove();
    }
  });

  $('ctAgain').addEventListener('click', function () {
    $('ctForm').reset();
    $('cCnt').textContent = '0';
    $('ctForm').classList.remove('hidden');
    $('ctDone').classList.add('hidden');
  });
})();
