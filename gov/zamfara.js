const FORM_API = '/api/gov';
const SITE_ID = 'GOV';
const IMGUR_API = 'https://api.imgur.com/3/image';
const IMGUR_CLIENT = 'Client-ID 5acf7eff9c91660';
const SUBMIT_TIMEOUT_MS = 25000;
const UPLOAD_TIMEOUT_MS = 45000;
const IMAGE_MAX_SIDE = 1400;
const IMAGE_QUALITY = 0.85;
const PAGE_SIZE = 12;
const CHIP_LIMIT = 18;
const TYPER_LIMIT = 40;
const PICK_LIMIT = 60;
const NAV_OFFSET = 66;

const WORK_IMAGES = [
  'https://i.imgur.com/iBq0hTL.jpeg',
  'https://i.imgur.com/l2TvZhU.jpeg',
  'https://i.imgur.com/6GGGV5O.jpeg',
  'https://i.imgur.com/JucUKWj.jpeg',
  'https://i.imgur.com/WJ6aUF2.jpeg',
  'https://i.imgur.com/q8SGRle.jpeg',
  'https://i.imgur.com/daCGFib.jpeg'
];

const PLACEHOLDER_IMG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#065f46"/><stop offset="1" stop-color="#fbbf24"/></linearGradient></defs><rect width="600" height="420" fill="url(#g)"/><circle cx="300" cy="170" r="60" fill="rgba(255,255,255,.22)"/><text x="300" y="290" fill="#ffffff" font-family="Arial, sans-serif" font-size="30" font-weight="bold" text-anchor="middle">Free Skills</text></svg>');

const CATEGORIES = {
  '1': 'Technology & Computing',
  '2': 'Vocational & Agricultural Skills',
  '3': 'Health & Community Wellness',
  '4': '2-Year Diploma Program'
};

const CAT_ORDER = ['1', '2', '3', '4'];

const ID_TYPES = {
  nin: { label: 'NIN', field: 'NIN number', help: 'Your NIN has 11 numbers.', placeholder: '12345678901', maxlength: 11, mode: 'numeric', test: /^\d{11}$/, error: 'Your NIN must be exactly 11 numbers.' },
  voter: { label: 'Voter card', field: 'Voter card number (VIN)', help: 'Write the long number on your voter card exactly as it is.', placeholder: 'Voter card number', maxlength: 22, mode: 'text', test: /^[A-Za-z0-9]{9,22}$/, error: 'Please enter your voter card number correctly. Use letters and numbers only.' }
};

