var $=document.querySelector.bind(document),L=$('#sList'),cur=null,C=$('.content');
zip.workerScriptsPath='lib/zip.js/';
initI18n();
function split(t){return t.replace(/^\s+|\s+$/g,'').split(/\s*\n\s*/).filter(function(e){return e;});}
function getName(d,n,def){
	d.title=n||'';
	d.innerHTML=n?n.replace(/&/g,'&amp;').replace(/</g,'&lt;'):(def||'<em>'+_('labelNoName')+'</em>');
}

// Main options
function allowUpdate(n){return n.update&&(n.custom.updateURL||n.meta.updateURL);}
function setIcon(n,d){
	d.src=cache[n.meta.icon]||'images/icon48.png';
}
function modifyItem(r){
	var o=map[r.id],d=o.div,n=o.obj;
	if(r.message) d.querySelector('.message').innerHTML=r.message;
	d.className=n.enabled?'':'disabled';
	var a=d.querySelector('.update');
	if(a) a.classList[r.hideUpdate?'add':'remove']('hide');
	a=d.querySelector('.name');
	getName(a,n.custom.name||n.meta.name);
	if(o=n.custom.homepage||n.meta.homepage) a.href=o;
	if(n.meta.author) d.querySelector('.author').innerText=_('labelAuthor')+n.meta.author;
	a=d.querySelector('.descrip');
	getName(a,n.meta.description||'','&nbsp;');
	setIcon(n,d.querySelector('.icon'));
	a=d.querySelector('.enable');
	a.innerHTML=n.enabled?_('buttonDisable'):_('buttonEnable');
}
function loadItem(o,r){
	var d=o.div,n=o.obj;if(!r) r={id:n.id};
	d.innerHTML='<img class=icon>'
	+'<h3><a class="name ellipsis" target=_blank></a></h3>'
	+'<span class=version>'+(n.meta.version?'v'+n.meta.version:'')+'</span>'
	+'<span class=author></span>'
	+'<div class=panelT>'
		+'<span class=move data=move>&equiv;</span>'
	+'</div>'
	+'<div class="descrip ellipsis"></div>'
	+'<div class=panelB>'
		+'<button data=edit>'+_('buttonEdit')+'</button> '
		+'<button data=enable class=enable></button> '
		+'<button data=remove>'+_('buttonRemove')+'</button> '
		+(allowUpdate(n)?'<button data=update class=update>'+_('anchorUpdate')+'</button> ':'')
		+'<span class=message></span>'
	+'</div>';
	modifyItem(r);
}
function addItem(o){
	o.div=document.createElement('div');
	loadItem(o);
	L.appendChild(o.div);
}
(function(){
	function getSource(e){
		var o=e.target,p,i;
		for(p=o;p&&p.parentNode!=L;p=p.parentNode);
		i=Array.prototype.indexOf.call(L.childNodes,p);
		return [i,p,o];
	}
	function moveItem(e){
		var m=getSource(e);if(m[0]<0) return;
		if(m[0]>=0&&m[0]!=t) {
			e=m;m=e[1];if(e[0]>t) m=m.nextSibling;
			L.insertBefore(o[1],m);
			t=e[0];
		}
	}
	function movedItem(e){
		if(!moving) return;moving=false;
		o[1].classList.remove('moving');
		L.onmousemove=L.onmouseup=null;L.onmousedown=startMove;
		if(o[0]!=t) {
			chrome.runtime.sendMessage({cmd:'Move',data:{id:ids[o[0]],offset:t-o[0]}});
			var s=t>o[0]?1:-1,i=o[0],x=ids[i];
			for(;i!=t;i+=s) ids[i]=ids[i+s];
			ids[t]=x;
		}
	}
	function startMove(e){
		o=getSource(e);t=o[0];
		if(o[2].getAttribute('data')=='move') {
			if(moving) return;moving=true;
			e.preventDefault();
			o[1].classList.add('moving');
			L.onmousedown=null;
			L.onmousemove=moveItem;
			L.onmouseup=movedItem;
		}
	}
	var maps={
		edit:function(i){
			E.cur=map[ids[i]];
			chrome.runtime.sendMessage({cmd:'GetScript',data:ids[i]},gotScript);
		},
		enable:function(i,p,o){
			var e=map[ids[i]].obj;
			chrome.runtime.sendMessage({cmd:'UpdateMeta',data:{id:e.id,enabled:!e.enabled?1:0}});
		},
		remove:function(i,p){
			chrome.runtime.sendMessage({cmd:'RemoveScript',data:ids[i]});
			delete map[ids.splice(i,1)[0]];
			L.removeChild(p);
		},
		update:function(i){
			chrome.runtime.sendMessage({cmd:'CheckUpdate',data:ids[i]});
		}
	},o,t,moving=false;
	L.onmousedown=startMove;
	L.onclick=function(e){
		var o=getSource(e),d=o[2].getAttribute('data'),f=maps[d];
		if(f) {
			e.preventDefault();
			f.apply(this,o);
		}
	};
})();
$('#bNew').onclick=function(){chrome.runtime.sendMessage({cmd:'NewScript'},function(o){
	E.cur=null;gotScript(o);
});};
$('#bUpdate').onclick=function(){chrome.runtime.sendMessage({cmd:'CheckUpdateAll'});};
function switchTab(e){
	var t=e.target,i=t.id.slice(2),o=C.querySelector('#tab'+i);
	if(!o) return;
	if(cur) {
		if(cur.tab==o) return;
		cur.menu.classList.remove('selected');
		cur.tab.classList.add('hide');
	}
	cur={menu:t,tab:o};
	t.classList.add('selected');
	o.classList.remove('hide');
	switch(i) {	// init
		case 'Settings':xLoad();break;
	}
}
$('.sidemenu').onclick=switchTab;
switchTab({target:$('#smInstalled')});
function confirmCancel(dirty){
	return !dirty||confirm(_('confirmNotSaved'));
}

