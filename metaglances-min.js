var build="5";var selectedServer,lobj,compclk;var servers=null;var UCFirst=function(a){return a.charAt(0).toUpperCase()+a.slice(1)};var round=function(a,b){return b>0?(Math.round(a*10*b)/(10*b)):Math.round(a)};var getHtmlTag=function(c,b,d,a){return{tag:(c>a?"critical":(c>d?"warning":(c>b?"careful":"span"))),level:(c>a?3:(c>d?2:(c>b?1:0)))}};var bytesToSize=function(a,d){var c=["B","K","M","G","T"];if(a==0){return"0"}var b=parseInt(Math.floor(Math.log(a)/Math.log(1024)));return round(a/Math.pow(1024,b),d)+c[b]};var bitsToSize=function(c,d){var b=["b","Kb","Mb","Gb","Tb"];if(c==0){return"0"}var a=parseInt(Math.floor(Math.log(c)/Math.log(1000)));return round(c/Math.pow(1000,a),d)+b[a]};var displayPopup=function(a,b){$("#"+a+" > p#msg").html(b).trigger("create");$("#"+a).popup("open")};var getStorage=function(a){return localStorage.getItem(a)!==null?JSON.parse(localStorage.getItem(a)):null};var setStorage=function(b,a){localStorage.setItem(b,JSON.stringify(a))};var delStorage=function(a){localStorage.removeItem(a)};$.ajaxSetup({cache:false});function hideSplash(){$.mobile.changePage("#home","fade")}$("#splash").bind("pageshow",function(a){setTimeout(hideSplash,2000)});$("#home").bind("pageshow",function(c){selectedServer=null;lobj=null;if(servers!==null){return}try{if(typeof(localStorage.build)==="undefined"||typeof(localStorage.servers)==="undefined"){localStorage.build=build;setStorage("servers",[])}servers=getStorage("servers");if(localStorage.build<build){if(servers){$.each(servers,function(d,e){if(typeof(e.fqdn)==="undefined"){e.fqdn=""}if(typeof(e.refr)==="undefined"){e.refr="2"}if(typeof(e.pass)==="undefined"){e.pass=""}});setStorage("servers",servers)}localStorage.build=build}if(getStorage("config")!==null){var a=getStorage("config");$("#user").show().html("Logged as : <b>"+a.mail+"</b>")}else{$("#user").hide()}if(servers&&servers.length){$("ul#serverList").empty().append('<li data-role="list-divider" role="heading">Server List</li>');$.each(servers,function(d,e){$("ul#serverList").append('<li><a href="#serverdetails" id="srv-'+d+'">'+e.desc+"</a></li>")});$("ul#serverList > li > a").bind("click",function(d,e){selectedServer=$(this).attr("id").split("-")[1]})}else{$("ul#serverList").empty().append('<li data-role="list-divider" role="heading">Server List</li><li>- empty -</li>')}$("ul#serverList").listview("refresh")}catch(b){displayPopup("popupNotSupported","Sorry! No web storage support...");console.log(b)}});$("#serverdetails").bind("pagebeforeshow",function(b,c){if(!servers||!selectedServer){$.mobile.changePage($("#home"))}else{var a=servers[selectedServer];$("#serverName").html(a.desc);if(c.prevPage.attr("id")=="home"){$("#serverData").html('<div style="text-align: center;"><img src="images/ajax-loader.gif" style="margin-top:50px" /><p>Loading data ...</p></div>')}}});$("#serverdetails").bind("pageshow",function(b,c){if(!servers||!selectedServer){$.mobile.changePage($("#home"))}else{var a=servers[selectedServer];if(c.prevPage.attr("id")=="home"){var d=new Date().getTime();$.ajax({url:"serverRequest.php?"+d,data:"fqdn="+a.fqdn+"&ipv4="+a.ipv4+"&port="+a.port+"&refr="+a.refr+"&pass="+a.pass,type:"post",contentType:"application/x-www-form-urlencoded",success:function(f,e,g){$("#serverData").html("");var h=JSON.parse(f);lobj=h;loadLinuxTemplate(lobj)},error:function(g,e,f){$("#serverData").html("");if(g.status==401){displayPopup("popupDetails","Missing or bad password!")}else{displayPopup("popupDetails","Server not responding!")}}})}}});$("#serverDelete").bind("click",function(a,b){if(selectedServer){servers.splice(selectedServer,1);setStorage("servers",servers);servers=null}$.mobile.changePage($("#home"))});$("#componentdetails").bind("pagebeforeshow",function(b,c){if(!lobj||typeof(compclk)==="undefined"){$.mobile.changePage($("#home"))}else{$("#componentdetails").find("h3").html(UCFirst(compclk));var a=$("#componentData");a.html("");window["loadLinux"+UCFirst(compclk)+"Template"](a)}});$("#serverform").bind("pagebeforeshow",function(b,c){if(!servers){$.mobile.changePage($("#home"))}if(c.prevPage.attr("id")==="serverdetails"){var a=servers[selectedServer];$('input[name="fqdn"]').val(a.fqdn);$('input[name="ipv4"]').val(a.ipv4);$('input[name="desc"]').val(a.desc);$('input[name="pass"]').val(a.pass);$('input[name="refr"]:radio[value="'+a.refr+'"]').click()}else{$('input[name="fqdn"]').val("");$('input[name="ipv4"]').val("");$('input[name="desc"]').val("");$('input[name="pass"]').val("");$('input[name="refr"]:radio[value="2"]').click()}});$("#formSave").bind("click",function(c,j){var h=/(?=^.{1,254}$)(^(?:(?!\d+\.)[a-zA-Z0-9_\-]{1,63}\.?)+(?:[a-zA-Z]{2,})$)/;var i=/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}?(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;var a=/^[0-9]{2,5}$/;var f=$('input[name="fqdn"]').val();var d=$('input[name="ipv4"]').val();var g=$('input[name="port"]').val();var l=$('input[name="desc"]').val();var e=$('input[name="pass"]').val();var b=$('input:radio[name="refr"]:checked').val();if(l==""){l=(f==""?d:f)}if((h.test(f)||i.test(d))&&a.test(g)){if(selectedServer){servers.splice(selectedServer,1);selectedServer=null}var k=false;$.each(servers,function(m,n){if(n.fqdn!=""&&n.fqdn==f){k=true}if(n.ipv4!=""&&n.ipv4==d){k=true}});if(!k){servers.push({fqdn:f,ipv4:d,port:g,desc:l,pass:e,refr:b});servers.sort(function(n,m){return(n.desc>m.desc)?1:((m.desc>n.desc)?-1:0)});setStorage("servers",servers);servers=null;$.mobile.changePage($("#home"),{transition:"flip"})}else{displayPopup("popupForm","Server already exists")}}else{displayPopup("popupForm","Invalid format !")}});$("#cloud").bind("pagebeforeshow",function(a){$("#fldMail").val("");$("#fldPass").val("");if(getStorage("config")===null){$("#signout").hide();$("#guest").show();$("#registered").hide()}else{$("#signout").show();$("#guest").hide();$("#registered").show()}});$("#btnRegister").click(function(){setStorage("config",{mail:$("#fldMail").val(),pass:$("#fldPass").val()});$("#signout").toggle();$("#guest").toggle();$("#registered").toggle()});$("#signout").click(function(){delStorage("config");$("#signout").toggle();$("#guest").toggle();$("#registered").toggle();$("#fldMail").val("");$("#fldPass").val("")});$("#btnRestore").click(function(){var a=getStorage("config");var b=new Date().getTime();$.ajax({url:"config.php?"+b,data:"mail="+a.mail+"&pass="+a.pass,type:"post",contentType:"application/x-www-form-urlencoded",success:function(d,c,f){var e=JSON.parse(d);if(typeof e=="object"){localStorage.servers=d;servers=null;displayPopup("popupCloud","Restore completed ...")}else{displayPopup("popupCloud","Restoration failed !")}},error:function(e,c,d){displayPopup("popupCloud","Restoration failed !")}})});$("#btnStore").click(function(){var a=getStorage("config");var b=new Date().getTime();$.ajax({url:"config.php?"+b,data:"mail="+a.mail+"&pass="+a.pass+"&conf="+localStorage.servers,type:"post",contentType:"application/x-www-form-urlencoded",success:function(d,c,e){displayPopup("popupCloud","Backup completed ...")},error:function(e,c,d){displayPopup("popupCloud","Backup failed !")}})});var loadLinuxTemplate=function(c){var a=$("#serverData");var b="";b="";$.each(c.host,function(d,e){var f=UCFirst(d.replace("_"," "));b+="<li>"+f+' <p class="ui-li-aside">'+e+"</p></li>"});a.append('<div data-role="collapsible"><h3>Informations</h3><ul data-role="listview" data-inset="true">'+b+"</ul></div>");b="";htmlTag=getHtmlTag(100-c.cpu.idle,50,70,90);highTag=htmlTag;b+='<li><a href="#componentdetails" onClick="compclk=\'cpu\'"><'+htmlTag.tag+'>CPU <p class="ui-li-aside">'+round(100-c.cpu.idle,1)+"%</p></"+htmlTag.tag+"></a></li>";htmlTag=getHtmlTag(c.mem.percent,50,70,90);highTag=htmlTag.level>highTag.level?htmlTag:highTag;b+='<li><a href="#componentdetails" onClick="compclk=\'ram\'"><'+htmlTag.tag+'>RAM <p class="ui-li-aside">'+c.mem.percent+"%</p></"+htmlTag.tag+"></a></li>";htmlTag=getHtmlTag(c.memswap.percent,50,70,90);highTag=htmlTag.level>highTag.level?htmlTag:highTag;b+='<li><a href="#componentdetails" onClick="compclk=\'swap\'"><'+htmlTag.tag+'>SWAP <p class="ui-li-aside">'+c.memswap.percent+"%</p></"+htmlTag.tag+"></a></li>";a.append('<p>Usage</p><ul data-role="listview" data-inset="true">'+b+"</ul>");b="";b+='<li>1 minute <p class="ui-li-aside">'+c.load.min1+"</p></li>";htmlTag=getHtmlTag(c.load.min5,0.7*c.core_number,1*c.core_number,5*c.core_number);b+="<li><"+htmlTag.tag+'>5 minutes <p class="ui-li-aside">'+c.load.min5+"</p></"+htmlTag.tag+"></li>";htmlTag=getHtmlTag(c.load.min15,0.7*c.core_number,1*c.core_number,5*c.core_number);highTag=htmlTag.level>highTag.level?htmlTag:highTag;b+="<li><"+htmlTag.tag+'>15 minutes <p class="ui-li-aside">'+c.load.min15+"</p></"+htmlTag.tag+"></li>";a.append('<p>Load <span class="ui-h3-aside">'+c.core_number+'-Core</span></p><ul data-role="listview" data-inset="true">'+b+"</ul>");b="";$.each(c.network,function(d,e){b+="<li>"+e.interface_name+' <p class="ui-li-aside ui-li-aside-fwidth">'+bitsToSize(e.rx*8/e.time_since_update,1)+'</p><p class="ui-li-aside ui-li-aside-fwidth">'+bitsToSize(e.tx*8/e.time_since_update,1)+"</p></li>"});a.append('<div data-role="collapsible" id="network"><h3>Network <span class="ui-li-aside-fwidth">Tx/s</span><span class="ui-li-aside-fwidth">Rx/s</span></h3><ul data-role="listview" data-inset="true">'+b+"</ul></div>");$("#network").bind("collapse",function(d,e){$(this).find("span.ui-li-aside-fwidth").hide()});$("#network").bind("expand",function(d,e){$(this).find("span.ui-li-aside-fwidth").show()});b="";$.each(c.diskio,function(d,e){b+="<li>"+e.disk_name+' <p class="ui-li-aside ui-li-aside-fwidth">'+bytesToSize(e.write_bytes/e.time_since_update,1)+'</p><p class="ui-li-aside ui-li-aside-fwidth">'+bytesToSize(e.read_bytes/e.time_since_update,1)+"</p></li>"});a.append('<div data-role="collapsible" id="diskio"><h3>Disk I/O <span class="ui-li-aside-fwidth">Out/s</span><span class="ui-li-aside-fwidth">In/s</span></h3><ul data-role="listview" data-inset="true">'+b+"</ul></div>");$("#diskio").bind("collapse",function(d,e){$(this).find("span.ui-li-aside-fwidth").hide()});$("#diskio").bind("expand",function(d,e){$(this).find("span.ui-li-aside-fwidth").show()});b="";highTag=null;$.each(c.fs,function(d,e){htmlTag=getHtmlTag(c.fs.size*100-c.fs.used,50,70,90);if(!highTag){highTag=htmlTag}highTag=htmlTag.level>highTag.level?htmlTag:highTag;b+="<li><"+htmlTag.tag+">"+e.mnt_point+' <p class="ui-li-aside ui-li-aside-fwidth">'+bytesToSize(e.size,1)+'</p><p class="ui-li-aside ui-li-aside-fwidth">'+bytesToSize(e.used,1)+"</"+htmlTag.tag+"></p></li>"});a.append('<div data-role="collapsible" id="fsys"><h3><'+highTag.tag+">Filesystem</"+highTag.tag+'> <span class="ui-li-aside-fwidth">Used</span><span class="ui-li-aside-fwidth">Total</span></h3><ul data-role="listview" data-inset="true">'+b+"</ul></div>");$("#fsys").bind("collapse",function(d,e){$(this).find("span.ui-li-aside-fwidth").hide()});$("#fsys").bind("expand",function(d,e){$(this).find("span.ui-li-aside-fwidth").show()});a.append('<p style="text-align:right;font-size: small;">Last updated: '+c.lastupdate+"</p>");$("span.ui-li-aside-fwidth").hide();a.trigger("create")};var loadLinuxCpuTemplate=function(a){if(!lobj){return}$.each(lobj.percpu,function(b,c){content="";htmlTag=getHtmlTag(c.user,50,70,90);content+="<li><"+htmlTag.tag+'>User <p class="ui-li-aside">'+round(c.user,1)+"%</p></"+htmlTag.tag+"></li>";htmlTag=getHtmlTag(c.system,50,70,90);content+="<li><"+htmlTag.tag+'>System <p class="ui-li-aside">'+round(c.system,1)+"%</p></"+htmlTag.tag+"></li>";htmlTag=getHtmlTag(c.nice,50,70,90);content+="<li><"+htmlTag.tag+'>Nice <p class="ui-li-aside">'+round(c.nice,1)+"%</p></"+htmlTag.tag+"></li>";htmlTag=getHtmlTag(c.iowait,50,70,90);content+="<li><"+htmlTag.tag+'>IoWait <p class="ui-li-aside">'+round(c.iowait,1)+"%</p></"+htmlTag.tag+"></li>";htmlTag=getHtmlTag(c.irq,50,70,90);content+="<li><"+htmlTag.tag+'>IRQ <p class="ui-li-aside">'+round(c.irq,1)+"%</p></"+htmlTag.tag+"></li>";htmlTag=getHtmlTag(100-c.idle,50,70,90);a.append('<ul data-role="listview" data-inset="true" data-divider-theme="a"><li data-role="list-divider"><'+htmlTag.tag+">CPU #"+b+' <p class="ui-li-aside">'+round(100-c.idle,1)+"%</p></"+htmlTag.tag+"></li>"+content+"</ul>")});a.trigger("create")};var loadLinuxRamTemplate=function(b){if(!lobj){return}var a=lobj.mem;content="";content+='<li>Total <p class="ui-li-aside">'+bytesToSize(a.total,1)+"</p></li>";content+='<li>Used <p class="ui-li-aside">'+bytesToSize(a.used,1)+"</p></li>";content+='<li>Free <p class="ui-li-aside">'+bytesToSize(a.free,1)+"</p></li>";content+='<li>Active <p class="ui-li-aside">'+bytesToSize(a.active,1)+"</p></li>";content+='<li>Inactive <p class="ui-li-aside">'+bytesToSize(a.inactive,1)+"</p></li>";content+='<li>Buffers <p class="ui-li-aside">'+bytesToSize(a.buffers,1)+"</p></li>";content+='<li>Cached <p class="ui-li-aside">'+bytesToSize(a.cached,1)+"</p></li>";b.append('<ul data-role="listview" data-inset="true" data-divider-theme="a"><li data-role="list-divider">Mem <p class="ui-li-aside">'+a.percent+"%</p></li>"+content+"</ul>");b.trigger("create")};var loadLinuxSwapTemplate=function(b){if(!lobj){return}var a=lobj.memswap;content="";content+='<li>Total <p class="ui-li-aside">'+bytesToSize(a.total,1)+"</p></li>";content+='<li>Used <p class="ui-li-aside">'+bytesToSize(a.used,0)+"</p></li>";content+='<li>Free <p class="ui-li-aside">'+bytesToSize(a.free,0)+"</p></li>";b.append('<ul data-role="listview" data-inset="true" data-divider-theme="a"><li data-role="list-divider">Swap <p class="ui-li-aside">'+a.percent+"%</p></li>"+content+"</ul>");b.trigger("create")};