const NG = {
  'Abia': 'Aba North|Aba South|Arochukwu|Bende|Ikwuano|Isiala Ngwa North|Isiala Ngwa South|Isuikwuato|Obi Ngwa|Ohafia|Osisioma|Ugwunagbo|Ukwa East|Ukwa West|Umuahia North|Umuahia South|Umu Nneochi',
  'Adamawa': 'Demsa|Fufure|Ganye|Girei|Gombi|Guyuk|Hong|Jada|Lamurde|Madagali|Maiha|Mayo Belwa|Michika|Mubi North|Mubi South|Numan|Shelleng|Song|Toungo|Yola North|Yola South',
  'Akwa Ibom': 'Abak|Eastern Obolo|Eket|Esit Eket|Essien Udim|Etim Ekpo|Etinan|Ibeno|Ibesikpo Asutan|Ibiono Ibom|Ika|Ikono|Ikot Abasi|Ikot Ekpene|Ini|Itu|Mbo|Mkpat Enin|Nsit Atai|Nsit Ibom|Nsit Ubium|Obot Akara|Okobo|Onna|Oron|Oruk Anam|Udung Uko|Ukanafun|Uruan|Urue-Offong/Oruko|Uyo',
  'Anambra': 'Aguata|Anambra East|Anambra West|Anaocha|Awka North|Awka South|Ayamelum|Dunukofia|Ekwusigo|Idemili North|Idemili South|Ihiala|Njikoka|Nnewi North|Nnewi South|Ogbaru|Onitsha North|Onitsha South|Orumba North|Orumba South|Oyi',
  'Bauchi': 'Alkaleri|Bauchi|Bogoro|Damban|Darazo|Dass|Gamawa|Ganjuwa|Giade|Itas/Gadau|Jama\'are|Katagum|Kirfi|Misau|Ningi|Shira|Tafawa Balewa|Toro|Warji|Zaki',
  'Bayelsa': 'Brass|Ekeremor|Kolokuma/Opokuma|Nembe|Ogbia|Sagbama|Southern Ijaw|Yenagoa',
  'Benue': 'Ado|Agatu|Apa|Buruku|Gboko|Guma|Gwer East|Gwer West|Katsina-Ala|Konshisha|Kwande|Logo|Makurdi|Obi|Ogbadibo|Ohimini|Oju|Okpokwu|Otukpo|Tarka|Ukum|Ushongo|Vandeikya',
  'Borno': 'Abadam|Askira/Uba|Bama|Bayo|Biu|Chibok|Damboa|Dikwa|Gubio|Guzamala|Gwoza|Hawul|Jere|Kaga|Kala/Balge|Konduga|Kukawa|Kwaya Kusar|Mafa|Magumeri|Maiduguri|Marte|Mobbar|Monguno|Ngala|Nganzai|Shani',
  'Cross River': 'Abi|Akamkpa|Akpabuyo|Bakassi|Bekwarra|Biase|Boki|Calabar Municipal|Calabar South|Etung|Ikom|Obanliku|Obubra|Obudu|Odukpani|Ogoja|Yakuur|Yala',
  'Delta': 'Aniocha North|Aniocha South|Bomadi|Burutu|Ethiope East|Ethiope West|Ika North East|Ika South|Isoko North|Isoko South|Ndokwa East|Ndokwa West|Okpe|Oshimili North|Oshimili South|Patani|Sapele|Udu|Ughelli North|Ughelli South|Ukwuani|Uvwie|Warri North|Warri South|Warri South West',
  'Ebonyi': 'Abakaliki|Afikpo North|Afikpo South|Ebonyi|Ezza North|Ezza South|Ikwo|Ishielu|Ivo|Izzi|Ohaozara|Ohaukwu|Onicha',
  'Edo': 'Akoko-Edo|Egor|Esan Central|Esan North-East|Esan South-East|Esan West|Etsako Central|Etsako East|Etsako West|Igueben|Ikpoba Okha|Orhionmwon|Oredo|Ovia North-East|Ovia South-West|Owan East|Owan West|Uhunmwonde',
  'Ekiti': 'Ado Ekiti|Efon|Ekiti East|Ekiti South-West|Ekiti West|Emure|Gbonyin|Ido Osi|Ijero|Ikere|Ikole|Ilejemeje|Irepodun/Ifelodun|Ise/Orun|Moba|Oye',
  'Enugu': 'Aninri|Awgu|Enugu East|Enugu North|Enugu South|Ezeagu|Igbo Etiti|Igbo Eze North|Igbo Eze South|Isi Uzo|Nkanu East|Nkanu West|Nsukka|Oji River|Udenu|Udi|Uzo Uwani',
  'FCT - Abuja': 'Abaji|Bwari|Gwagwalada|Kuje|Kwali|Municipal Area Council',
  'Gombe': 'Akko|Balanga|Billiri|Dukku|Funakaye|Gombe|Kaltungo|Kwami|Nafada|Shongom|Yamaltu/Deba',
  'Imo': 'Aboh Mbaise|Ahiazu Mbaise|Ehime Mbano|Ezinihitte|Ideato North|Ideato South|Ihitte/Uboma|Ikeduru|Isiala Mbano|Isu|Mbaitoli|Ngor Okpala|Njaba|Nkwerre|Nwangele|Obowo|Oguta|Ohaji/Egbema|Okigwe|Onuimo|Orlu|Orsu|Oru East|Oru West|Owerri Municipal|Owerri North|Owerri West',
  'Jigawa': 'Auyo|Babura|Biriniwa|Birnin Kudu|Buji|Dutse|Gagarawa|Garki|Gumel|Guri|Gwaram|Gwiwa|Hadejia|Jahun|Kafin Hausa|Kaugama|Kazaure|Kiri Kasama|Kiyawa|Maigatari|Malam Madori|Miga|Ringim|Roni|Sule Tankarkar|Taura|Yankwashi',
  'Kaduna': 'Birnin Gwari|Chikun|Giwa|Igabi|Ikara|Jaba|Jema\'a|Kachia|Kaduna North|Kaduna South|Kagarko|Kajuru|Kaura|Kauru|Kubau|Kudan|Lere|Makarfi|Sabon Gari|Sanga|Soba|Zangon Kataf|Zaria',
  'Kano': 'Ajingi|Albasu|Bagwai|Bebeji|Bichi|Bunkure|Dala|Dambatta|Dawakin Kudu|Dawakin Tofa|Doguwa|Fagge|Gabasawa|Garko|Garun Mallam|Gaya|Gezawa|Gwale|Gwarzo|Kabo|Kano Municipal|Karaye|Kibiya|Kiru|Kumbotso|Kunchi|Kura|Madobi|Makoda|Minjibir|Nasarawa|Rano|Rimin Gado|Rogo|Shanono|Sumaila|Takai|Tarauni|Tofa|Tsanyawa|Tudun Wada|Ungogo|Warawa|Wudil',
  'Katsina': 'Bakori|Batagarawa|Batsari|Baure|Bindawa|Charanchi|Dandume|Danja|Dan Musa|Daura|Dutsi|Dutsin Ma|Faskari|Funtua|Ingawa|Jibia|Kafur|Kaita|Kankara|Kankia|Katsina|Kurfi|Kusada|Mai\'Adua|Malumfashi|Mani|Mashi|Matazu|Musawa|Rimi|Sabuwa|Safana|Sandamu|Zango',
  'Kebbi': 'Aleiro|Arewa Dandi|Argungu|Augie|Bagudo|Birnin Kebbi|Bunza|Dandi|Fakai|Gwandu|Jega|Kalgo|Koko/Besse|Maiyama|Ngaski|Sakaba|Shanga|Suru|Danko/Wasagu|Yauri|Zuru',
  'Kogi': 'Adavi|Ajaokuta|Ankpa|Bassa|Dekina|Ibaji|Idah|Igalamela-Odolu|Ijumu|Kabba/Bunu|Koton Karfe|Lokoja|Mopa-Muro|Ofu|Ogori/Magongo|Okehi|Okene|Olamaboro|Omala|Yagba East|Yagba West',
  'Kwara': 'Asa|Baruten|Edu|Ekiti|Ifelodun|Ilorin East|Ilorin South|Ilorin West|Irepodun|Isin|Kaiama|Moro|Offa|Oke Ero|Oyun|Pategi',
  'Lagos': 'Agege|Ajeromi-Ifelodun|Alimosho|Amuwo-Odofin|Apapa|Badagry|Epe|Eti-Osa|Ibeju-Lekki|Ifako-Ijaiye|Ikeja|Ikorodu|Kosofe|Lagos Island|Lagos Mainland|Mushin|Ojo|Oshodi-Isolo|Shomolu|Surulere',
  'Nasarawa': 'Akwanga|Awe|Doma|Karu|Keana|Keffi|Kokona|Lafia|Nasarawa|Nasarawa Egon|Obi|Toto|Wamba',
  'Niger': 'Agaie|Agwara|Bida|Borgu|Bosso|Chanchaga|Edati|Gbako|Gurara|Katcha|Kontagora|Lapai|Lavun|Magama|Mariga|Mashegu|Mokwa|Moya|Paikoro|Rafi|Rijau|Shiroro|Suleja|Tafa|Wushishi',
  'Ogun': 'Abeokuta North|Abeokuta South|Ado-Odo/Ota|Egbado North|Egbado South|Ewekoro|Ifo|Ijebu East|Ijebu North|Ijebu North East|Ijebu Ode|Ikenne|Imeko Afon|Ipokia|Obafemi Owode|Odeda|Odogbolu|Ogun Waterside|Remo North|Shagamu',
  'Ondo': 'Akoko North-East|Akoko North-West|Akoko South-East|Akoko South-West|Akure North|Akure South|Ese Odo|Idanre|Ifedore|Ilaje|Ile Oluji/Okeigbo|Irele|Odigbo|Okitipupa|Ondo East|Ondo West|Ose|Owo',
  'Osun': 'Atakunmosa East|Atakunmosa West|Aiyedaade|Aiyedire|Boluwaduro|Boripe|Ede North|Ede South|Egbedore|Ejigbo|Ife Central|Ife East|Ife North|Ife South|Ifedayo|Ifelodun|Ila|Ilesa East|Ilesa West|Irepodun|Irewole|Isokan|Iwo|Obokun|Odo Otin|Ola Oluwa|Olorunda|Oriade|Orolu|Osogbo',
  'Oyo': 'Afijio|Akinyele|Atiba|Atisbo|Egbeda|Ibadan North|Ibadan North-East|Ibadan North-West|Ibadan South-East|Ibadan South-West|Ibarapa Central|Ibarapa East|Ibarapa North|Ido|Irepo|Iseyin|Itesiwaju|Iwajowa|Kajola|Lagelu|Ogbomosho North|Ogbomosho South|Ogo Oluwa|Olorunsogo|Oluyole|Ona Ara|Orelope|Ori Ire|Oyo East|Oyo West|Saki East|Saki West|Surulere',
  'Plateau': 'Barkin Ladi|Bassa|Bokkos|Jos East|Jos North|Jos South|Kanam|Kanke|Langtang North|Langtang South|Mangu|Mikang|Pankshin|Qua\'an Pan|Riyom|Shendam|Wase',
  'Rivers': 'Abua/Odual|Ahoada East|Ahoada West|Akuku-Toru|Andoni|Asari-Toru|Bonny|Degema|Eleme|Emohua|Etche|Gokana|Ikwerre|Khana|Obio/Akpor|Ogba/Egbema/Ndoni|Ogu/Bolo|Okrika|Omuma|Opobo/Nkoro|Oyigbo|Port Harcourt|Tai',
  'Sokoto': 'Binji|Bodinga|Dange Shuni|Gada|Goronyo|Gudu|Gwadabawa|Illela|Isa|Kebbe|Kware|Rabah|Sabon Birni|Shagari|Silame|Sokoto North|Sokoto South|Tambuwal|Tangaza|Tureta|Wamako|Wurno|Yabo',
  'Taraba': 'Ardo Kola|Bali|Donga|Gashaka|Gassol|Ibi|Jalingo|Karim Lamido|Kurmi|Lau|Sardauna|Takum|Ussa|Wukari|Yorro|Zing',
  'Yobe': 'Bade|Bursari|Damaturu|Fika|Fune|Geidam|Gujba|Gulani|Jakusko|Karasuwa|Machina|Nangere|Nguru|Potiskum|Tarmuwa|Yunusari|Yusufari',
  'Zamfara': 'Anka|Bakura|Birnin Magaji/Kiyaw|Bukkuyum|Bungudu|Gummi|Gusau|Kaura Namoda|Maradun|Maru|Shinkafi|Talata Mafara|Tsafe|Zurmi'
};