// Advanced
var H=$('#iImport'),S=$('#tSearch'),V=$('#bVacuum');
$('#cUpdate').onchange=function(){chrome.runtime.sendMessage({cmd:'AutoUpdate',data:this.checked});};
S.title=_('hintSearchLink');
S.onchange=function(){chrome.runtime.sendMessage({cmd:'SetOption',data:{key:'search',value:S.value}});};
$('#bDefSearch').onclick=function(){S.value=_('defaultSearch');S.onchange();};
H.onchange=function(e){
	zip.createReader(new zip.BlobReader(e.target.files[0]),function(r){
		r.getEntries(function(e){
			function getFiles(){
				var i=e.shift();
				if(i) i.getData(writer,function(t){
					var c={code:t};
					if(vm.scripts&&(v=vm.scripts[i.filename.slice(0,-8)])) {
						delete v.id;c.more=v;
					}
					chrome.runtime.sendMessage({cmd:'ParseScript',data:c});
					count++;
					getFiles();
				}); else {
					alert(_('msgImported',[count]));
					location.reload();
				}
			}
			var i,vm={},writer=new zip.TextWriter(),count=0;
			for(i=0;i<e.length;i++) if(e[i].filename=='ViolentMonkey') break;
			if(i<e.length) e.splice(i,1)[0].getData(writer,function(t){
				try{
					vm=JSON.parse(t);
				}catch(e){
					vm={};
					console.log('Error parsing ViolentMonkey configuration.');
				}
				if(vm.values) for(z in vm.values) chrome.runtime.sendMessage({cmd:'SetValue',data:{uri:z,values:vm.values[z]}});
				if(vm.settings) for(z in vm.settings) chrome.runtime.sendMessage({cmd:'SetOption',data:{key:z,value:vm.settings[z],check:true}});
				getFiles();
			}); else getFiles();
		});
	},function(e){console.log(e);});
};
$('#bImport').onclick=function(){
	var e=document.createEvent('MouseEvent');
	e.initMouseEvent('click',true,true,window,0,0,0,0,0,false,false,false,false,0,null);
	H.dispatchEvent(e);
};
V.onclick=function(){
	this.disabled=true;
	this.innerHTML=_('buttonVacuuming');
	chrome.runtime.sendMessage({cmd:'Vacuum'});
};
V.title=_('hintVacuumData');

