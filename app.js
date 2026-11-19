/* Musique du match : version familiale.
   L'application en ligne est vide : ni son, ni logo, ni liste de boutons.
   Tout cela arrive par un « pack », un fichier importé une fois et gardé sur l'appareil (IndexedDB).
   Décisions de la famille, à ne pas changer (references/maquette-consignes.md) :
   une seule page de treize boutons ; un appui joue, un deuxième appui sur le bouton blanc arrête ;
   une seule barre de volume, orange, qui reste réglée d'un son à l'autre ; pas de bouton STOP. */
(function(){
"use strict";

var VERSION_APP="1.0";
var MAXV=6, MINV=1;
/* gain pour chaque cran de volume : environ -20, -15, -10, -6, -3 et 0 dB */
var GAINS=[0,0.10,0.18,0.32,0.50,0.71,1.0];
/* couleur d'un bouton selon son moment du match : [fond, clair] */
var COULEURS={avant:["#5B3FB8","#B9A2FF"],jeu:["#1B7A45","#6FE0A0"],tm:["#2456C2","#7FCBFB"],pauses:["#0C7C8C","#5FE0EA"],fin:["#B0307A","#FF9CCB"]};

/* ---------- dessins ---------- */
function svg(vb,body,extra){return '<svg viewBox="0 0 '+vb+' '+vb+'" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" '+(extra||"")+'>'+body+'</svg>';}
function joueur(cx){return '<circle cx="'+cx+'" cy="10" r="5.5" fill="currentColor" stroke="none"/><path d="M'+cx+' 18V38"/><path d="M'+(cx-7)+' 31 '+cx+' 23 '+(cx+7)+' 31"/><path d="M'+cx+' 38 '+(cx-5)+' 58"/><path d="M'+cx+' 38 '+(cx+5)+' 58"/>';}
var PICTO={
  t:'<g fill="currentColor" stroke="none"><rect x="6" y="8" width="52" height="15" rx="7.5"/><rect x="25" y="26" width="14" height="34" rx="7"/></g>',
  pause:'<g fill="currentColor" stroke="none"><rect x="13" y="9" width="14" height="46" rx="6"/><rect x="37" y="9" width="14" height="46" rx="6"/></g>',
  half:'<circle cx="32" cy="32" r="22" stroke-width="5"/><path d="M32 10a22 22 0 0 0 0 44z" fill="currentColor" stroke="none"/>',
  crowd:'<g fill="currentColor" stroke="none"><circle cx="14" cy="26" r="6"/><circle cx="32" cy="19" r="7.5"/><circle cx="50" cy="26" r="6"/></g><g stroke-width="5"><path d="M4 50a10 10 0 0 1 20 0"/><path d="M19 48a13 13 0 0 1 26 0"/><path d="M40 50a10 10 0 0 1 20 0"/></g>',
  lineup:'<g stroke-width="4.5">'+joueur(12)+joueur(32)+joueur(52)+'</g>',
  run:'<g stroke-width="5"><circle cx="35" cy="11" r="6" fill="currentColor" stroke="none"/><path d="M34 20 30 38"/><path d="M33 25 21 18"/><path d="M33 25 46 31"/><path d="M30 38 19 55"/><path d="M30 38 42 46 46 57"/></g><g stroke-width="3.5"><path d="M6 30h9M4 40h8"/></g>',
  hoop:'<rect x="13" y="5" width="38" height="25" rx="3" stroke-width="4"/><rect x="25" y="14" width="14" height="11" rx="1" stroke-width="3"/><ellipse cx="32" cy="35" rx="13" ry="4" stroke-width="4.5"/><g stroke-width="3"><path d="M20 37 25 58"/><path d="M44 37 39 58"/><path d="M28 39 30 58"/><path d="M36 39 34 58"/><path d="M22 46H42"/><path d="M25 58H39"/></g>',
  defense:'<g stroke-width="5"><circle cx="32" cy="11" r="6" fill="currentColor" stroke="none"/><path d="M32 20V36"/><path d="M32 25 13 21 10 10"/><path d="M32 25 51 21 54 10"/><path d="M32 36 20 45 17 58"/><path d="M32 36 44 45 47 58"/></g>',
  trophy:'<path d="M20 8h24v14a12 12 0 0 1-24 0z" fill="currentColor" stroke="none"/><g stroke-width="5"><path d="M20 12H10q0 14 12 16"/><path d="M44 12h10q0 14-12 16"/><path d="M32 34v12"/><path d="M20 54h24"/></g>',
  down:'<g stroke-width="5"><circle cx="32" cy="12" r="6" fill="currentColor" stroke="none"/><path d="M32 21V38"/><path d="M32 26 20 36"/><path d="M32 26 44 36"/><path d="M32 38 24 56"/><path d="M32 38 40 56"/></g>'
};
function picto(name){return svg(64,PICTO[name]||PICTO.pause,'class="picto"');}
var SPK='<path d="M6 25v14h10l13 11V14L16 25z" fill="currentColor" stroke="none"/>';
var ICON={
  lock:svg(24,'<rect x="5" y="11" width="14" height="9" rx="2" stroke-width="2.4"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke-width="2.4"/>'),
  go:svg(64,'<circle cx="32" cy="32" r="27" stroke-width="5"/><path d="M26 20 46 32 26 44z" fill="currentColor" stroke="none"/>'),
  imp:svg(64,'<path d="M32 8v30" stroke-width="6"/><path d="M19 27 32 40 45 27" stroke-width="6"/><path d="M10 46v8h44v-8" stroke-width="6"/>'),
  ballon:'<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="#F26419"/><g fill="none" stroke="#0A1253" stroke-width="3" stroke-linecap="round"><path d="M4 32H60"/><path d="M32 4V60"/><path d="M13 12Q27 32 13 52"/><path d="M51 12Q37 32 51 52"/></g></svg>'
};

/* ---------- stockage sur l'appareil ---------- */
var Stock={
  db:null,
  ouvrir:function(){
    var self=this;
    return new Promise(function(ok,ko){
      if(!window.indexedDB){ko(new Error("Ce navigateur ne peut pas garder les sons (navigation privée ?)."));return;}
      var r=indexedDB.open("musique-du-match",1);
      r.onupgradeneeded=function(){var d=r.result; d.createObjectStore("fichiers"); d.createObjectStore("meta");};
      r.onsuccess=function(){self.db=r.result;ok();};
      r.onerror=function(){ko(r.error||new Error("Stockage refusé par le navigateur."));};
    });
  },
  op:function(magasin,mode,fn){
    var db=this.db;
    return new Promise(function(ok,ko){
      var t=db.transaction(magasin,mode), q=fn(t.objectStore(magasin));
      t.oncomplete=function(){ok(q?q.result:undefined);};
      t.onerror=t.onabort=function(){ko(t.error||new Error("Écriture impossible : la place manque peut-être sur l'appareil."));};
    });
  },
  lire:function(m,c){return this.op(m,"readonly",function(s){return s.get(c);});},
  ecrire:function(m,c,v){return this.op(m,"readwrite",function(s){return s.put(v,c);});},
  vider:function(m){return this.op(m,"readwrite",function(s){return s.clear();});}
};

/* ---------- lecture d'un pack ----------
   Un pack est une archive zip sans compression : on lit sa table, puis chaque fichier à sa place,
   sans jamais charger les 70 Mo d'un coup. */
function tampon(b){
  if(b.arrayBuffer) return b.arrayBuffer();
  return new Promise(function(ok,ko){var r=new FileReader();r.onload=function(){ok(r.result);};r.onerror=function(){ko(r.error);};r.readAsArrayBuffer(b);});
}
function texte(buf){return new TextDecoder("utf-8").decode(buf);}
function lirePack(f){
  var queue=Math.min(f.size,66000), PAS_UN_PACK="Ce fichier n'est pas un pack Musique du match.";
  return tampon(f.slice(f.size-queue)).then(function(buf){
    var v=new DataView(buf), i=buf.byteLength-22;
    for(;i>=0;i--) if(v.getUint32(i,true)===0x06054b50) break;
    if(i<0) throw new Error(PAS_UN_PACK);
    var n=v.getUint16(i+10,true), taille=v.getUint32(i+12,true), pos=v.getUint32(i+16,true);
    return tampon(f.slice(pos,pos+taille)).then(function(cd){
      var d=new DataView(cd), p=0, liste=[];
      for(var k=0;k<n;k++){
        if(p+46>cd.byteLength||d.getUint32(p,true)!==0x02014b50) throw new Error("Le pack est abîmé : demande un nouvel envoi.");
        var nl=d.getUint16(p+28,true);
        if(d.getUint16(p+10,true)!==0) throw new Error(PAS_UN_PACK);
        liste.push({nom:texte(new Uint8Array(cd,p+46,nl)),taille:d.getUint32(p+20,true),local:d.getUint32(p+42,true)});
        p+=46+nl+d.getUint16(p+30,true)+d.getUint16(p+32,true);
      }
      return Promise.all(liste.map(function(e){
        return tampon(f.slice(e.local,e.local+30)).then(function(h){
          var x=new DataView(h);
          if(h.byteLength<30||x.getUint32(0,true)!==0x04034b50) throw new Error("Le pack est abîmé : demande un nouvel envoi.");
          e.debut=e.local+30+x.getUint16(26,true)+x.getUint16(28,true);
          return e;
        });
      }));
    });
  }).then(function(liste){var m={};liste.forEach(function(e){m[e.nom]=e;});return m;});
}

/* Importe un pack : vérifie qu'il est complet, copie chaque fichier, puis relit tout avant de dire « prêt ». */
function importer(f,progres){
  var conf,entrees,noms;
  return lirePack(f).then(function(m){
    entrees=m;
    if(!m["pack.json"]) throw new Error("Ce fichier n'est pas un pack Musique du match.");
    return tampon(f.slice(m["pack.json"].debut,m["pack.json"].debut+m["pack.json"].taille));
  }).then(function(b){
    conf=JSON.parse(texte(b));
    if(conf.format!=="musique-du-match-pack"||!Array.isArray(conf.sons)||!conf.fichiers) throw new Error("Ce fichier n'est pas un pack Musique du match.");
    if(conf.complement&&!PACK) throw new Error("Ce pack est un complément : importe d'abord le pack principal.");
    noms=Object.keys(conf.fichiers);
    var abimes=noms.filter(function(n){return !entrees[n]||entrees[n].taille!==conf.fichiers[n].octets;});
    if(abimes.length) throw new Error("Le pack est incomplet ("+abimes.length+" fichier(s) manquant(s)) : demande un nouvel envoi.");
    var i=0, suite=conf.complement?Promise.resolve():Stock.vider("fichiers");
    return noms.reduce(function(p,n){
      return p.then(function(){
        progres(++i,noms.length);
        var e=entrees[n];
        return tampon(f.slice(e.debut,e.debut+e.taille)).then(function(buf){
          return Stock.ecrire("fichiers",n,{type:conf.fichiers[n].type,donnees:buf});
        });
      });
    },suite);
  }).then(function(){
    return Promise.all(noms.map(function(n){
      return Stock.lire("fichiers",n).then(function(v){
        if(!v||!v.donnees||v.donnees.byteLength!==conf.fichiers[n].octets) throw new Error("La copie de « "+n+" » est incomplète : la place manque peut-être sur l'appareil.");
      });
    }));
  }).then(function(){
    if(conf.complement) return;                  // un complément ajoute des sons, il ne change pas les boutons
    conf.importe=new Date().toISOString();
    return Stock.ecrire("meta","pack",conf);
  }).then(function(){
    if(navigator.storage&&navigator.storage.persist) return navigator.storage.persist().catch(function(){});
  }).then(function(){return noms.length;});
}

/* ---------- lecteur ----------
   Une balise audio par son, branchée sur un GainNode Web Audio : sur iPhone, une page ne peut pas
   changer le volume d'une balise audio, et le volume système n'est pas à nous. */
var Lecteur={
  ctx:null, gain:null, mode:"pas encore ouvert", els:{}, branches:{}, courant:null, base:0, niveau:1, total:0,
  erreur:"", onFin:null,
  ouvrir:function(){                     // à appeler dans un geste de l'utilisateur
    if(!this.ctx && this.mode!=="balise audio"){
      var AC=window.AudioContext||window.webkitAudioContext;
      if(!AC){this.mode="balise audio";}
      else try{
        /* iPhone récent : demande que le son ne soit pas coupé par le bouton silencieux */
        if(navigator.audioSession){try{navigator.audioSession.type="playback";}catch(_){}}
        this.ctx=new AC(); this.gain=this.ctx.createGain(); this.gain.connect(this.ctx.destination);
        this.mode="Web Audio (GainNode)";
      }catch(e){this.ctx=null;this.mode="balise audio";this.erreur="AudioContext : "+e.message;}
    }
    if(this.ctx){
      for(var id in this.els) this.brancher(id);
      if(this.ctx.state!=="running"){var p=this.ctx.resume(); if(p&&p.catch)p.catch(function(){});}
    }
  },
  brancher:function(id){
    if(!this.ctx||this.branches[id]||!this.els[id]) return;
    try{var s=this.ctx.createMediaElementSource(this.els[id]); s.connect(this.gain); this.branches[id]=s;}
    catch(e){this.erreur="Branchement "+id+" : "+e.message;}
  },
  charger:function(x,v){                 // v = {type, donnees} lu dans le stockage
    var self=this, el=new Audio(); el.preload="auto";
    el.src=URL.createObjectURL(new Blob([v.donnees],{type:v.type}));
    el.addEventListener("ended",function(){
      if(self.courant===x.id){self.courant=null; if(self.onFin)self.onFin(x.id);}
    });
    this.els[x.id]=el; this.total+=v.donnees.byteLength;
    if(this.ctx) this.brancher(x.id);
  },
  regler:function(g,net){                // net = sans transition, pour un départ
    var id=this.courant; if(!id) return;
    if(this.branches[id]){
      var t=this.ctx.currentTime, p=this.gain.gain;
      p.cancelScheduledValues(t);
      if(net) p.setValueAtTime(g,t); else p.setTargetAtTime(g,t,0.03);
    }else{try{this.els[id].volume=Math.min(1,g);}catch(_){}}   // secours : sans effet sur iPhone
  },
  taire:function(){for(var id in this.els){try{this.els[id].pause();}catch(_){}}},
  play:function(x,cran,debut,niveau){
    var self=this, el=this.els[x.id]; if(!el) return false;
    this.ouvrir(); this.taire();
    this.courant=x.id; this.base=GAINS[cran]; this.niveau=niveau||1; this.regler(this.base*this.niveau,true);
    if(el.readyState>=1){try{el.currentTime=debut;}catch(_){}}
    else el.addEventListener("loadedmetadata",function(){if(self.courant===x.id&&el.currentTime<debut)el.currentTime=debut;},{once:true});
    var p=el.play();
    if(p&&p.catch)p.catch(function(e){
      if(self.courant!==x.id||e.name==="AbortError") return;   // remplacé ou arrêté entre-temps
      self.courant=null; self.erreur="Lecture "+x.id+" : "+e.name+" "+e.message;
      if(self.onFin)self.onFin(x.id);
    });
    return true;
  },
  volume:function(cran){this.base=GAINS[cran]; this.regler(this.base*this.niveau,false);},
  halt:function(){this.taire(); this.courant=null;}
};

/* ---------- état ---------- */
var $=function(q){return document.querySelector(q);}, $$=function(q){return Array.prototype.slice.call(document.querySelectorAll(q));};
var phone=$(".phone"), grille=$(".simple"), track=$(".strack"), msg=$(".msg");
var adult=$(".adult"), sheet=$(".sheet"), holdT, diagT, effacerT=0;
var PACK=null, SONS=[], REGLAGES={};
var S={started:false,active:null,vol:4}, partiA=0, horsLigne="non demandé";

function lirePrefs(){try{var p=JSON.parse(localStorage.getItem("mdm-prefs")||"{}"); if(p.vol>=MINV&&p.vol<=MAXV)S.vol=p.vol;}catch(_){ }}
function ecrirePrefs(){try{localStorage.setItem("mdm-prefs",JSON.stringify({vol:S.vol}));}catch(_){ }}
function son(id){return SONS.filter(function(x){return x.id===id;})[0];}
function debutDe(x){var r=REGLAGES[x.id]; return r&&typeof r.debut==="number"?r.debut:(x.debut||0);}
function niveauDe(x){var r=REGLAGES[x.id]; return r&&typeof r.niveau==="number"?r.niveau:(x.niveau||1);}
function prets(){return SONS.filter(function(x){return x.etat==="pret";}).length;}

/* ---------- la page : treize boutons ---------- */
function dessiner(){
  var parRang={};
  SONS.forEach(function(x){parRang[x.rang]=(parRang[x.rang]||0)+1;});
  grille.innerHTML=SONS.map(function(x){
    var c=COULEURS[x.couleur]||COULEURS.tm;
    return '<button class="stile" data-id="'+x.id+'" aria-pressed="false" aria-label="'+x.label+'" style="--tc:'+c[0]+';--tb:'+c[1]+';grid-column:span '+Math.floor(12/parRang[x.rang])+'">'
      +picto(x.picto)+'<span class="sname">'+x.label+'</span>'
      +'<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="snote"></span></button>';
  }).join("");
}
function render(){
  phone.classList.toggle("playing",!!S.active);
  $(".start").hidden=S.started;
  $$(".stile").forEach(function(b){
    var x=son(b.dataset.id), on=S.active===x;
    b.classList.toggle("on",on); b.setAttribute("aria-pressed",on);
    b.classList.toggle("off",x.etat!=="pret");
    b.querySelector(".snote").textContent=x.etat==="pret"?"":"À AJOUTER";
  });
  Array.prototype.forEach.call(track.children,function(i,k){i.classList.toggle("f",k<S.vol);});
  track.setAttribute("aria-valuenow",S.vol);
}
function wiggle(el){el.classList.remove("wiggle");void el.offsetWidth;el.classList.add("wiggle");}
function quiet(){S.active=null;Lecteur.halt();}

/* Un appui : ça joue, depuis le départ réglé. Un deuxième appui sur le bouton blanc : ça s'arrête.
   Un autre bouton remplace le son en cours. Le volume est celui de la barre. */
function play(x,el){
  if(x.etat!=="pret"){if(el)wiggle(el);return;}
  if(S.active===x){
    if(Date.now()-partiA<500)return;                // double appui involontaire : on ne coupe pas le son qui vient de partir
    quiet();render();return;
  }
  if(!Lecteur.play(x,S.vol,debutDe(x),niveauDe(x))){if(el)wiggle(el);return;}
  S.active=x;partiA=Date.now();
  render();
}
Lecteur.onFin=function(id){if(S.active&&S.active.id===id){S.active=null;render();if(!sheet.hidden)dessinerReglages();}};
grille.addEventListener("click",function(e){
  var b=e.target.closest(".stile"); if(b)play(son(b.dataset.id),b);
});

/* barre de volume : six marches, on glisse le doigt ou on touche une marche ; jamais zéro */
function setVol(v){
  v=Math.max(MINV,Math.min(MAXV,v)); if(v===S.vol)return;
  S.vol=v; Lecteur.volume(v); ecrirePrefs(); render();     // la lecture continue, sans reprise
}
var dragging=false;
function volAt(e){var r=track.getBoundingClientRect();setVol(Math.ceil((e.clientX-r.left)/r.width*MAXV));}
track.addEventListener("pointerdown",function(e){dragging=true;try{track.setPointerCapture(e.pointerId);}catch(_){ }volAt(e);});
track.addEventListener("pointermove",function(e){if(dragging)volAt(e);});
["pointerup","pointercancel"].forEach(function(n){track.addEventListener(n,function(){dragging=false;});});
track.addEventListener("keydown",function(e){if(e.key==="ArrowRight"||e.key==="ArrowUp")setVol(S.vol+1);if(e.key==="ArrowLeft"||e.key==="ArrowDown")setVol(S.vol-1);});

/* ---------- accueil ---------- */
function accueil(etat,texteMsg){
  $(".go").hidden=etat!=="pret";
  $(".importer").hidden=!(etat==="vide"||etat==="erreur");
  msg.textContent=texteMsg||"";
  msg.classList.toggle("alerte",etat==="erreur");
}
$(".go").addEventListener("click",function(){Lecteur.ouvrir();S.started=true;render();});
/* le logo ramène à l'accueil et coupe le son */
$(".home").addEventListener("click",function(){quiet();S.started=false;render();});

function lancerImport(fichier){
  if(!fichier)return;
  quiet();S.started=false;sheet.hidden=true;clearInterval(diagT);render();
  accueil("import","Lecture du pack…");
  return importer(fichier,function(i,n){msg.textContent="Copie des sons sur cet appareil : "+i+" / "+n;}).then(function(n){
    accueil("import","Import terminé : "+n+" fichiers copiés et vérifiés.");
    setTimeout(function(){location.reload();},900);
  },function(e){
    accueil(PACK&&prets()?"pret":"erreur",(e&&e.message)||"Import impossible.");
    msg.classList.add("alerte");
  });
}
$$(".fichier-pack").forEach(function(inp){inp.addEventListener("change",function(){var f=inp.files&&inp.files[0];inp.value="";lancerImport(f);});});

/* ---------- panneau adulte : appui long de 1,2 s sur le cadenas ---------- */
function f1(v){return v.toFixed(1).replace(".",",");}
function diag(){
  var el=Lecteur.courant?Lecteur.els[Lecteur.courant]:null;
  $(".diag").textContent=
     "Application "+VERSION_APP+(PACK?" · pack v"+PACK.version+" du "+PACK.cree:" · aucun pack")
    +"\nSons prêts : "+prets()+" / "+SONS.length+" ("+(Lecteur.total/1048576).toFixed(0)+" Mo sur cet appareil)"
    +"\nSans réseau : "+horsLigne
    +"\nVolume réglé par : "+Lecteur.mode+(Lecteur.ctx?" ("+Lecteur.ctx.state+")":"")
    +"\nEn lecture : "+(el&&S.active?S.active.label+", "+el.currentTime.toFixed(1)+" s":"rien")
    +"\nDernière erreur : "+(Lecteur.erreur||"aucune");
}
function dessinerReglages(){
  $(".reglages").innerHTML=SONS.map(function(x){
    var joue=S.active===x;
    return '<div class="reg" data-id="'+x.id+'"><button class="ecoute" aria-label="Écouter '+x.label+'"'+(x.etat==="pret"?"":" disabled")+'>'+(joue?"■":"▶")+'</button>'
      +'<span class="rnom"><b>'+x.label+'</b><small>'+(x.etat==="pret"?x.titre:"fichier absent de ce pack")+'</small></span>'
      +'<span class="rval">départ<span class="pm"><button data-k="debut" data-d="-0.1" aria-label="Départ plus tôt">−</button><b>'+f1(debutDe(x))+' s</b><button data-k="debut" data-d="0.1" aria-label="Départ plus tard">+</button></span></span>'
      +'<span class="rval">niveau<span class="pm"><button data-k="niveau" data-d="-0.1" aria-label="Moins fort">−</button><b>'+f1(niveauDe(x))+'</b><button data-k="niveau" data-d="0.1" aria-label="Plus fort">+</button></span></span></div>';
  }).join("");
}
$(".reglages").addEventListener("click",function(e){
  var ligne=e.target.closest(".reg"); if(!ligne)return;
  var x=son(ligne.dataset.id), b=e.target.closest("button"); if(!b)return;
  if(b.classList.contains("ecoute")){partiA=0;play(x);dessinerReglages();return;}
  var k=b.dataset.k, v=(k==="debut"?debutDe(x):niveauDe(x))+parseFloat(b.dataset.d);
  v=Math.round((k==="debut"?Math.max(0,v):Math.max(0.3,Math.min(2,v)))*10)/10;
  if(!REGLAGES[x.id])REGLAGES[x.id]={};
  REGLAGES[x.id][k]=v;
  Stock.ecrire("meta","reglages",REGLAGES).catch(function(){});
  if(S.active===x){S.active=null;play(x);}          // on réécoute tout de suite avec le nouveau réglage
  dessinerReglages(); $(".export").value=JSON.stringify(REGLAGES);
});
$(".copier").addEventListener("click",function(){
  var z=$(".export"); z.hidden=!z.hidden; z.value=JSON.stringify(REGLAGES);
  if(!z.hidden){z.focus();z.select();}
});
$(".effacer").addEventListener("click",function(){
  var b=$(".effacer");
  if(Date.now()-effacerT>5000){effacerT=Date.now();b.textContent="Confirmer l'effacement";return;}
  quiet();
  Promise.all([Stock.vider("fichiers"),Stock.vider("meta")]).then(function(){location.reload();},function(e){b.textContent="Échec : "+e.message;});
});
function openSheet(){adult.classList.remove("holding");sheet.hidden=false;effacerT=0;$(".effacer").textContent="Effacer";dessinerReglages();diag();diagT=setInterval(diag,500);$(".close").focus();}
function cancel(){clearTimeout(holdT);adult.classList.remove("holding");}
adult.innerHTML=ICON.lock;
adult.addEventListener("pointerdown",function(){adult.classList.add("holding");holdT=setTimeout(openSheet,1200);});
["pointerup","pointerleave","pointercancel"].forEach(function(e){adult.addEventListener(e,cancel);});
adult.addEventListener("click",function(e){if(e.detail===0)openSheet();});   // clavier
phone.addEventListener("contextmenu",function(e){if(!e.target.closest(".export"))e.preventDefault();});
$(".close").addEventListener("click",function(){sheet.hidden=true;clearInterval(diagT);});

/* ---------- démarrage ---------- */
$(".vbas").innerHTML=svg(64,SPK);
$(".vhaut").innerHTML=svg(64,SPK+'<path d="M40 22q8 10 0 20M48 14q14 18 0 36" stroke-width="5"/>');
$(".goico").innerHTML=ICON.go; $(".impico").innerHTML=ICON.imp;
$$(".ballon").forEach(function(b){b.innerHTML=ICON.ballon;});
lirePrefs(); render(); accueil("attente","");

function charger(){
  return Stock.ouvrir().then(function(){
    return Promise.all([Stock.lire("meta","pack"),Stock.lire("meta","reglages")]);
  }).then(function(r){
    PACK=r[0]||null; REGLAGES=r[1]||{};
    if(!PACK){accueil("vide","Aucun son sur cet appareil pour l'instant.");return;}
    SONS=PACK.sons.slice().sort(function(a,b){return a.rang-b.rang||a.ordre-b.ordre;});
    var attente=SONS.map(function(x){
      x.etat="absent";
      return Stock.lire("fichiers",x.fichier).then(function(v){if(v&&v.donnees){Lecteur.charger(x,v);x.etat="pret";}});
    });
    if(PACK.logo) attente.push(Stock.lire("fichiers",PACK.logo).then(function(v){
      if(!v||!v.donnees)return;
      var u=URL.createObjectURL(new Blob([v.donnees],{type:v.type}));
      $$(".logo,.biglogo").forEach(function(i){i.src=u;i.hidden=false;});
      $$(".ballon").forEach(function(b){b.hidden=true;});
    }));
    return Promise.all(attente).then(function(){
      dessiner(); render();
      var n=prets(), manque=SONS.length-n;
      $(".resume").textContent=n+" SONS PRÊTS"+(manque?" · "+manque+" À AJOUTER":"");
      if(n) accueil("pret",""); else accueil("vide","Le pack est vide : importe un pack complet.");
    });
  }).catch(function(e){accueil("erreur",(e&&e.message)||"Stockage indisponible.");});
}
var pret=charger();

/* pour les essais techniques seulement : ouvrir la page avec ?debug */
if(/[?&]debug\b/.test(location.search)) window.mdm={Lecteur:Lecteur,S:S,Stock:Stock,importer:importer,lancerImport:lancerImport,pret:pret,sons:function(){return SONS;},pack:function(){return PACK;},reglages:function(){return REGLAGES;}};

/* sans réseau : possible seulement en https ou sur localhost */
if("serviceWorker" in navigator && window.isSecureContext){
  navigator.serviceWorker.register("sw.js").then(function(){
    return navigator.serviceWorker.ready;
  }).then(function(){horsLigne="oui, l'application est gardée sur l'appareil";},
    function(e){horsLigne="non : "+e.message;});
}else{
  horsLigne="non ici (il faut une adresse https)";
}
})();