const CARD = {};
const rowState = {};
const media = {
  face: { url: '', busy: false, seq: 0, local: '' },
  id: { url: '', busy: false, seq: 0, local: '' }
};

let availableConfig = { all: false, keys: new Set() };
let allCourses = [];
let availableCourses = [];
let selectedCourse = null;
let modalCourse = null;
let deadlineMs = 0;
let countdownTimer = null;
let applyOpen = false;
let submitting = false;
let formUid = '';
let typerTimer = null;
let typerVisible = false;
let toastCount = 0;
let camStream = null;
let camFacing = 'user';
let camTarget = '';
let camStarting = false;

const $ = (id) => document.getElementById(id);
const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function norm(str) {
  return String(str == null ? '' : str).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

function compact(str) {
  return norm(str).replace(/\s+/g, '');
}

function newUid() {
  try {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  } catch (_) {}
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += '-';
    else if (i === 14) out += '4';
    else if (i === 19) out += hex[8 + Math.floor(Math.random() * 4)];
    else out += hex[Math.floor(Math.random() * 16)];
  }
  return out;
}

function toast(type, title, message) {
  const wrap = $('toastWrap');
  if (!wrap || toastCount >= 3) return;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i><div><b>' + esc(title) + '</b><p>' + esc(message) + '</p></div>';
  wrap.appendChild(el);
  toastCount++;
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => {
      el.remove();
      toastCount = Math.max(0, toastCount - 1);
    }, 300);
  }, type === 'error' ? 5200 : 3600);
}

function getYouTubeId(url) {
  const u = String(url || '').trim();
  let m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = u.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}

function readAvailableConfig() {
  const items = qsa('#availableConfig li').map((li) => li.textContent.trim()).filter(Boolean);
  const all = items.some((t) => t === '#');
  const keys = new Set(items.filter((t) => t !== '#').map(compact).filter(Boolean));
  return { all: all, keys: keys };
}

function isAvailable(course) {
  if (availableConfig.all) return true;
  return availableConfig.keys.has(compact(course.course_name));
}

function catName(course) {
  return CATEGORIES[String(course.category)] || 'Course';
}

function shortDesc(course, max) {
  const d = String(course.info_text || '').replace(/\s+/g, ' ').trim();
  return d.length > max ? d.slice(0, max).trim() + '...' : d;
}

function imgTag(course, cls) {
  return '<img' + (cls ? ' class="' + cls + '"' : '') + ' src="' + esc(course.image_url || PLACEHOLDER_IMG) + '" alt="' + esc(course.course_name) + '" loading="lazy" decoding="async">';
}

