(function(){
  var burger=document.getElementById('burgerBtn');
  var menu=document.getElementById('menu');
  var backdrop=document.getElementById('menuBd');
  var closeBtn=document.getElementById('menuClose');
  var list=document.getElementById('menuList');
  var island=document.getElementById('island');
  var progress=document.getElementById('pageProgress');
  var toTop=document.getElementById('toTop');

  function setMenu(open){
    menu.classList.toggle('open',open);
    backdrop.classList.toggle('open',open);
    burger.classList.toggle('on',open);
    burger.setAttribute('aria-expanded',String(open));
    menu.setAttribute('aria-hidden',String(!open));
  }

  burger.addEventListener('click',function(){setMenu(!menu.classList.contains('open'))});
  closeBtn.addEventListener('click',function(){setMenu(false)});
  backdrop.addEventListener('click',function(){setMenu(false)});
  list.addEventListener('click',function(e){if(e.target.closest('a')){setMenu(false)}});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){setMenu(false)}});

  var lastY=0;
  function onScroll(){
    var y=window.pageYOffset||document.documentElement.scrollTop;
    var max=document.documentElement.scrollHeight-window.innerHeight;
    progress.style.transform='scaleX('+(max>0?Math.min(y/max,1):0)+')';
    island.classList.toggle('hide',y>lastY&&y>200);
    toTop.classList.toggle('on',y>600);
    lastY=y;
  }
  window.addEventListener('scroll',onScroll,{passive:true});
  onScroll();

  toTop.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});

  var items=document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target)}
      });
    },{threshold:.12});
    items.forEach(function(el){io.observe(el)});
  }else{
    items.forEach(function(el){el.classList.add('in')});
  }
})();