// Export
var xL=$('#xList'),xE=$('#bExport'),xD=$('#cWithData');
function xLoad() {
	xL.innerHTML='';xE.disabled=false;
	ids.forEach(function(i){
		var d=document.createElement('div');
		d.className='ellipsis';
		getName(d,map[i].obj.meta.name);
		xL.appendChild(d);
	});
}
xD.onchange=function(){chrome.runtime.sendMessage({cmd:'SetOption',data:{key:'withData',value:this.checked}});};
xL.onclick=function(e){
	var t=e.target;
	if(t.parentNode!=this) return;
	t.classList.toggle('selected');
};
$('#bSelect').onclick=function(){
	var c=xL.childNodes,v,i;
	for(i=0;i<c.length;i++) if(!c[i].classList.contains('selected')) break;
	v=i<c.length;
	for(i=0;i<c.length;i++) if(v) c[i].classList.add('selected'); else c[i].classList.remove('selected');
};
function exported(o){
	function addFiles(){
		adding=true;
		if(!writer) {	// create writer
			zip.createWriter(new zip.BlobWriter(),function(w){writer=w;addFiles();});
			return;
		}
		var i=files.shift();
		if(i) {
			if(i.name) {	// add file
				writer.add(i.name,new zip.TextReader(i.content),addFiles);
				return;
			} else	// finished
				writer.close(function(b){
					var u=URL.createObjectURL(b),e=document.createEvent('MouseEvent');
					e.initMouseEvent('click',true,true,window,0,0,0,0,0,false,false,false,false,0,null);
					xH.href=u;
					xH.download='scripts.zip';
					xH.dispatchEvent(e);
					writer=null;
					X.close();
					URL.revokeObjectURL(u);
				});
		}
		adding=false;
	}
	function addFile(o){
		files.push(o);
		if(!adding) addFiles();
	}
	var writer=null,files=[],adding=false,xH=$('#xHelper'),
			n,_n,names={},vm={scripts:{},settings:o.settings};
	if(xD.checked) vm.values={};
	o.scripts.forEach(function(c){
		var j=0;
		n=_n=c.custom.name||c.meta.name||'Noname';
		while(names[n]) n=_n+'_'+(++j);names[n]=1;
		addFile({name:n+'.user.js',content:c.code});
		vm.scripts[n]={id:c.id,custom:c.custom,enabled:c.enabled,update:c.update};
		if(xD.checked&&(n=o.values[c.uri])) vm.values[c.uri]=n;
	});
	addFile({name:'ViolentMonkey',content:JSON.stringify(vm)});
	addFile({});	// finish adding files
}
xE.onclick=function(e){
	e.preventDefault();
	this.disabled=true;
	var i,c=[];
	for(i=0;i<ids.length;i++)
		if(xL.childNodes[i].classList.contains('selected')) c.push(ids[i]);
	chrome.runtime.sendMessage({cmd:'ExportZip',data:{values:xD.checked,data:c}},exported);
};

// Script Editor
var E=$('#wndEditor'),U=$('#eUpdate'),M=$('#eMeta'),
		mN=$('#mName'),mH=$('#mHomepage'),mR=$('#mRunAt'),
		mU=$('#mUpdateURL'),mD=$('#mDownloadURL'),
    mI=$('#mInclude'),mE=$('#mExclude'),mM=$('#mMatch'),
    cI=$('#cInclude'),cE=$('#cExclude'),cM=$('#cMatch'),
		eS=$('#eSave'),eSC=$('#eSaveClose'),T,sC=$('#sCustom');