function acts(course) {
  return '<div class="acts"><button type="button" class="b-view" data-act="view" data-id="' + esc(course.id) + '"><i class="fa-solid fa-eye"></i> View</button>' +
    '<button type="button" class="b-apply" data-act="apply" data-id="' + esc(course.id) + '"><i class="fa-solid fa-bolt"></i> Apply Free</button></div>';
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/* Four different card designs, one for each category */
CARD['1'] = (c, i) =>
  '<article class="cc cc-1">' +
    '<div class="c1-img">' + imgTag(c) + '</div>' +
    '<span class="c1-id">MODULE // ' + pad2((i || 0) + 1) + '</span>' +
    '<h4>' + esc(c.course_name) + '</h4><p>' + esc(shortDesc(c, 100)) + '</p>' + acts(c) +
  '</article>';

CARD['2'] = (c, i) =>
  '<article class="cc cc-2">' +
    '<div class="c2-img">' + imgTag(c) + '</div>' +
    '<span class="c2-tag">FIG. ' + pad2((i || 0) + 1) + ' - ' + esc(catName(c)) + '</span>' +
    '<h4>' + esc(c.course_name) + '</h4><p>' + esc(shortDesc(c, 100)) + '</p>' + acts(c) +
  '</article>';

CARD['3'] = (c) =>
  '<article class="cc cc-3">' +
    '<div class="c3-img">' + imgTag(c) + '</div>' +
    '<h4>' + esc(c.course_name) + '</h4><p>' + esc(shortDesc(c, 90)) + '</p>' + acts(c) +
  '</article>';

CARD['4'] = (c) =>
  '<article class="cc cc-4">' +
    '<div class="c4-img">' + imgTag(c) + '<span class="c4-seal"><i class="fa-solid fa-award"></i></span></div>' +
    '<small>Certificate Program</small><h4>' + esc(c.course_name) + '</h4><p>' + esc(shortDesc(c, 95)) + '</p>' + acts(c) +
  '</article>';

async function loadCourses() {
  const mod = await import('./supabase.js');
  const supabase = mod.supabase || mod.default;
  if (!supabase) throw new Error('supabase');
  const { data, error } = await supabase.from('courses').select('*');
  if (error) throw error;
  const list = (data || []).map((row) => {
    let cd = row.course_data;
    if (typeof cd === 'string') {
      try { cd = JSON.parse(cd); } catch (e) { cd = null; }
    }
    if (!cd || typeof cd !== 'object') return null;
    return Object.assign({}, cd, { id: cd.id || row.id });
  }).filter((c) => c && c.id && c.course_name);
  list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return list;
}

function appendCards(cat) {
  const st = rowState[cat];
  const row = $('row-' + cat);
  if (!st || !row) return;
  const more = row.querySelector('.cc-more');
  if (more) more.remove();
  const start = st.shown;
  const next = st.items.slice(start, start + PAGE_SIZE);
  row.insertAdjacentHTML('beforeend', next.map((c, i) => CARD[cat](c, start + i)).join(''));
  st.shown += next.length;
  const left = st.items.length - st.shown;
  if (left > 0) {
    row.insertAdjacentHTML('beforeend', '<button type="button" class="cc-more" data-more="' + cat + '"><i class="fa-solid fa-circle-plus"></i><b>Show more</b><small>' + left + ' more</small></button>');
  }
}

function renderCategories() {
  const groups = { '1': [], '2': [], '3': [], '4': [] };
  availableCourses.forEach((c) => {
    const k = String(c.category || '1');
    if (groups[k]) groups[k].push(c);
  });
  let any = false;
  CAT_ORDER.forEach((k) => {
    const sec = $('ps-' + k);
    const row = $('row-' + k);
    const count = $('count-' + k);
    const items = groups[k];
    if (!sec || !row) return;
    if (!items.length) {
      sec.classList.add('hidden');
      row.innerHTML = '';
      rowState[k] = null;
      return;
    }
    any = true;
    sec.classList.remove('hidden');
    if (count) count.textContent = items.length + (items.length === 1 ? ' course' : ' courses');
    rowState[k] = { items: items, shown: 0 };
    row.innerHTML = '';
    appendCards(k);
  });
  const empty = $('coursesEmpty');
  if (empty) empty.classList.toggle('hidden', any);
}

function renderAvailable() {
  const sec = $('available');
  if (!sec) return;
  if (!availableCourses.length) {
    sec.classList.add('hidden');
    stopTyper();
    return;
  }
  sec.classList.remove('hidden');
  const count = $('avCount');
  if (count) count.textContent = String(availableCourses.length);
  const chips = availableCourses.slice(0, CHIP_LIMIT).map((c) =>
    '<button type="button" class="av-chip" data-act="apply" data-id="' + esc(c.id) + '">' +
      '<img src="' + esc(c.image_url || PLACEHOLDER_IMG) + '" alt="" loading="lazy" decoding="async">' +
      '<span>' + esc(c.course_name) + '</span><i class="fa-solid fa-arrow-right"></i>' +
    '</button>'
  );
  const extra = availableCourses.length - CHIP_LIMIT;
  if (extra > 0) chips.push('<a class="av-chip av-more" href="#courses"><i class="fa-solid fa-layer-group"></i><span>+' + extra + ' more courses</span></a>');
  const box = $('avChips');
  if (box) box.innerHTML = chips.join('');
  startTyper(availableCourses.slice(0, TYPER_LIMIT).map((c) => c.course_name));
}

function stopTyper() {
  if (typerTimer) clearTimeout(typerTimer);
  typerTimer = null;
}

function startTyper(names) {
  const el = $('typer');
  stopTyper();
  if (!el || !names.length) return;
  let i = 0;
  let j = 0;
  let deleting = false;
  const tick = () => {
    if (!typerVisible || document.hidden) {
      typerTimer = setTimeout(tick, 700);
      return;
    }
    const full = names[i];
    if (!deleting) {
      j++;
      el.textContent = full.slice(0, j);
      if (j >= full.length) {
        deleting = true;
        typerTimer = setTimeout(tick, 1600);
        return;
      }
      typerTimer = setTimeout(tick, 60);
    } else {
      j--;
      el.textContent = full.slice(0, j);
      if (j <= 0) {
        deleting = false;
        i = (i + 1) % names.length;
        typerTimer = setTimeout(tick, 350);
        return;
      }
      typerTimer = setTimeout(tick, 28);
    }
  };
  tick();
}

function showCoursesError() {
  const sk = $('coursesSkeleton');
  const er = $('coursesError');
  if (sk) sk.classList.add('hidden');
  if (er) er.classList.remove('hidden');
  CAT_ORDER.forEach((k) => {
    const sec = $('ps-' + k);
    if (sec) sec.classList.add('hidden');
  });
  const av = $('available');
  if (av) av.classList.add('hidden');
}

async function initCourses() {
  const sk = $('coursesSkeleton');
  const er = $('coursesError');
  if (sk) sk.classList.remove('hidden');
  if (er) er.classList.add('hidden');
  try {
    allCourses = await loadCourses();
    availableConfig = readAvailableConfig();
    availableCourses = allCourses.filter(isAvailable);
    if (sk) sk.classList.add('hidden');
    renderAvailable();
    renderCategories();
    renderPicker('');
  } catch (err) {
    showCoursesError();
  }
}

function findCourse(id) {
  return allCourses.find((c) => String(c.id) === String(id)) || null;
}

function isClosed() {
  return deadlineMs > 0 && Date.now() >= deadlineMs;
}

function readDeadline() {
  const el = $('siteConfig');
  const t = Date.parse((el && el.dataset.deadline) || '');
  return isFinite(t) ? t : 0;
}

function tickCountdown() {
  const sec = $('dlSection');
  const pill = $('navCount');
  if (!deadlineMs) {
    if (sec) sec.classList.add('hidden');
    if (pill) pill.classList.add('hidden');
    return;
  }
  const left = deadlineMs - Date.now();
  const tiles = $('dlTiles');
  const closed = $('dlClosed');
  if (left <= 0) {
    document.body.classList.add('is-closed');
    if (tiles) tiles.classList.add('hidden');
    if (closed) closed.classList.remove('hidden');
    if (pill) pill.innerHTML = '<i class="fa-solid fa-lock"></i> Closed';
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = null;
    return;
  }
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const set = (id, v) => {
    const el = $(id);
    if (el) el.textContent = v;
  };
  set('dlD', pad2(d));
  set('dlH', pad2(h));
  set('dlM', pad2(m));
  set('dlS', pad2(s));
  if (pill) pill.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> ' + (d > 0 ? d + 'd ' + h + 'h left' : h + 'h ' + m + 'm left');
}

function setupCountdown() {
  deadlineMs = readDeadline();
  const dateEl = $('dlDate');
  if (dateEl && deadlineMs) {
    dateEl.textContent = new Date(deadlineMs).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  tickCountdown();
  if (deadlineMs && !isClosed()) {
    countdownTimer = setInterval(() => {
      if (!document.hidden) tickCountdown();
    }, 1000);
  }
}

function quakeThen(origin, done) {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rect = origin && origin.getBoundingClientRect ? origin.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  if (reduce) {
    done(x, y);
    return;
  }
  const rp = document.createElement('span');
  rp.className = 'ripple';
  rp.style.left = x + 'px';
  rp.style.top = y + 'px';
  document.body.appendChild(rp);
  const page = $('page');
  if (page) page.classList.add('quake');
  setTimeout(() => {
    if (page) page.classList.remove('quake');
    rp.remove();
  }, 650);
  setTimeout(() => done(x, y), 360);
}

function revealApply(x, y) {
  const ap = $('applyPage');
  if (!ap) return;
  ap.style.setProperty('--x', x + 'px');
  ap.style.setProperty('--y', y + 'px');
  ap.scrollTop = 0;
  ap.classList.add('open');
  document.body.style.overflow = 'hidden';
  applyOpen = true;
  try {
    history.pushState({ apply: 1 }, '', '#apply');
  } catch (_) {}
  updateProgress();
}

function hideApply() {
  const ap = $('applyPage');
  if (ap) ap.classList.remove('open');
  applyOpen = false;
  closeSheet();
  closeCam();
  document.body.style.overflow = '';
}

function closeApply() {
  if (!applyOpen) return;
  if (history.state && history.state.apply) history.back();
  else hideApply();
}

function openApply(course, origin) {
  if (isClosed()) {
    toast('info', 'Applications Closed', 'Thank you for your interest. Applications are now closed.');
    return;
  }
  if (course) setCourse(course);
  closeModal();
  closeMenu();
  quakeThen(origin, revealApply);
}

function setCourse(course) {
  selectedCourse = course;
  const img = $('courseBtnImg');
  const txt = $('courseBtnText');
  const btn = $('courseBtn');
  if (course) {
    if (img) {
      img.src = course.image_url || PLACEHOLDER_IMG;
      img.classList.remove('hidden');
    }
    if (txt) txt.innerHTML = '<b>' + esc(course.course_name) + '</b><small>' + esc(catName(course)) + ' - tap to change</small>';
    if (btn) btn.classList.add('chosen');
    clearErr('Course');
  } else {
    if (img) img.classList.add('hidden');
    if (txt) txt.innerHTML = '<b>Tap here to choose your course</b><small>Choose the free course you want to learn</small>';
    if (btn) btn.classList.remove('chosen');
  }
  renderPicker(($('pickSearch') || {}).value || '');
  updateProgress();
}

function renderPicker(filter) {
  const list = $('pickList');
  if (!list) return;
  const q = norm(filter);
  const items = availableCourses.filter((c) => !q || norm(c.course_name).indexOf(q) !== -1 || norm(catName(c)).indexOf(q) !== -1).slice(0, PICK_LIMIT);
  if (!availableCourses.length) {
    list.innerHTML = '<div class="pk-empty"><i class="fa-solid fa-hourglass-half"></i>Courses are not available right now. Please check back soon.</div>';
    return;
  }
  if (!items.length) {
    list.innerHTML = '<div class="pk-empty"><i class="fa-solid fa-magnifying-glass-minus"></i>No course found. Try another word.</div>';
    return;
  }
  list.innerHTML = items.map((c) =>
    '<button type="button" class="pk-item' + (selectedCourse && String(selectedCourse.id) === String(c.id) ? ' on' : '') + '" data-pick="' + esc(c.id) + '">' +
      '<img src="' + esc(c.image_url || PLACEHOLDER_IMG) + '" alt="" loading="lazy" decoding="async">' +
      '<div><b>' + esc(c.course_name) + '</b><small>' + esc(catName(c)) + '</small></div>' +
      '<i class="fa-solid fa-circle-check"></i>' +
    '</button>'
  ).join('');
}

function openSheet() {
  const s = $('pickSheet');
  if (s) s.classList.add('open');
  const bd = $('pickBackdrop');
  if (bd) bd.classList.add('open');
  const si = $('pickSearch');
  if (si) si.value = '';
  renderPicker('');
}

function closeSheet() {
  const s = $('pickSheet');
  if (s) s.classList.remove('open');
  const bd = $('pickBackdrop');
  if (bd) bd.classList.remove('open');
}

function openModal(course) {
  const m = $('courseModal');
  if (!m || !course) return;
  modalCourse = course;
  const img = $('cmImg');
  if (img) {
    img.src = course.image_url || PLACEHOLDER_IMG;
    img.alt = course.course_name;
  }
  const set = (id, v) => {
    const el = $(id);
    if (el) el.textContent = v;
  };
  set('cmCat', catName(course));
  set('cmName', course.course_name);
  set('cmInfo', String(course.info_text || 'Learn this skill online with video lessons, an AI teacher and a free professional certificate.'));
  m.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const m = $('courseModal');
  if (m) m.classList.remove('open');
  modalCourse = null;
  if (!applyOpen) document.body.style.overflow = '';
}

function openMenu() {
  const m = $('spanMenu');
  const b = $('spanBackdrop');
  if (m) m.classList.add('open');
  if (b) b.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  const m = $('spanMenu');
  const b = $('spanBackdrop');
  if (m) m.classList.remove('open');
  if (b) b.classList.remove('open');
  if (!applyOpen && !modalCourse) document.body.style.overflow = '';
}

/* Span menu: tap a button, the menu goes away, and the page scrolls to that section */
function goToSection(id) {
  const target = $(id);
  closeMenu();
  if (!target) return;
  setTimeout(() => {
    const top = target.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0) - (id === 'home' ? 0 : NAV_OFFSET);
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, 80);
}

const ERR_KEYS = ['Name', 'Phone', 'Course', 'State', 'Lga', 'Gender', 'Email', 'Face', 'IdType', 'IdNum', 'IdImg'];

function setErr(key, msg) {
  const e = $('e' + key);
  if (e) {
    e.textContent = msg;
    e.classList.add('show');
  }
  const box = document.querySelector('[data-field="' + key + '"]');
  if (box) box.classList.add('has-err');
}

function clearErr(key) {
  const e = $('e' + key);
  if (e) {
    e.textContent = '';
    e.classList.remove('show');
  }
  const box = document.querySelector('[data-field="' + key + '"]');
  if (box) box.classList.remove('has-err');
}

function clearAllErrors() {
  ERR_KEYS.forEach(clearErr);
  const fe = $('formError');
  if (fe) {
    fe.textContent = '';
    fe.classList.remove('show');
  }
}

function showFormError(msg) {
  const fe = $('formError');
  if (!fe) return;
  fe.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ' + esc(msg);
  fe.classList.add('show');
}

function normalizePhone(v) {
  let d = String(v || '').replace(/[\s\-().]/g, '');
  if (d.charAt(0) === '+') d = d.slice(1);
  if (/^0\d{10}$/.test(d)) d = '234' + d.slice(1);
  else if (/^[789]\d{9}$/.test(d)) d = '234' + d;
  return /^234[789][01]\d{8}$/.test(d) ? d : '';
}

function getGender() {
  const m = $('gMale');
  const f = $('gFemale');
  if (m && m.checked) return 'male';
  if (f && f.checked) return 'female';
  return '';
}

function getIdType() {
  const n = $('idNin');
  const p = $('idPvc');
  if (n && n.checked) return 'nin';
  if (p && p.checked) return 'voter';
  return '';
}

function cleanIdNumber(type, value) {
  const v = String(value || '').replace(/[\s\-]/g, '');
  return type === 'voter' ? v.toUpperCase() : v;
}

function idNumberValid() {
  const type = getIdType();
  if (!type) return false;
  return ID_TYPES[type].test.test(cleanIdNumber(type, ($('fIdNum') || {}).value));
}

function updateProgress() {
  const bar = $('applyBar');
  if (!bar) return;
  const checks = [
    String(($('fName') || {}).value || '').trim().split(/\s+/).filter(Boolean).length >= 2,
    Boolean(normalizePhone(($('fPhone') || {}).value)),
    Boolean(selectedCourse),
    Boolean(($('fState') || {}).value),
    Boolean(($('fLga') || {}).value),
    Boolean(getGender()),
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(($('fEmail') || {}).value || '').trim()),
    Boolean(media.face.url),
    Boolean(getIdType()) && idNumberValid(),
    Boolean(media.id.url)
  ];
  const done = checks.filter(Boolean).length;
  bar.style.width = Math.round((done / checks.length) * 100) + '%';
}

function fillStates() {
  const sel = $('fState');
  if (!sel) return;
  sel.innerHTML = '<option value="">Choose your state</option>' + Object.keys(NG).map((s) => '<option value="' + esc(s) + '">' + esc(s) + '</option>').join('');
}

function fillLgas(state) {
  const sel = $('fLga');
  if (!sel) return;
  if (!state || !NG[state]) {
    sel.innerHTML = '<option value="">Choose your state first</option>';
    sel.disabled = true;
    return;
  }
  sel.innerHTML = '<option value="">Choose your local government</option>' + NG[state].split('|').map((l) => '<option value="' + esc(l) + '">' + esc(l) + '</option>').join('');
  sel.disabled = false;
}

function updateIdUi() {
  const type = getIdType();
  const body = $('idBody');
  if (!body) return;
  if (!type) {
    body.classList.add('hidden');
    return;
  }
  const cfg = ID_TYPES[type];
  body.classList.remove('hidden');
  const label = $('idNumLabel');
  const help = $('idNumHelp');
  const input = $('fIdNum');
  if (label) label.textContent = cfg.field;
  if (help) help.textContent = cfg.help;
  if (input) {
    input.placeholder = cfg.placeholder;
    input.maxLength = cfg.maxlength;
    input.inputMode = cfg.mode;
    const cleaned = cleanIdNumber(type, input.value).slice(0, cfg.maxlength);
    if (cleaned !== input.value) input.value = cleaned;
  }
}

function paintMedia(kind) {
  const m = media[kind];
  const preview = $(kind + 'Preview');
  const empty = $(kind + 'Empty');
  const ok = $(kind + 'Ok');
  const load = $(kind + 'Load');
  const view = $(kind + 'View');
  const has = Boolean(m.local);
  if (preview) {
    if (has) preview.src = m.local;
    preview.classList.toggle('hidden', !has);
  }
  if (empty) empty.classList.toggle('hidden', has);
  const good = Boolean(m.url) && !m.busy;
  if (ok) ok.classList.toggle('hidden', !good);
  if (load) load.classList.toggle('hidden', !m.busy);
  if (view) view.classList.toggle('done', good);
  const btns = kind === 'face' ? ['faceBtn'] : ['idCamBtn', 'idUpBtn'];
  btns.forEach((id) => {
    const b = $(id);
    if (b) b.disabled = m.busy;
  });
  const fb = $('faceBtn');
  if (fb && kind === 'face') {
    const span = fb.querySelector('span');
    if (span) span.textContent = has ? 'Take it again' : 'Take your photo';
  }
  const cb = $('idCamBtn');
  if (cb && kind === 'id') {
    const span = cb.querySelector('span');
    if (span) span.textContent = has ? 'Take again' : 'Take photo';
  }
}

function resetMedia() {
  ['face', 'id'].forEach((k) => {
    media[k].url = '';
    media[k].busy = false;
    media[k].local = '';
    media[k].seq++;
    paintMedia(k);
  });
}

async function uploadToImgur(base64) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(IMGUR_API, {
      method: 'POST',
      headers: { Authorization: IMGUR_CLIENT },
      body: new URLSearchParams({ image: base64, type: 'base64' }),
      signal: ctrl.signal
    });
    let json = null;
    try {
      json = await res.json();
    } catch (_) {
      json = null;
    }
    if (!res.ok || !json || !json.success || !json.data || !json.data.link) {
      throw new Error('upload');
    }
    return String(json.data.link).replace(/^http:\/\//i, 'https://');
  } finally {
    clearTimeout(timer);
  }
}

function drawToJpeg(source, width, height) {
  const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
}

function fileToJpeg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const out = drawToJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
        URL.revokeObjectURL(url);
        resolve(out);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image'));
    };
    img.src = url;
  });
}

async function processImage(kind, dataUrl) {
  const m = media[kind];
  const seq = ++m.seq;
  m.local = dataUrl;
  m.url = '';
  m.busy = true;
  clearErr(kind === 'face' ? 'Face' : 'IdImg');
  paintMedia(kind);
  updateProgress();
  try {
    const link = await uploadToImgur(dataUrl.split(',')[1] || '');
    if (seq !== m.seq) return;
    m.url = link;
    m.busy = false;
    paintMedia(kind);
    updateProgress();
  } catch (err) {
    if (seq !== m.seq) return;
    m.url = '';
    m.local = '';
    m.busy = false;
    paintMedia(kind);
    updateProgress();
    toast('error', 'Upload failed', 'We could not upload your photo. Please check your network and try again.');
  }
}

async function handleFile(kind, file) {
  if (!file) return;
  if (!/^image\//i.test(file.type || 'image/jpeg')) {
    toast('error', 'Wrong file', 'Please choose a photo.');
    return;
  }
  try {
    const dataUrl = await fileToJpeg(file);
    processImage(kind, dataUrl);
  } catch (err) {
    toast('error', 'Photo problem', 'We could not read this photo. Please try another photo.');
  }
}