function markClean(){
	eS.disabled=eSC.disabled=true;
}
function mReset(){
	M.classList.add('hide');
	sC.innerHTML='&laquo;';
	var e=[],c=E.scr.custom;M.dirty=false;
	mN.value=c.name||'';
	mH.value=c.homepage||'';
	mU.value=c.updateURL||'';
	mD.value=c.downloadURL||'';
	switch(c['run-at']){
		case 'document-start':mR.value='start';break;
		case 'document-idle':mR.value='idle';break;
		case 'document-end':mR.value='end';break;
		default:mR.value='default';
	}
	cI.checked=c._include!=false;
	mI.value=(c.include||e).join('\n');
	cM.checked=c._match!=false;
	mM.value=(c.match||e).join('\n');
	cE.checked=c._exclude!=false;
	mE.value=(c.exclude||e).join('\n');
}
function gotScript(o){
	E.classList.remove('hide');
	E.scr=o;U.checked=o.update;
	T.setValueAndFocus(o.code);
	T.clearHistory();markClean();mReset();
}
function eSave(){
	if(M.dirty) {
		var c=E.scr.custom;
		c.name=mN.value;
		c.homepage=mH.value;
		c.updateURL=mU.value;
		c.downloadURL=mD.value;
		switch(mR.value){
			case 'start':c['run-at']='document-start';break;
			case 'idle':c['run-at']='document-idle';break;
			case 'end':c['run-at']='document-end';break;
			default:delete c['run-at'];
		}
		c._include=cI.checked;
		c.include=split(mI.value);
		c._match=cM.checked;
		c.match=split(mM.value);
		c._exclude=cE.checked;
		c.exclude=split(mE.value);
	}
	chrome.runtime.sendMessage({
		cmd:'ParseScript',
		data:{
			id:E.scr.id,
			code:T.getValue(),
			message:'',
			more:{
				custom:E.scr.custom,
				update:E.scr.update=U.checked
			}
		}
	});
	markClean();
}
function mClose(){M.classList.add('hide');}
function eClose(){E.classList.add('hide');E.scr=null;}
U.onchange=E.markDirty=function(){eS.disabled=eSC.disabled=false;};
M.markDirty=function(){M.dirty=true;E.markDirty();};
[mN,mH,mR,mU,mD,mI,mM,mE,cI,cM,cE].forEach(function(i){i.onchange=M.markDirty;});
$('#bCustom').onclick=function(){
	var r=M.classList.toggle('hide');
	sC.innerHTML=r?'&laquo;':'&raquo;';
};
eS.onclick=eSave;
eSC.onclick=function(){eSave();eClose();};
E.close=$('#eClose').onclick=function(){if(confirmCancel(!eS.disabled)) eClose();};
initEditor(function(o){T=o;},{save:eSave,exit:E.close,onchange:E.markDirty});

// Load at last
var ids,map,cache;
function loadOptions(o){
	ids=[];map={};L.innerHTML='';
	cache=o.cache;
	o.scripts.forEach(function(i){
		ids.push(i.id);addItem(map[i.id]={obj:i});
	});
	$('#cUpdate').checked=o.settings.autoUpdate;
	S.value=o.settings.search;
	xD.checked=o.settings.withData;
}
function updateItem(r){
	if(!('id' in r)) return;
	var m=map[r.id];
	if(!m) map[r.id]=m={};
	if(r.obj) m.obj=r.obj;
	switch(r.status){
		case 0:loadItem(m,r);break;
		case 1:ids.push(r.id);addItem(m);break;
		default:modifyItem(r);
	}
}
chrome.runtime.sendMessage({cmd:'GetData'},loadOptions);
chrome.runtime.onMessage.addListener(function(req,src){
	var maps={
		Vacuumed: function(){
			for(var i=0;i<ids.length;i++) map[ids[i]].obj.position=i+1;
			V.innerHTML=_('buttonVacuumed');
		},
	},f=maps[req.cmd];
	if(f) f(req.data,src);
});
var port=chrome.runtime.connect({name:'Options'});
port.onMessage.addListener(updateItem);