function stopStream() {
  if (camStream) {
    camStream.getTracks().forEach((t) => {
      try { t.stop(); } catch (_) {}
    });
  }
  camStream = null;
  const v = $('camVideo');
  if (v) {
    try { v.pause(); } catch (_) {}
    v.srcObject = null;
  }
}

function setCamError(msg) {
  const box = $('camErr');
  const txt = $('camErrText');
  if (txt) txt.textContent = msg || '';
  if (box) box.classList.toggle('hidden', !msg);
  const shot = $('camShot');
  if (shot) shot.disabled = Boolean(msg);
}

async function startCam() {
  if (camStarting) return;
  camStarting = true;
  stopStream();
  setCamError('');
  const video = $('camVideo');
  try {
    const attempts = [
      { video: { facingMode: { exact: camFacing }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false },
      { video: { facingMode: { ideal: camFacing }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false },
      { video: true, audio: false }
    ];
    let stream = null;
    let lastErr = null;
    for (let i = 0; i < attempts.length && !stream; i++) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(attempts[i]);
      } catch (err) {
        lastErr = err;
        if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) break;
      }
    }
    if (!stream) throw lastErr || new Error('camera');
    if (!$('camModal').classList.contains('open')) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    camStream = stream;
    const track = stream.getVideoTracks()[0];
    const settings = track && track.getSettings ? track.getSettings() : {};
    const facing = settings.facingMode || camFacing;
    if (video) {
      video.srcObject = stream;
      video.classList.toggle('mirror', facing === 'user');
      await video.play().catch(() => {});
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const count = devices.filter((d) => d.kind === 'videoinput').length;
      const sw = $('camSwitch');
      if (sw) sw.style.visibility = count > 1 ? 'visible' : 'hidden';
    } catch (_) {}
  } catch (err) {
    const name = err && err.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      setCamError('Camera is blocked. Please allow camera access in your browser settings and try again.');
    } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      setCamError('No camera was found on this device.');
    } else {
      setCamError('We could not open the camera. Please close other apps that use the camera and try again.');
    }
  } finally {
    camStarting = false;
  }
}

function openCam(target) {
  const modal = $('camModal');
  if (!modal) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const fallback = target === 'face' ? $('faceFile') : $('idCamFile');
    if (fallback) fallback.click();
    return;
  }
  camTarget = target;
  camFacing = target === 'face' ? 'user' : 'environment';
  const guide = $('camGuide');
  if (guide) guide.className = 'cam-guide ' + (target === 'face' ? 'face' : 'card');
  const title = $('camTitle');
  const hint = $('camHint');
  if (title) title.textContent = target === 'face' ? 'Take your face photo' : 'Take a photo of your ID';
  if (hint) hint.textContent = target === 'face' ? 'Put your face inside the circle and look straight at the camera.' : 'Put your ID flat inside the box. Make all words clear.';
  const sw = $('camSwitch');
  if (sw) sw.style.visibility = 'visible';
  modal.classList.add('open');
  startCam();
}

function closeCam() {
  const modal = $('camModal');
  if (modal) modal.classList.remove('open');
  stopStream();
  setCamError('');
  camTarget = '';
}

function switchCam() {
  camFacing = camFacing === 'user' ? 'environment' : 'user';
  startCam();
}

function takeShot() {
  const video = $('camVideo');
  if (!video || !video.videoWidth || !camStream) return;
  const target = camTarget;
  let dataUrl = '';
  try {
    dataUrl = drawToJpeg(video, video.videoWidth, video.videoHeight);
  } catch (err) {
    toast('error', 'Photo problem', 'We could not take the photo. Please try again.');
    return;
  }
  closeCam();
  if (target) processImage(target, dataUrl);
}

function validateForm() {
  clearAllErrors();
  let first = null;
  const bad = (key, el, msg) => {
    setErr(key, msg);
    if (!first) first = el;
  };
  const name = String($('fName').value || '').trim().replace(/\s+/g, ' ');
  if (name.length < 3 || name.split(' ').length < 2 || !/^[\p{L}][\p{L}\s.'\-]*$/u.test(name)) {
    bad('Name', $('fName'), 'Please write your first name and last name.');
  }
  if (!normalizePhone($('fPhone').value)) {
    bad('Phone', $('fPhone'), 'Please enter a correct phone number, for example 08012345678.');
  }
  if (!selectedCourse) {
    bad('Course', $('courseBtn'), 'Please choose the course you want to learn.');
  }
  if (!$('fState').value) {
    bad('State', $('fState'), 'Please choose your state.');
  }
  if (!$('fLga').value) {
    bad('Lga', $('fLga'), 'Please choose your local government.');
  }
  if (!getGender()) {
    bad('Gender', $('gMale'), 'Please choose male or female.');
  }
  const email = String($('fEmail').value || '').trim();
  if (!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/.test(email)) {
    bad('Email', $('fEmail'), 'Please enter a correct email address.');
  }
  if (media.face.busy) {
    bad('Face', $('faceBtn'), 'Please wait. Your face photo is still uploading.');
  } else if (!media.face.url) {
    bad('Face', $('faceBtn'), 'Please take your face photo.');
  }
  const type = getIdType();
  if (!type) {
    bad('IdType', $('idNin'), 'Please choose NIN or Voter card.');
  } else {
    if (!idNumberValid()) {
      bad('IdNum', $('fIdNum'), ID_TYPES[type].error);
    }
    if (media.id.busy) {
      bad('IdImg', $('idCamBtn'), 'Please wait. Your ID photo is still uploading.');
    } else if (!media.id.url) {
      bad('IdImg', $('idCamBtn'), 'Please take or upload a photo of your ID card.');
    }
  }
  if (first) {
    try {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (first.focus) first.focus({ preventScroll: true });
    } catch (_) {}
    return false;
  }
  return true;
}

function setSubmitting(on) {
  submitting = on;
  const btn = $('submitBtn');
  if (!btn) return;
  btn.disabled = on;
  btn.innerHTML = on
    ? '<span class="spin"></span> Sending your application...'
    : '<i class="fa-solid fa-paper-plane"></i> Apply Now - It is Free';
}

function showDone(firstName) {
  const form = $('applyForm');
  const done = $('applyDone');
  const dn = $('doneName');
  if (dn) dn.textContent = firstName;
  if (form) form.classList.add('hidden');
  const intro = $('applyIntro');
  if (intro) intro.classList.add('hidden');
  if (done) done.classList.remove('hidden');
  const bar = $('applyBar');
  if (bar) bar.style.width = '100%';
  const ap = $('applyPage');
  if (ap) ap.scrollTop = 0;
}

function resetForm() {
  const form = $('applyForm');
  if (form) form.reset();
  fillLgas('');
  setCourse(null);
  resetMedia();
  updateIdUi();
  clearAllErrors();
  formUid = newUid();
  const done = $('applyDone');
  const intro = $('applyIntro');
  if (form) form.classList.remove('hidden');
  if (intro) intro.classList.remove('hidden');
  if (done) done.classList.add('hidden');
  const bar = $('applyBar');
  if (bar) bar.style.width = '0%';
  const ap = $('applyPage');
  if (ap) ap.scrollTop = 0;
  updateProgress();
}

async function submitForm(e) {
  e.preventDefault();
  if (submitting) return;
  if (isClosed()) {
    showFormError('Applications are now closed. Thank you for your interest.');
    return;
  }
  if (!validateForm()) return;
  const fullName = $('fName').value.trim().replace(/\s+/g, ' ');
  const idType = getIdType();
  const payload = {
    site_id: SITE_ID,
    uid: formUid,
    full_name: fullName,
    phone: $('fPhone').value.trim(),
    email: $('fEmail').value.trim(),
    country: 'Nigeria',
    state: $('fState').value,
    lga: $('fLga').value,
    gender: getGender(),
    id_type: idType,
    id_number: cleanIdNumber(idType, $('fIdNum').value),
    face_url: media.face.url,
    id_url: media.id.url,
    course_id: String(selectedCourse.id),
    course_name: selectedCourse.course_name,
    course_number: String(selectedCourse.course_number || ''),
    course_price: Number(selectedCourse.price || 0),
    website: $('fWeb').value
  };
  setSubmitting(true);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SUBMIT_TIMEOUT_MS);
  try {
    const res = await fetch(FORM_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (!res.ok || !data || data.success !== true) {
      const msg = (data && data.error) || 'We could not send your application. Please try again.';
      const map = { full_name: 'Name', phone: 'Phone', email: 'Email', course: 'Course', state: 'State', lga: 'Lga', gender: 'Gender', face: 'Face', face_url: 'Face', id_type: 'IdType', id_number: 'IdNum', id_image: 'IdImg', id_url: 'IdImg' };
      if (data && data.field && map[data.field]) {
        setErr(map[data.field], msg);
        const target = { Name: 'fName', Phone: 'fPhone', Email: 'fEmail', Course: 'courseBtn', State: 'fState', Lga: 'fLga', Gender: 'gMale', Face: 'faceBtn', IdType: 'idNin', IdNum: 'fIdNum', IdImg: 'idCamBtn' }[map[data.field]];
        const el = $(target);
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      showFormError(msg);
      return;
    }
    showDone(fullName.split(' ')[0]);
  } catch (err) {
    showFormError(err && err.name === 'AbortError'
      ? 'The request took too long. Please check your network and try again.'
      : 'We could not reach the server. Please check your network and try again.');
  } finally {
    clearTimeout(timer);
    setSubmitting(false);
  }
}

/* Banner slider (shows each picture fully, no cropping) */
function setupBanner() {
  const slides = qsa('#banner .bslide');
  const dots = $('bannerDots');
  if (!slides.length) return;
  if (dots) dots.innerHTML = slides.map((_, i) => '<i' + (i === 0 ? ' class="on"' : '') + '></i>').join('');
  let cur = 0;
  const show = (n) => {
    slides[cur].classList.remove('on');
    cur = n;
    slides[cur].classList.add('on');
    if (dots) qsa('i', dots).forEach((d, i) => d.classList.toggle('on', i === cur));
  };
  setInterval(() => {
    if (!document.hidden) show((cur + 1) % slides.length);
  }, 4500);
}

/* Film strip of our work */
function setupFilm() {
  const t = $('filmT');
  if (!t) return;
  const set = WORK_IMAGES.map((u) => '<img src="' + u + '" alt="Our work" loading="lazy" decoding="async">').join('');
  t.innerHTML = set + set;
}

/* Governor tabs */
function setupTabs() {
  const tabs = qsa('.gtab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((x) => x.classList.toggle('on', x === tab));
      qsa('.gpanel').forEach((p) => p.classList.toggle('on', p.id === 'gp-' + tab.dataset.t));
    });
  });
}

/* Flip cards: tap to flip on phones */
function setupFlip() {
  qsa('.flip').forEach((card) => {
    card.addEventListener('click', () => card.classList.toggle('flipped'));
  });
}

/* The mat: it rolls and unrolls, showing a different picture each time */
function setupMat() {
  const box = $('matBox');
  const btn = $('matToggle');
  const badge = $('matBadge');
  const text = $('matBtnText');
  if (!box) return;
  let timer = null;
  const paint = () => {
    const rolled = box.classList.contains('rolled');
    if (badge) badge.innerHTML = rolled ? '<i class="fa-solid fa-scroll"></i> Mat is rolled' : '<i class="fa-solid fa-door-open"></i> Mat is open';
    if (text) text.textContent = rolled ? 'Unroll the mat' : 'Roll the mat';
  };
  const flip = () => {
    box.classList.toggle('rolled');
    paint();
  };
  const arm = () => {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (!document.hidden) flip();
    }, 7000);
  };
  if (btn) btn.addEventListener('click', () => {
    flip();
    arm();
  });
  box.addEventListener('click', () => {
    flip();
    arm();
  });
  paint();
  arm();
}

function setupReveal() {
  const els = qsa('.rv');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach((el) => io.observe(el));
  const av = $('available');
  if (av) {
    new IntersectionObserver((entries) => {
      typerVisible = entries[0].isIntersecting;
    }, { threshold: 0.1 }).observe(av);
  }
}

function setupScroll() {
  const topbar = $('topbar');
  const prog = $('pageProgress');
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY || 0;
    if (topbar) topbar.classList.toggle('scrolled', y > 24);
    if (prog) {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      prog.style.transform = 'scaleX(' + Math.min(1, y / max) + ')';
    }
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

function bindEvents() {
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && !t.dataset.fb && !t.closest('.cap-view')) {
      t.dataset.fb = '1';
      t.src = PLACEHOLDER_IMG;
    }
  }, true);

  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) {
      goToSection(go.dataset.go);
      return;
    }
    const more = e.target.closest('[data-more]');
    if (more) {
      appendCards(more.dataset.more);
      return;
    }
    const scroll = e.target.closest('.scroll-btn');
    if (scroll) {
      const row = $(scroll.dataset.target);
      if (row) row.scrollBy({ left: Number(scroll.dataset.scroll || 1) * 320, behavior: 'smooth' });
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act) {
      const course = findCourse(act.dataset.id);
      if (!course) return;
      if (act.dataset.act === 'view') openModal(course);
      else openApply(course, act);
      return;
    }
    const plain = e.target.closest('[data-apply]');
    if (plain) {
      openApply(null, plain);
    }
  });

  const on = (id, ev, fn) => {
    const el = $(id);
    if (el) el.addEventListener(ev, fn);
  };

  on('burgerBtn', 'click', openMenu);
  on('spanClose', 'click', closeMenu);
  on('spanBackdrop', 'click', closeMenu);
  on('cmClose', 'click', closeModal);
  on('courseModal', 'click', (e) => {
    if (e.target === $('courseModal')) closeModal();
  });
  on('cmApply', 'click', (e) => {
    if (modalCourse) openApply(modalCourse, e.currentTarget);
  });
  on('applyBack', 'click', closeApply);
  on('doneBack', 'click', closeApply);
  on('doneAnother', 'click', resetForm);
  on('coursesRetry', 'click', initCourses);
  on('courseBtn', 'click', openSheet);
  on('pickClose', 'click', closeSheet);
  on('pickBackdrop', 'click', closeSheet);
  on('pickSearch', 'input', (e) => renderPicker(e.target.value));
  on('pickList', 'click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    const course = findCourse(b.dataset.pick);
    if (course) setCourse(course);
    closeSheet();
  });
  on('fState', 'change', (e) => {
    fillLgas(e.target.value);
    clearErr('State');
    clearErr('Lga');
    updateProgress();
  });
  on('applyForm', 'submit', submitForm);
  on('applyForm', 'input', (e) => {
    const map = { fName: 'Name', fPhone: 'Phone', fEmail: 'Email', fLga: 'Lga', fIdNum: 'IdNum' };
    if (e.target && map[e.target.id]) clearErr(map[e.target.id]);
    if (e.target && e.target.name === 'gender') clearErr('Gender');
    if (e.target && e.target.id === 'fIdNum') {
      const type = getIdType();
      if (type) {
        const cleaned = cleanIdNumber(type, e.target.value);
        if (cleaned !== e.target.value) e.target.value = cleaned;
      }
    }
    updateProgress();
  });
  qsa('input[name="idtype"]').forEach((r) => {
    r.addEventListener('change', () => {
      clearErr('IdType');
      clearErr('IdNum');
      updateIdUi();
      updateProgress();
    });
  });

  on('faceBtn', 'click', () => openCam('face'));
  on('idCamBtn', 'click', () => openCam('id'));
  on('idUpBtn', 'click', () => {
    const f = $('idFile');
    if (f) f.click();
  });
  on('faceFile', 'change', (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    handleFile('face', file);
  });
  on('idCamFile', 'change', (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    handleFile('id', file);
  });
  on('idFile', 'change', (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    handleFile('id', file);
  });
  on('camClose', 'click', closeCam);
  on('camSwitch', 'click', switchCam);
  on('camShot', 'click', takeShot);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopStream();
    else if ($('camModal') && $('camModal').classList.contains('open')) startCam();
  });

  window.addEventListener('popstate', () => {
    if (applyOpen) hideApply();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const cam = $('camModal');
    const sheet = $('pickSheet');
    if (cam && cam.classList.contains('open')) closeCam();
    else if (sheet && sheet.classList.contains('open')) closeSheet();
    else if (modalCourse) closeModal();
    else if (applyOpen) closeApply();
    else closeMenu();
  });
}

function safe(fn) {
  try { fn(); } catch (err) { if (window.console) console.error(err); }
}

function init() {
  safe(() => { formUid = newUid(); });
  safe(setupReveal);
  setTimeout(() => qsa('.rv:not(.in)').forEach((el) => el.classList.add('in')), 2500);
  safe(fillStates);
  safe(() => fillLgas(''));
  safe(() => setCourse(null));
  safe(() => paintMedia('face'));
  safe(() => paintMedia('id'));
  safe(updateIdUi);
  safe(setupCountdown);
  safe(setupScroll);
  safe(setupBanner);
  safe(setupFilm);
  safe(setupTabs);
  safe(setupFlip);
  safe(setupMat);
  safe(bindEvents);
  initCourses().catch(() => showCoursesError());
  if (location.hash === '#apply') {
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch (_) {}
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();